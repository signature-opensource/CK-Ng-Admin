create <ts> transformer
begin
    ensure import { BanUserForm, DestroyUserBannedCommand, SetUserBannedCommand, SwitchFilter, UserBan } from '@local/ck-gen';
    ensure import { faBan, faUnlock } from '@fortawesome/free-solid-svg-icons';

    // The banned-users filter field, and the "currently banned" predicate. A banishment is active when
    // now falls inside [banStartDate, banEndDate[ — the same window as CK.fUserBannedViewAt.
    inject """
           #bannedFilter!: SwitchFilter;

           #activeBans( u: WorkspaceUser ): Array<UserBan> {
             const now = new Date();
             return ( u.bans ?? [] ).filter( b => new Date( b.banStartDate ) <= now && now < new Date( b.banEndDate ) );
           }

           #isBanned( u: WorkspaceUser ): boolean {
             return this.#activeBans( u ).length > 0;
           }
           """ into <PostLocalVariables>;

    // Translation keys fetched by #refreshLabels.
    inject """
           'CK.Admin.UserManagement.Filter.ShowBanned',
           'CK.Admin.UserManagement.Column.Bans',
           'CK.Admin.UserManagement.Ban.KeyReason',
           'CK.Admin.UserManagement.Ban.StartDate',
           'CK.Admin.UserManagement.Ban.EndDate',
           'CK.Admin.UserManagement.Ban.Eternal',
           'CK.Admin.UserManagement.Modal.BanUsers',
           'CK.Admin.UserManagement.Modal.UnbanUsers',
           'Button.Ban',
           'Button.Unban',
           """ into <PostUsersTabTranslationKeys>;

    // Relabel the banned filter on language change.
    inject """
           this.#bannedFilter.label = t['CK.Admin.UserManagement.Filter.ShowBanned'];
           """ into <PostUsersTabFilterLabels>;

    // Append the banned filter to the filter bar.
    inject """
           this.#bannedFilter,
           """ into <PostUsersTabFilters>;

    // Build the banned filter in initFilters().
    inject """
           this.#bannedFilter = new SwitchFilter(
             this.#translateService.instant( 'CK.Admin.UserManagement.Filter.ShowBanned' ),
             false,
             false
           );
           """ into <PostInitFilters>;

    // Ban filtering. Unlike an archived user, a banned user is not deleted: it stays visible by default
    // and the filter only narrows the list to the banned (or to the non-banned) ones.
    inject """
           if ( this.#bannedFilter?.active ) {
             result = this.#bannedFilter.value
               ? result.filter( u => this.#isBanned( u ) )
               : result.filter( u => !this.#isBanned( u ) );
           }
           """ into <PostComputeFiltered>;

    // Banishment column: the active reasons and their end date (an eternal ban has no displayed date).
    inject """
           {
             name: 'bans',
             displayedName: t['CK.Admin.UserManagement.Column.Bans'],
             sortable: true,
             showInMobile: true,
             sortDirections: ['ascend', 'descend'],
             hidden: false,
             sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => this.#activeBans( a ).length - this.#activeBans( b ).length,
             valueFormatter: ( _value: unknown, u: WorkspaceUser ) => this.#activeBans( u ).map( b => this.formatBan( b ) ).join( ', ' )
           },
           """ into <PostUsersTabColumns>;

    // Ban / unban action-bar buttons.
    inject """
           {
             name: 'ban',
             displayName: t['Button.Ban'],
             icon: faBan,
             isDanger: true,
             execute: () => this.confirmBanUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => !this.#isBanned( u ) )
           },
           {
             name: 'unban',
             displayName: t['Button.Unban'],
             icon: faUnlock,
             isDanger: false,
             execute: () => this.confirmUnbanUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => this.#isBanned( u ) )
           },
           """ into <PostUsersTabRightActions>;

    // Ban / unban row actions.
    inject """
           {
             name: 'ban',
             icon: faBan,
             isDanger: true,
             type: 'text',
             tooltip: t['Button.Ban'],
             execute: ( u: WorkspaceUser ) => this.confirmBanUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => !this.#isBanned( u )
           },
           {
             name: 'unban',
             icon: faUnlock,
             isDanger: false,
             type: 'text',
             tooltip: t['Button.Unban'],
             execute: ( u: WorkspaceUser ) => this.confirmUnbanUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => this.#isBanned( u )
           },
           """ into <PostUsersTabRowActions>;

    // Ban / unban methods. The commands are per user (and, for the unban, per reason): the batch
    // selection of the action bar is looped over here.
    inject """
           formatBan( ban: UserBan ): string {
             const end = new Date( ban.banEndDate );
             return end.getFullYear() >= 9999
               ? `${ban.keyReason} (${this.#translateService.instant( 'CK.Admin.UserManagement.Ban.Eternal' )})`
               : `${ban.keyReason} (${end.toLocaleDateString()})`;
           }

           confirmBanUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;

             const formData: GenericFormData<unknown, unknown> = {
               formControls: {
                 keyReason: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.KeyReason' ),
                   'UserManagement.AdminBan',
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.KeyReason' ),
                     required: true,
                     validators: [Validators.required, Validators.maxLength( 128 )]
                   } ),
                 banStartDate: new FormControlConfig( 'date',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.StartDate' ),
                   new Date(),
                   { dateFormat: 'dd-MM-yyyy HH:mm' } ),
                 banEndDate: new FormControlConfig( 'date',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.EndDate' ),
                   null,
                   { dateFormat: 'dd-MM-yyyy HH:mm' } ),
               }
             };

             const opts: ModalOptions = {
               nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.BanUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
               nzCancelText: this.#translateService.instant( 'Button.Cancel' ),
               nzOkText: this.#translateService.instant( 'Button.Confirm' ),
               nzContent: BanUserForm,
               nzData: { formData, userNames: users.map( u => u.userName ) },
               nzOnOk: async ( cmp: BanUserForm ) => {
                 if ( !cmp.valid ) return Promise.reject();
                 const v = cmp.getValue();
                 for ( const u of users ) {
                   const cmd = new SetUserBannedCommand();
                   cmd.userId = u.userId;
                   cmd.keyReason = v.keyReason;
                   cmd.banStartDate = v.banStartDate;
                   cmd.banEndDate = v.banEndDate;
                   const res = await this.#crisEndpoint.sendOrThrowAsync( cmd );
                   res?.userMessages.forEach( m => this.#notifService.notifyUserMessage( m ) );
                 }
                 this.isLoading.set( true );
                 await this.loadUsers();
                 return undefined;
               }
             };
             this.#nzModalService.create( opts );
           }

           confirmUnbanUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;
             const opts: ModalOptions = {
               nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.UnbanUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
               nzOnOk: async () => {
                 // A user can carry several reasons at once: unbanning lifts them all.
                 for ( const u of users ) {
                   for ( const ban of this.#activeBans( u ) ) {
                     const cmd = new DestroyUserBannedCommand();
                     cmd.userId = u.userId;
                     cmd.keyReason = ban.keyReason;
                     const res = await this.#crisEndpoint.sendOrThrowAsync( cmd );
                     res?.userMessages.forEach( m => this.#notifService.notifyUserMessage( m ) );
                   }
                 }
                 this.isLoading.set( true );
                 await this.loadUsers();
               }
             };
             this.#nzModalService.confirm( opts );
           }
           """ into <PostUsersTabMethods>;
end

create <html> transformer
begin
    // Show the active banishments on the mobile list item.
    inject """
           @if ( user.bans && user.bans.length > 0 ) {
               <div class="ck-list-item-line">
                   <span>{{ 'CK.Admin.UserManagement.Column.Bans' | translate }}</span>
                   <span>{{ user.bans.length }}</span>
               </div>
           }
           """ into <PostUsersTabItemInfo>;
end
