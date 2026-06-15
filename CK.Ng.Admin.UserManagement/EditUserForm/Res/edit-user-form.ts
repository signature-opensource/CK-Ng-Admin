import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService, GetWorkspaceUserEditDataQCommand, GroupInfos, HttpCrisEndpoint, NotificationService, UserWorkspaceGroupPicker, WorkspaceUser } from '@local/ck-gen';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component( {
  selector: 'ck-edit-user-form',
  templateUrl: './edit-user-form.html',
  styleUrls: ['./edit-user-form.less'],
  imports: [FormsModule, ReactiveFormsModule, NzFormModule, TranslateModule, NzSelectModule, NzInputModule, FontAwesomeModule, NzButtonModule, UserWorkspaceGroupPicker]
} )
export class EditUserForm implements OnInit, OnDestroy {
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #authService = inject( AuthService );
  readonly #notifService = inject( NotificationService );
  readonly #nzModalService = inject( NzModalService );
  readonly #nzModalData = inject( NZ_MODAL_DATA );
  readonly #destroyed$: Subject<void> = new Subject<void>();

  public workspaceGroups: Array<GroupInfos> = [];
  public showPassword: boolean = false;
  public eyeIcon = faEye;
  public eyeSlashIcon = faEyeSlash;
  public user: WorkspaceUser;
  public workspace: GroupInfos;
  public userForm: FormGroup;

  constructor() {
    this.user = this.#nzModalData.user;
    this.workspace = this.#nzModalData.workspace;
    this.userForm = this.#nzModalData.userForm;
  }

  get groupsControl(): FormControl<Array<number>> {
    return this.userForm.get( 'groups' ) as FormControl<Array<number>>;
  }

  async ngOnInit(): Promise<void> {
    await this.getEditUserData();
  }

  async getEditUserData(): Promise<void> {
    const res = await this.#crisEndpoint.sendOrThrowAsync( new GetWorkspaceUserEditDataQCommand( this.user.userId ) );
    if ( res ) {
      const groups = [...res.workspaceGroups];
      groups.forEach( g => {
        if ( g.groupName.includes( 'Administrators' ) ) {
          if ( !groups.find( group => group.groupId === g.zoneId ) ) {
              groups.unshift({ groupId: g.zoneId, groupName: g.zoneName, isZone: false, zoneId: g.zoneId, zoneName: g.zoneName } as GroupInfos );
          }
        }
      } );
      this.userForm.patchValue( { groups: res.userGroups.map( g => g.groupId ) } );
      this.workspaceGroups = [...groups];
    }
  }

  ngOnDestroy(): void {
    this.#destroyed$.next();
    this.#destroyed$.complete();
  }
}
