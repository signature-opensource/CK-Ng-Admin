create <ts> transformer
begin
    ensure import { BanUserForm, DestroyUserBannedCommand, SetUserBannedCommand, SwitchFilter, UserBan } from '@local/ck-gen';
    ensure import { faBan, faUnlock } from '@fortawesome/free-solid-svg-icons';
    // AbstractControl types the validator that rejects a blank reason.
    ensure import { AbstractControl } from '@angular/forms';
    // The generated Poco exposes the ban dates as luxon DateTime (not JS Date).
    ensure import { DateTime } from 'luxon';
    // The banned tag carries a tooltip: the module must join the base component's imports.
    ensure import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

    // The tag injected into the user-name cell needs the tooltip directive. Only the imports array of
    // the @Component decorator is targeted, so the NzTagModule of the import statement above is left alone.
    in after "@Component"
        in first {^braces}
            in after "imports:"
                in first {^[]}
                    replace "NzTagModule" with "NzTagModule, NzToolTipModule";

    // The banned-users filter field, and the "currently banned" predicate. A banishment is active when
    // now falls inside [banStartDate, banEndDate[ - the same window as CK.fUserBannedViewAt.
    inject """
           #bannedFilter!: SwitchFilter;

           #activeBans( u: WorkspaceUser ): Array<UserBan> {
             const now = DateTime.utc().toMillis();
             return ( u.bans ?? [] ).filter( b => b.banStartDate.toMillis() <= now && now < b.banEndDate.toMillis() );
           }

           // Not a #private member: the user-name cell template calls it, and a template cannot resolve
           // a private field.
           protected isBanned( u: WorkspaceUser ): boolean {
             return this.#activeBans( u ).length > 0;
           }
           """ into <PostLocalVariables>;

    // Translation keys fetched by #refreshLabels.
    inject """
           'CK.Admin.UserManagement.Filter.Banned',
           'CK.Admin.UserManagement.Ban.Tag',
           'CK.Admin.UserManagement.Ban.Until',
           'CK.Admin.UserManagement.Ban.KeyReason',
           'CK.Admin.UserManagement.Ban.ReasonPlaceholder',
           'CK.Admin.UserManagement.Ban.ReasonRequired',
           'CK.Admin.UserManagement.Ban.ReasonTooLong',
           'CK.Admin.UserManagement.Ban.ReasonInvalidChars',
           'CK.Admin.UserManagement.Ban.Eternal',
           'CK.Admin.UserManagement.Modal.BanUsers',
           'CK.Admin.UserManagement.Modal.UnbanUsers',
           'Button.Ban',
           'Button.Unban',
           """ into <PostUsersTabTranslationKeys>;

    // Relabel the banned filter on language change.
    inject """
           this.#bannedFilter.label = t['CK.Admin.UserManagement.Filter.Banned'];
           """ into <PostUsersTabFilterLabels>;

    // Append the banned filter to the filter bar.
    inject """
           this.#bannedFilter,
           """ into <PostUsersTabFilters>;

    // Build the banned filter in initFilters(). It stays out of the filter bar until the user picks it
    // in the "filters to display" menu, which only flips `active`: the switch itself must therefore
    // default to true, so that showing the filter shows the banned users rather than hiding them.
    inject """
           this.#bannedFilter = new SwitchFilter(
             this.#translateService.instant( 'CK.Admin.UserManagement.Filter.Banned' ),
             true,
             false
           );
           """ into <PostInitFilters>;

    // Ban filtering. Unlike an archived user, a banned user is not deleted: it stays visible by default
    // and the filter only narrows the list to the banned (or to the non-banned) ones.
    inject """
           if ( this.#bannedFilter?.active ) {
             result = this.#bannedFilter.value
               ? result.filter( u => this.isBanned( u ) )
               : result.filter( u => !this.isBanned( u ) );
           }
           """ into <PostComputeFiltered>;

    // Ban / unban action-bar buttons.
    inject """
           {
             name: 'ban',
             displayName: t['Button.Ban'],
             icon: faBan,
             isDanger: true,
             execute: () => this.confirmBanUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => !this.isBanned( u ) )
           },
           {
             name: 'unban',
             displayName: t['Button.Unban'],
             icon: faUnlock,
             isDanger: false,
             execute: () => this.confirmUnbanUsers( this.selectedUsers ),
             shouldBeDisplayed: () => this.selectedUsers.length > 0 && this.selectedUsers.every( u => this.isBanned( u ) )
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
             shouldBeDisplayed: ( u: WorkspaceUser ) => !this.isBanned( u )
           },
           {
             name: 'unban',
             icon: faUnlock,
             isDanger: false,
             type: 'text',
             tooltip: t['Button.Unban'],
             execute: ( u: WorkspaceUser ) => this.confirmUnbanUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => this.isBanned( u )
           },
           """ into <PostUsersTabRowActions>;

    // Ban / unban methods. The commands are per user (and, for the unban, per reason): the batch
    // selection of the action bar is looped over here.
    inject """
           // Tooltip of the banned tag: one entry per active banishment. The separator is not a newline
           // because .ant-tooltip-inner renders with white-space: normal, so a line feed would collapse
           // into a space; the overlay lives outside the component styles, out of reach of a fix here.
           banTooltip( u: WorkspaceUser ): string {
             return this.#activeBans( u ).map( b => this.formatBan( b ) ).join( ' | ' );
           }

           formatBan( ban: UserBan ): string {
             // The reason is free text typed by the administrator: it is displayed as it was entered.
             // Banishments set by another package (CK.DB.User.UserPassword.Banned uses
             // UserPassword.TooManyAttempt) therefore show their technical key.
             const reason = ban.keyReason;
             if ( ban.banEndDate.year >= 9999 ) {
               return reason + ' - ' + this.#translateService.instant( 'CK.Admin.UserManagement.Ban.Eternal' );
             }
             // The Poco carries UTC instants (CTSType parses them with zone 'UTC'), so they must be
             // moved to the browser zone before formatting, otherwise the hour is displayed off.
             const end = ban.banEndDate.toLocal();
             // A short ban (typically one hour) must show the time, not only the day.
             const shortLived = end.diffNow( 'hours' ).hours < 24;
             const until = this.#translateService.instant( 'CK.Admin.UserManagement.Ban.Until' );
             return reason + ' - ' + until + ' ' + end.toLocaleString( shortLived ? DateTime.DATETIME_SHORT : DateTime.DATE_SHORT );
           }

           confirmBanUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;

             // A single free-text reason: the server stores KeyReason as a plain varchar(128) with no
             // catalog of its own, so there is nothing to pick from.
             const formData: GenericFormData<unknown, { keyReason: string }> = {
               formControls: {
                 keyReason: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.KeyReason' ),
                   '',
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonPlaceholder' ),
                     required: true,
                     validators: [
                       // Validators.required accepts a run of spaces: the check is done on the trimmed
                       // value, and reports 'required' so the message stays the same.
                       ( c: AbstractControl ) => ( ( c.value ?? '' ) as string ).trim() ? null : { required: true },
                       Validators.maxLength( 128 ),
                       // CK.sUserBannedSet matches with LIKE: a % or a _ in the reason would target
                       // another banishment instead of creating one.
                       Validators.pattern( /^[^%_\[\]]*$/ )
                     ],
                     errorMessages: {
                       required: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonRequired' ),
                       maxlength: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonTooLong' ),
                       pattern: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonInvalidChars' )
                     }
                   } ),
               }
             };

             const opts: ModalOptions = {
               nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.BanUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
               nzCancelText: this.#translateService.instant( 'Button.Cancel' ),
               nzOkText: this.#translateService.instant( 'Button.Confirm' ),
               nzContent: BanUserForm,
               nzData: { formData, userNames: users.map( u => u.userName ) },
               nzOnOk: async ( cmp: BanUserForm ) => {
                 // Keep the modal open and reveal what is missing: with no default reason, a silent
                 // rejection would leave the administrator without any clue.
                 if ( !cmp.valid ) { cmp.showErrors(); return Promise.reject(); }
                 const v = cmp.getValue();
                 for ( const u of users ) {
                   const cmd = new SetUserBannedCommand();
                   cmd.userId = u.userId;
                   cmd.keyReason = v.keyReason;
                   // banStartDate is left undefined: CK.sUserBannedSet applies sysutcdatetime() on
                   // creation and keeps the existing start date on update.
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
    // Banned tag, right next to the user name. It replaces the former "Deactivations" column: the detail
    // (reason and end date of every active banishment) moved into its tooltip. The user-name cell
    // template is shared by the table and the mobile list item, so one injection covers both.
    inject """
           @if ( isBanned( user ) ) {
               <nz-tag nzColor="red" nz-tooltip [nzTooltipTitle]="banTooltip( user )">{{ 'CK.Admin.UserManagement.Ban.Tag' | translate }}</nz-tag>
           }
           """ into <PostUserNameCellTags>;
end
