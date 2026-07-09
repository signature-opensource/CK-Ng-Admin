create <ts> transformer
begin
    ensure import { CreateInvitationCommand, GetWorkspaceInvitationDataQCommand, UserForm } from '@local/ck-gen';

    // Search also matches the e-mail.
    inject """
           || u.email.toLocaleLowerCase().startsWith( q )
           """ into <PostUsersTabSearchPredicate>;

    // E-mail translation key fetched by #refreshLabels.
    inject """
           'CK.Admin.UserManagement.User.Email',
           """ into <PostUsersTabTranslationKeys>;

    // E-mail column (after the user-name column).
    inject """
           {
             name: 'email',
             displayedName: t['CK.Admin.UserManagement.User.Email'],
             sortable: true,
             showInMobile: true,
             sortDirections: ['ascend', 'descend'],
             hidden: false,
             sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.email.localeCompare( b.email ),
             filter: {
               visible: false,
               searchValue: '',
               reset: () => this.users.set( this.#computeFiltered() ),
               search: ( s: string ) => {
                 this.users.set( this.#computeFiltered().filter( u => u.email.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
               }
             }
           },
           """ into <PostUsersTabColumns>;

    // Swap the base (direct) creation / edit strategies for the e-mail invitation ones.
    inject """
           this.openCreateUserModal = () => this.#invitationCreateUserModal();
           this.openUserEditModal = ( user ) => this.#invitationUserEditModal( user );
           """ into <PostUsersTabInit>;

    // E-mail invitation creation flow.
    inject """
           async #invitationCreateUserModal(): Promise<void> {
             const workspace = this.workspace();
             if ( !workspace ) return;

             const res = await this.#crisEndpoint.sendOrThrowAsync( new GetWorkspaceInvitationDataQCommand() );
             if ( !res ) return;

             const languages = Object.values( locales );
             const g = [...res.groups];
             g.unshift( workspace );

             const defaultCultureName = languages[0]?.name ?? 'fr';
             const formData: GenericFormData<unknown, unknown> = {
               formControls: {
                 email: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
                   '',
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
                     required: true,
                     validators: [Validators.required, Validators.email],
                     errorMessages: { email: this.#translateService.instant( 'CK.Admin.UserManagement.Form.InvalidEmail' ) }
                   } ),
                 cultureName: new FormControlConfig( 'select',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Form.DefaultLanguage' ),
                   defaultCultureName,
                   {
                     required: true,
                     validators: [Validators.required],
                     options: languages.map( l => ( { label: l.nativeName, value: l.name } ) )
                   } ),
               }
             };

             const opts: ModalOptions = {
               nzTitle: this.#translateService.instant( 'CK.Admin.UserManagement.Modal.CreateUser' ),
               nzCancelText: this.#translateService.instant( 'Button.Cancel' ),
               nzOkText: this.#translateService.instant( 'Button.Confirm' ),
               nzContent: UserForm,
               nzData: { formData, groupInfos: g.sort( ( a, b ) => a.groupId - b.groupId ), languages: languages },
               nzOnOk: async ( cmp: UserForm ) => {
                 if ( !cmp.valid ) return Promise.reject();
                 const v = cmp.getValue();
                 const extendedCultureId = languages.find( l => l.name === v.cultureName )?.id ?? languages[0]?.id ?? 0;
                 const createRes = await this.#crisEndpoint.sendOrThrowAsync(
                   new CreateInvitationCommand( v.email, v.groups, extendedCultureId )
                 );
                 this.#notifService.notifyUserMessage( createRes );
                 await this.loadUsers();
                 this.userCreated.emit();
                 return undefined;
               }
             };
             this.#nzModalService.create( opts );
           }
           """ into <PostUsersTabMethods>;

    // E-mail-aware edit flow.
    inject """
           async #invitationUserEditModal( user: WorkspaceUser = this.selectedUsers[0] ): Promise<void> {
             const workspace = this.workspace();
             if ( !workspace ) return;
             if ( !user ) return;

             const languages = Object.values( locales );
             const currentCultureName = languages.find( l => l.id === user.extendedCultureId )?.name ?? languages[0]?.name ?? 'fr';
             const formData: GenericFormData<unknown, unknown> = {
               formControls: {
                 firstName: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.User.FirstName' ),
                   user.firstName,
                   { placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.FirstName' ), required: true, validators: [Validators.required] } ),
                 lastName: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ),
                   user.lastName,
                   { placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ), required: true, validators: [Validators.required] } ),
                 userName: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ),
                   user.userName,
                   { placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ), required: true, validators: [Validators.required] } ),
                 email: new FormControlConfig( 'text',
                   this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
                   user.email,
                   {
                     placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
                     required: true,
                     validators: [Validators.required, Validators.email],
                     errorMessages: { email: this.#translateService.instant( 'CK.Admin.UserManagement.Form.InvalidEmail' ) }
                   } ),
                 cultureName: new FormControlConfig( 'select',
                   this.#translateService.instant( 'CK.Admin.UserManagement.Form.DefaultLanguage' ),
                   currentCultureName,
                   { required: true, validators: [Validators.required], options: languages.map( l => ( { label: l.nativeName, value: l.name } ) ) } ),
               }
             };

             const opts: ModalOptions = {
               nzTitle: this.#translateService.instant( 'CK.Admin.UserManagement.Modal.EditUser' ),
               nzCancelText: this.#translateService.instant( 'Button.Cancel' ),
               nzOkText: this.#translateService.instant( 'Button.Confirm' ),
               nzContent: EditUserForm,
               nzData: { user, workspace, formData },
               nzOnOk: async ( cmp: EditUserForm ) => {
                 if ( !cmp.valid ) return Promise.reject();
                 const v = cmp.getValue();
                 const extendedCultureId = languages.find( l => l.name === v.cultureName )?.id ?? languages[0]?.id ?? 0;
                 const editCommand = new EditWorkspaceUserCommand(
                   user.userId,
                   v.firstName,
                   v.lastName,
                   v.userName,
                   extendedCultureId,
                   v.groups
                 );
                 // Set by property: the generated ctor appends Email after the ambient culture parameter.
                 editCommand.email = v.email;
                 const res = await this.#crisEndpoint.sendOrThrowAsync( editCommand );
                 this.#notifService.notifyUserMessage( res );
                 await this.loadUsers();
                 return undefined;
               }
             };

             this.#nzModalService.create( opts );
           }
           """ into <PostUsersTabMethods>;
end

create <html> transformer
begin
    // Show the e-mail on the mobile list item.
    inject """
           <div class="ck-list-item-line">
               <span>{{ 'CK.Admin.UserManagement.User.Email' | translate }}</span>
               <span>{{ user.email }}</span>
           </div>
           """ into <PostUsersTabItemInfo>;
end
