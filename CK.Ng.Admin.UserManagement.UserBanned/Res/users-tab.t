create <ts> transformer
begin
    ensure import { BanUserForm, DestroyUserBannedCommand, SetUserBannedCommand, SwitchFilter, UserBan } from '@local/ck-gen';
    ensure import { faBan, faUnlock } from '@fortawesome/free-solid-svg-icons';
    // AbstractControl types the cross-field validator that makes the free-text reason mandatory.
    ensure import { AbstractControl } from '@angular/forms';
    // The generated Poco exposes the ban dates as luxon DateTime (not JS Date).
    ensure import { DateTime } from 'luxon';

    // The banned-users filter field, and the "currently banned" predicate. A banishment is active when
    // now falls inside [banStartDate, banEndDate[ — the same window as CK.fUserBannedViewAt.
    inject """
           #bannedFilter!: SwitchFilter;

           #activeBans( u: WorkspaceUser ): Array<UserBan> {
             const now = DateTime.utc().toMillis();
             return ( u.bans ?? [] ).filter( b => b.banStartDate.toMillis() <= now && now < b.banEndDate.toMillis() );
           }

           #isBanned( u: WorkspaceUser ): boolean {
             return this.#activeBans( u ).length > 0;
           }

           // Select value that opens the free-text reason instead of sending a catalog key. Must stay
           // in sync with BAN_OTHER_REASON in ban-user-form.ts, which reads the form back: the CK
           // import rewriter only resolves registered types from '@local/ck-gen', not plain consts,
           // so the constant cannot be shared through an import here.
           readonly #banOtherReason = 'other';

           // Banishment reasons offered to the administrator. What is sent to the server is the
           // technical key (stable, language independent); the label is display only. They all share
           // the UserManagement.AdminBan prefix so an administrative ban stays recognizable.
           readonly #banReasonKeys: ReadonlyArray<{ value: string, labelKey: string }> = [
             { value: 'UserManagement.AdminBan.LeftCompany', labelKey: 'CK.Admin.UserManagement.Ban.ReasonLeftCompany' },
             { value: 'UserManagement.AdminBan.ContractEnded', labelKey: 'CK.Admin.UserManagement.Ban.ReasonContractEnded' },
             { value: 'UserManagement.AdminBan.ExtendedLeave', labelKey: 'CK.Admin.UserManagement.Ban.ReasonExtendedLeave' },
             { value: 'UserManagement.AdminBan.SecurityViolation', labelKey: 'CK.Admin.UserManagement.Ban.ReasonSecurityViolation' },
             { value: 'UserManagement.AdminBan.CompromisedAccount', labelKey: 'CK.Admin.UserManagement.Ban.ReasonCompromisedAccount' },
             { value: 'UserManagement.AdminBan.Misconduct', labelKey: 'CK.Admin.UserManagement.Ban.ReasonMisconduct' },
             { value: 'UserManagement.AdminBan.PendingInvestigation', labelKey: 'CK.Admin.UserManagement.Ban.ReasonPendingInvestigation' }
           ];

           // Select options, labels resolved in the current language; "Other" always comes last.
           #banReasonOptions(): Array<{ label: string, value: string }> {
             return [
               ...this.#banReasonKeys.map( r => ( {
                 label: this.#translateService.instant( r.labelKey ),
                 value: r.value
               } ) ),
               {
                 label: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonOther' ),
                 value: this.#banOtherReason
               }
             ];
           }

           // Label of a reason read back from the database. Free-text reasons and those set by other
           // packages (CK.DB.User.UserPassword.Banned uses UserPassword.TooManyAttempt) have no
           // translation: they are displayed as-is.
           #banReasonLabel( keyReason: string ): string {
             const known = this.#banReasonKeys.find( r => r.value === keyReason );
             return known ? this.#translateService.instant( known.labelKey ) : keyReason;
           }
           """ into <PostLocalVariables>;

    // Translation keys fetched by #refreshLabels.
    inject """
           'CK.Admin.UserManagement.Filter.Banned',
           'CK.Admin.UserManagement.Column.Bans',
           'CK.Admin.UserManagement.Ban.KeyReason',
           'CK.Admin.UserManagement.Ban.SelectReason',
           'CK.Admin.UserManagement.Ban.ReasonRequired',
           'CK.Admin.UserManagement.Ban.ReasonLeftCompany',
           'CK.Admin.UserManagement.Ban.ReasonContractEnded',
           'CK.Admin.UserManagement.Ban.ReasonExtendedLeave',
           'CK.Admin.UserManagement.Ban.ReasonSecurityViolation',
           'CK.Admin.UserManagement.Ban.ReasonCompromisedAccount',
           'CK.Admin.UserManagement.Ban.ReasonMisconduct',
           'CK.Admin.UserManagement.Ban.ReasonPendingInvestigation',
           'CK.Admin.UserManagement.Ban.ReasonOther',
           'CK.Admin.UserManagement.Ban.CustomReason',
           'CK.Admin.UserManagement.Ban.CustomReasonRequired',
           'CK.Admin.UserManagement.Ban.CustomReasonTooLong',
           'CK.Admin.UserManagement.Ban.CustomReasonInvalidChars',
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
               ? result.filter( u => this.#isBanned( u ) )
               : result.filter( u => !this.#isBanned( u ) );
           }
           """ into <PostComputeFiltered>;

    // Banishment column: the active reasons and their end date (an eternal ban has no displayed date).
    // Injected at the trailing marker so it comes after the role column, at the far right of the table.
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
           """ into <PostUsersTabLastColumns>;

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
             type: 'primary',
             tooltip: t['Button.Ban'],
             execute: ( u: WorkspaceUser ) => this.confirmBanUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => !this.#isBanned( u )
           },
           {
             name: 'unban',
             icon: faUnlock,
             isDanger: false,
             type: 'primary',
             tooltip: t['Button.Unban'],
             execute: ( u: WorkspaceUser ) => this.confirmUnbanUsers( [u] ),
             shouldBeDisplayed: ( u: WorkspaceUser ) => this.#isBanned( u )
           },
           """ into <PostUsersTabRowActions>;

    // Ban / unban methods. The commands are per user (and, for the unban, per reason): the batch
    // selection of the action bar is looped over here.
    inject """
           formatBan( ban: UserBan ): string {
             const reason = this.#banReasonLabel( ban.keyReason );
             if ( ban.banEndDate.year >= 9999 ) {
               return `${reason} (${this.#translateService.instant( 'CK.Admin.UserManagement.Ban.Eternal' )})`;
             }
             // The Poco carries UTC instants (CTSType parses them with zone 'UTC'), so they must be
             // moved to the browser zone before formatting, otherwise the hour is displayed off.
             const end = ban.banEndDate.toLocal();
             // A short ban (typically one hour) must show the time, not only the day.
             const shortLived = end.diffNow( 'hours' ).hours < 24;
             return `${reason} (${end.toLocaleString( shortLived ? DateTime.DATETIME_SHORT : DateTime.DATE_SHORT )})`;
           }

           confirmBanUsers( users: Array<WorkspaceUser> ): void {
             if ( users.length === 0 ) return;

             const otherReason = this.#banOtherReason;
             const formData: GenericFormData<unknown, { keyReason: string, customKeyReason: string }> = {
               formControls: {
                 keyReason: new FormControlConfig( 'select',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.KeyReason' ),
                   null,
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.SelectReason' ),
                     required: true,
                     options: this.#banReasonOptions(),
                     validators: [Validators.required],
                     errorMessages: { required: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.ReasonRequired' ) }
                   } ),
                 customKeyReason: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Ban.CustomReason' ),
                   '',
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.CustomReason' ),
                     // Shown only on "Other". Beware: isVisible() merely hides, the control's own
                     // validators stay active - hence no Validators.required here, the requirement
                     // being carried by the group validator below.
                     show: v => v.keyReason === otherReason,
                     validators: [
                       Validators.maxLength( 128 ),
                       // CK.sUserBannedSet matches with LIKE: a % or a _ in the reason would target
                       // another banishment instead of creating one.
                       Validators.pattern( /^[^%_\[\]]*$/ )
                     ],
                     errorMessages: {
                       maxlength: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.CustomReasonTooLong' ),
                       pattern: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.CustomReasonInvalidChars' )
                     }
                   } ),
               },
               // Group validator: re-evaluated as soon as any control changes, unlike a validator
               // carried by customKeyReason which would not react to a keyReason change.
               generalFormValidators: {
                 validators: [( g: AbstractControl ) => {
                   if ( g.get( 'keyReason' )?.value !== otherReason ) return null;
                   return ( g.get( 'customKeyReason' )?.value ?? '' ).toString().trim()
                     ? null
                     : { customKeyReasonRequired: true };
                 }],
                 errorMessages: {
                   customKeyReasonRequired: this.#translateService.instant( 'CK.Admin.UserManagement.Ban.CustomReasonRequired' )
                 }
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
