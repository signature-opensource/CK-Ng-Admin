import { Component, DestroyRef, WritableSignal, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import {
  GroupInfos,
  InvitationsTable,
  LayoutContent,
  UserService,
  UsersTab
} from '@local/ck-gen';

type AdminTab = 'users' | 'invitations';

@Component( {
  selector: 'ck-user-management-page',
  templateUrl: './user-management-page.html',
  imports: [LayoutContent, NzTabsModule, TranslateModule, UsersTab, InvitationsTable]
} )
export class UserManagementPage {
  // <PreViewChildren revert />
  readonly usersTab = viewChild<UsersTab>( 'usersTab' );
  readonly invitationsTable = viewChild<InvitationsTable>( 'invitationsTable' );
  // <PostViewChildren />

  // <PreInputOutput revert />
  // <PostInputOutput />

  // <PreIconsDefinition revert />
  // <PostIconsDefinition />

  // <PreDependencyInjection revert />
  readonly #translateService = inject( TranslateService );
  readonly #userService = inject( UserService );
  readonly #destroyRef = inject( DestroyRef );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  protected title: WritableSignal<string> = signal( '' );
  protected workspace = computed<GroupInfos | undefined>( () => this.#userService.currentWorkspace() ?? undefined );
  protected selectedTab: WritableSignal<AdminTab> = signal( 'users' );
  protected selectedTabIndex = computed( () => this.selectedTab() === 'users' ? 0 : 1 );
  protected workspaceId = computed( () => this.workspace()?.groupId ?? 0 );
  // <PostLocalVariables />

  constructor() {
    this.#refreshTitle();

    this.#translateService.onLangChange
      .pipe( takeUntilDestroyed( this.#destroyRef ) )
      .subscribe( () => this.#refreshTitle() );
  }

  #refreshTitle(): void {
    // <PreRefreshTitle revert />
    this.#translateService.get( 'CK.Admin.UserManagement.Title' )
      .pipe( first() )
      .subscribe( t => this.title.set( t ) );
    // <PostRefreshTitle />
  }

  onTabIndexChange( index: number ): void {
    this.selectedTab.set( index === 0 ? 'users' : 'invitations' );
  }

  async onInvitationCreated(): Promise<void> {
    // <PreOnInvitationCreated revert />
    const invTable = this.invitationsTable();
    if ( invTable ) {
      await invTable.getInvitations();
      invTable.clearSelection();
    }
    // <PostOnInvitationCreated />
  }
}
