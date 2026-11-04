import { Component, inject, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormValueControl } from '@angular/forms/signals';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { GroupInfos } from '@local/ck-gen';

/**
 * Multiple select of workspace groups, bound with `[formField]` to a `number[]` field of group ids.
 */
@Component( {
  selector: 'ck-user-workspace-group-picker',
  templateUrl: './user-workspace-group-picker.html',
  imports: [FormsModule, TranslatePipe, NzSelectModule]
} )
export class UserWorkspaceGroupPicker implements FormValueControl<number[]> {
  // <PreViewChildren revert />
  // <PostViewChildren />

  // <PreInputOutput revert />
  readonly groups = input.required<Array<GroupInfos>>();
  /**
   * Ids of the selected groups, kept in sync with the field bound by `[formField]`.
   */
  readonly value = model<number[]>( [] );
  /**
   * Emitted when the select loses focus, so a `[formField]` field is marked touched.
   */
  readonly touch = output<void>();
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
