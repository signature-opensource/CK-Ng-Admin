import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { GroupInfos, UserWorkspaceGroupPicker } from '@local/ck-gen';
import { LocaleInfo } from '@local/ck-gen/ts-locales/locales';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component( {
  selector: 'ck-user-form',
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.less'],
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, NzFormModule, NzSelectModule, NzInputModule, FontAwesomeModule, NzTagModule, NzCheckboxModule, UserWorkspaceGroupPicker]
} )
export class UserForm implements OnInit {
  readonly #translateService = inject( TranslateService );
  readonly #nzModalData = inject( NZ_MODAL_DATA );

  public isPlatformCreation: boolean = true;
  public userForm: FormGroup;
  public groupInfos: Array<GroupInfos>;
  public languages: Array<LocaleInfo>;

  #selectedGroups: Array<number> = [];
  public icon = faArrowRight;
  public selectedOrg?: GroupInfos;
  public map: Map<number, { label: string, checked: boolean, value: number }> = new Map<number, { label: string, checked: boolean, value: number }>();

  constructor() {
    this.userForm = this.#nzModalData.userForm;
    this.groupInfos = this.#nzModalData.groupInfos;
    this.languages = this.#nzModalData.languages;
  }

  get groupsControl(): FormControl<Array<number>> {
    return this.userForm.get( 'groups' ) as FormControl<Array<number>>;
  }

  async ngOnInit(): Promise<void> {
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

    this.userForm.patchValue( { 'groups': this.#selectedGroups } );
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
