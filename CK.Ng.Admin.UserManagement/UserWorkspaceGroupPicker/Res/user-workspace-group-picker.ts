import { Component, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { GroupInfos } from '@local/ck-gen';

@Component( {
  selector: 'ck-user-workspace-group-picker',
  templateUrl: './user-workspace-group-picker.html',
  imports: [ReactiveFormsModule, TranslateModule, NzSelectModule]
} )
export class UserWorkspaceGroupPicker {
  // <PreViewChildren revert />
  // <PostViewChildren />

  // <PreInputOutput revert />
  readonly control = input.required<FormControl<Array<number>>>();
  readonly groups = input.required<Array<GroupInfos>>();
  // <PostInputOutput />

  // <PreDependencyInjection revert />
  readonly #translateService = inject( TranslateService );
  // <PostDependencyInjection />

  // <PreIconsDefinition revert />
  // <PostIconsDefinition />

  // <PreLocalVariables revert />
  // <PostLocalVariables />

  protected dropdownLabel( group: GroupInfos ): string {
    const role = this.#roleLabel( group );
    const name = group.groupName === 'Administrators' ? group.zoneName : group.groupName;
    return `<span><b>${name}</b></span> <span class="role">(${role})</span>`;
  }

  protected selectedLabel( group: GroupInfos ): string {
    const role = this.#roleLabel( group );
    const name = group.groupName === 'Administrators' ? group.zoneName : group.groupName;
    return `${name} - ${role}`;
  }

  #roleLabel( group: GroupInfos ): string {
    return group.groupName === 'Administrators'
      ? this.#translateService.instant( 'CK.Admin.UserManagement.Role.Administrator' )
      : this.#translateService.instant( 'CK.Admin.UserManagement.Role.Member' );
  }
}
