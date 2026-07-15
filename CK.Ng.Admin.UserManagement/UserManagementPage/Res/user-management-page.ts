import { Component, DestroyRef, WritableSignal, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import {
  GroupInfos,
  LayoutContent,
  UserService,
  UsersTab,
  // <PostPageImports />
} from '@local/ck-gen';

@Component( {
  selector: 'ck-user-management-page',
  templateUrl: './user-management-page.html',
  imports: [
    LayoutContent,
    NzTabsModule,
    TranslateModule,
    UsersTab,
    // <PostPageComponentImports />
  ]
} )
export class UserManagementPage {
  // <PreViewChildren revert />
  readonly usersTab = viewChild<UsersTab>( 'usersTab' );
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
  protected selectedTabIndex: WritableSignal<number> = signal( 0 );
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
    this.selectedTabIndex.set( index );
  }

  // Raised by the users tab after a user creation. Base does nothing extra; siblings (UserInvitation)
  // refresh their own views (e.g. the invitations table).
  onUserCreated(): void {
    // <PostOnUserCreated />
  }

  // <PostUserManagementPageMethods />
}
