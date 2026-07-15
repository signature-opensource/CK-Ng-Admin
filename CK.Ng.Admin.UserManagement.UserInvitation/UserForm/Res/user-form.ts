import { Component, OnInit, Signal, inject, viewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { GenericForm, GenericFormData, GroupInfos, UserWorkspaceGroupPicker } from '@local/ck-gen';
import { LocaleInfo } from '@local/ck-gen/ts-locales/locales';
import { TranslateModule } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component( {
  selector: 'ck-user-form',
  templateUrl: './user-form.html',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, NzFormModule, NzSelectModule, FontAwesomeModule, NzTagModule, NzCheckboxModule, UserWorkspaceGroupPicker, GenericForm]
} )
export class UserForm implements OnInit {
  // <PreViewChildren revert />
  readonly formComponent: Signal<GenericForm | undefined> = viewChild( 'formComp' );
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
  // Scalar-field config (email/cultureName) consumed by the GenericForm. The GenericForm also reads
  // it from NZ_MODAL_DATA (modal mode); binding it satisfies its required input.
  public formData: GenericFormData<unknown, unknown>;
  // The bespoke org/role group hierarchy is not a GenericForm field type, so its value lives here.
  public customForm: FormGroup;
  #selectedGroups: Array<number> = [];
  // <PostLocalVariables />

  constructor() {
    this.groupInfos = this.#nzModalData.groupInfos;
    this.languages = this.#nzModalData.languages;
    this.formData = this.#nzModalData.formData;
    // <PreCustomFormDefinition revert />
    this.customForm = new FormGroup( {
      // <PreGroupsFormControlDefinition revert />
      groups: new FormControl<Array<number>>( [], { nonNullable: true, validators: [Validators.required] } )
      // <PostGroupsFormControlDefinition />
    } );
    // <PostCustomFormDefinition />
  }

  get groupsControl(): FormControl<Array<number>> {
    return this.customForm.get( 'groups' ) as FormControl<Array<number>>;
  }

  get valid(): boolean {
    const scalarForm = this.formComponent()?.form();
    return !!scalarForm && scalarForm.valid && this.customForm.valid;
  }

  getValue(): { email: string, cultureName: string, groups: Array<number> } {
    return { ...this.formComponent()!.form()!.getRawValue(), ...this.customForm.getRawValue() };
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

  selectGroup( id: number ): void {
    if ( this.#selectedGroups.includes( id ) ) {
      this.#selectedGroups = this.#selectedGroups.filter( g => g !== id );
    } else {
      this.#selectedGroups.push( id );
    }

    this.customForm.patchValue( { 'groups': this.#selectedGroups } );
  }

  selectAdminGroup( wId: number ): void {
    this.selectGroup( this.getAdminGroupId( wId ) );
  }

  shouldBeDisabled( group: GroupInfos ): boolean {
    const siblings = this.groupInfos.filter( g => g.zoneId === group.zoneId );
    let res = false;
    this.#selectedGroups.forEach( g => {
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
