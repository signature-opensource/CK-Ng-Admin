create <ts> transformer
begin
    ensure import { ArchiveUsersCommand, RestoreUsersCommand, SwitchFilter } from '@local/ck-gen';
    ensure import { faArrowRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';

    // The archived-users filter field.
    inject """
           #archivedFilter!: SwitchFilter;
           """ into <PostLocalVariables>;

    // Translation keys fetched by #refreshLabels.
    inject """
           'CK.Admin.UserManagement.Filter.ShowArchived',
           'Button.Delete',
           'Button.Restore',
           """ into <PostUsersTabTranslationKeys>;

    // Relabel the archived filter on language change.
    inject """
           this.#archivedFilter.label = t['CK.Admin.UserManagement.Filter.ShowArchived'];
           """ into <PostUsersTabFilterLabels>;

    // Append the archived filter to the filter bar.
    inject """
           this.#archivedFilter,
           """ into <PostUsersTabFilters>;

    // Build the archived filter in initFilters().
    inject """
           this.#archivedFilter = new SwitchFilter(
             this.#translateService.instant( 'CK.Admin.UserManagement.Filter.ShowArchived' ),
             false,
             false
           );
           """ into <PostInitFilters>;

    // Archived filtering: hidden by default, toggled by the filter.
    inject """
           if ( this.#archivedFilter?.active ) {
             result = this.#archivedFilter.value
               ? result.filter( u => !!u.binDate )
               : result.filter( u => !u.binDate );
           } else {
             result = result.filter( u => !u.binDate );
           }
           """ into <PostComputeFiltered>;

    // Archive / restore action-bar buttons.
    inject """
           {
             name: 'archive',
             displayName: t['Button.Delete'],
             icon: faTrash,
             isDanger: true,
             execute: () => this.confirmArchiveUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => !u.binDate )
           },
           {
             name: 'restore',
             displayName: t['Button.Restore'],
             icon: faArrowRotateLeft,
             isDanger: false,
             execute: () => this.confirmRestoreUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => !!u.binDate )
           },
           """ into <PostUsersTabRightActions>;

    // Archive / restore row actions.
    inject """
           {
             name: 'archive',
             icon: faTrash,
             isDanger: true,
             type: 'text',
             tooltip: t['Button.Delete'],
             execute: ( u: WorkspaceUser ) => this.confirmArchiveUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => !u.binDate
           },
           {
             name: 'restore',
             icon: faArrowRotateLeft,
             isDanger: false,
             type: 'text',
             tooltip: t['Button.Restore'],
             execute: ( u: WorkspaceUser ) => this.confirmRestoreUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => !!u.binDate
           },
           """ into <PostUsersTabRowActions>;

    // Archive / restore confirm methods.
    inject """
           confirmArchiveUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;
             const opts: ModalOptions = {
               nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ArchiveUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
               nzOnOk: async () => {
                 const cmd = new ArchiveUsersCommand();
                 cmd.userIds = users.map( i => i.userId );
                 const res = await this.#crisEndpoint.sendOrThrowAsync( cmd );
                 res?.userMessages.forEach( m => this.#notifService.notifyUserMessage( m ) );
                 this.isLoading.set( true );
                 await this.loadUsers();
               }
             };
             this.#nzModalService.confirm( opts );
           }

           confirmRestoreUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;
             const opts: ModalOptions = {
               nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.RestoreUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
               nzOnOk: async () => {
                 const cmd = new RestoreUsersCommand();
                 cmd.userIds = users.map( i => i.userId );
                 const res = await this.#crisEndpoint.sendOrThrowAsync( cmd );
                 res?.userMessages.forEach( m => this.#notifService.notifyUserMessage( m ) );
                 this.isLoading.set( true );
                 await this.loadUsers();
               }
             };
             this.#nzModalService.confirm( opts );
           }
           """ into <PostUsersTabMethods>;
end
