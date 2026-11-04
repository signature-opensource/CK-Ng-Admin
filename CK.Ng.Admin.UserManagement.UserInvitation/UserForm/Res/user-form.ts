import { Component, OnInit, TemplateRef, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormField, required, validate } from '@angular/forms/signals';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { CustomFieldContext, customField, GenericFields, GenericForm, genericForm, GenericFormHandle, GroupInfos, UserWorkspaceGroupPicker } from '@local/ck-gen';
import { LocaleInfo } from '@local/ck-gen/ts-locales/locales';
import { TranslatePipe } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component( {
  selector: 'ck-user-form',
  templateUrl: './user-form.html',
  imports: [TranslatePipe, FormsModule, FormField, NzFormModule, NzSelectModule, FontAwesomeModule, NzTagModule, NzCheckboxModule, UserWorkspaceGroupPicker, GenericForm]
} )
export class UserForm implements OnInit {
  // <PreViewChildren revert />
  protected readonly groupsTemplate = viewChild<TemplateRef<CustomFieldContext<number[]>>>( 'groupsTemplate' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA );
  // <PostDependencyInjection />

  // <PreInputOutput revert />
  // <PostInputOutput />

  // <PreIconsDefinition revert />
  public icon = faArrowRight;
  // <PostIconsDefinition />

  // <PreLocalVariables revert />
  public isPlatformCreation: boolean = true;
  public groupInfos: Array<GroupInfos>;
  public languages: Array<LocaleInfo>;
  public selectedOrg?: GroupInfos;
  public map: Map<number, { label: string, checked: boolean, value: number }> = new Map<number, { label: string, checked: boolean, value: number }>();
  /**
   * The scalar fields given by the opener in `NZ_MODAL_DATA.fields`, then `groups`.
   * Its fields are fixed when the component is created.
   */
  public readonly userForm: GenericFormHandle<GenericFields>;
  // <PostLocalVariables />

  constructor() {
    this.groupInfos = this.#nzModalData.groupInfos;
    this.languages = this.#nzModalData.languages;
    const scalarFields: GenericFields = this.#nzModalData.fields;
    // <PreCustomFormDefinition revert />
    this.userForm = genericForm<GenericFields>( () => ( {
      ...scalarFields,
      // <PreGroupsFormControlDefinition revert />
      groups: customField<number[]>( 'CK.Admin.UserManagement.Form.Groups', [], {
        template: this.groupsTemplate()!,
        rules: p => {
          // required() gives the label its mark but sees no error in an empty array.
          required( p );
          validate( p, ( { value } ) => value().length ? undefined : { kind: 'required', message: 'CK.Admin.UserManagement.Form.GroupsRequired' } );
        }
      } )
      // <PostGroupsFormControlDefinition />
    } ) );
    // <PostCustomFormDefinition />
  }

  get valid(): boolean {
    return this.userForm.form().valid();
  }

  getValue(): { email: string, cultureName: string, groups: Array<number> } {
    return { ...this.userForm.model() } as { email: string, cultureName: string, groups: Array<number> };
  }

  async ngOnInit(): Promise<void> {
    // <PreUserFormInit revert />
    if ( this.isPlatformCreation ) {
      this.selectedOrg = this.groupInfos.find( g => g.groupName === 'Platform Zone' )!;
      this.getOrgs().forEach( g => {
        this.map.set( g.groupId, { label: g.groupName, checked: false, value: g.groupId } );
        const orgAdminGroup = this.getAdminGroupId( g.groupId );
        this.map.set( orgAdminGroup, { label: this.groupInfos.find( gi => gi.groupId === orgAdminGroup )!.groupName, checked: false, value: orgAdminGroup } );
        this.getChildren( g.groupId ).forEach( c => {
          this.map.set( c.groupId, { label: c.groupName, checked: false, value: c.groupId } );
          const adminGroupId = this.getAdminGroupId( c.groupId );
          this.map.set( adminGroupId, { label: this.groupInfos.find( gi => gi.groupId === adminGroupId )!.groupName, checked: false, value: adminGroupId } );
        } )
      } );
    } else {
      const org = this.groupInfos.find( g => g.zoneId === 0 );
      if ( org ) {
        this.selectedOrg = org;
      }
    }
    // <PostUserFormInit />
  }

  getOrgs(): Array<GroupInfos> {
    return this.groupInfos.filter( g => g.zoneId === 0 );
  }

  getChildren( oId: number ): Array<GroupInfos> {
    return this.groupInfos.filter( g => g.zoneId === oId && g.groupName !== 'Administrators' );
  }

  /**
   * Adds the group id to the `groups` field, or removes it when already there.
   * The hierarchy checkboxes call it from `nzCheckedChange` with the new checked state, so a repeated emission
   * leaves the field unchanged; without `checked` it toggles. Their checked state is bound to {@link map}, not read from the field.
   */
  selectGroup( id: number, checked?: boolean ): void {
    const groups: Array<number> = this.userForm.model()['groups'];
    const want = checked ?? !groups.includes( id );
    if ( want === groups.includes( id ) ) return;
    const next = want ? [...groups, id] : groups.filter( g => g !== id );
    this.userForm.model.update( m => ( { ...m, groups: next } ) );
  }

  selectAdminGroup( wId: number, checked?: boolean ): void {
    this.selectGroup( this.getAdminGroupId( wId ), checked );
  }

  shouldBeDisabled( group: GroupInfos ): boolean {
    const siblings = this.groupInfos.filter( g => g.zoneId === group.zoneId );
    const selectedGroups: Array<number> = this.userForm.model()['groups'];
    let res = false;
    selectedGroups.forEach( g => {
      if ( siblings.findIndex( s => s.groupId === g ) ) {
        res = true;
      }
    } );

    return res;
  }

  getAdminGroupId( wId: number ): number {
    return this.groupInfos.find( g => g.zoneId === wId && g.groupName === 'Administrators' )!.groupId;
  }
}
