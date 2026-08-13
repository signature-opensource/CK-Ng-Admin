import { AfterViewInit, Component, DestroyRef, OnInit, TemplateRef, WritableSignal, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs';
import { ModalOptions, NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { faEdit, faPlus, faRotate } from '@fortawesome/free-solid-svg-icons';
import {
  ActionBarContent,
  AdaptivePageLayout,
  CreateWorkspaceUserCommand,
  EditUserForm,
  EditWorkspaceUserCommand,
  Filter,
  FormControlConfig,
  GenericFormData,
  GetWorkspaceUsersQCommand,
  GroupInfos,
  HttpCrisEndpoint,
  NotificationService,
  SelectFilter,
  SimpleUserMessage,
  TableAction,
  TableCellContext,
  TableColumn,
  UserMessageLevel,
  WorkspaceUser
} from '@local/ck-gen';
import { locales } from '@local/ck-gen/ts-locales/locales';

@Component( {
  selector: 'ck-users-tab',
  templateUrl: './users-tab.html',
  imports: [TranslateModule, AdaptivePageLayout, NgTemplateOutlet, NzModalModule, NzTagModule]
} )
export class UsersTab implements OnInit, AfterViewInit {
  // <PreViewChildren revert />
  readonly layout = viewChild<AdaptivePageLayout<WorkspaceUser>>( 'layout' );
  readonly groupsCellTemplate = viewChild.required<TemplateRef<TableCellContext<WorkspaceUser>>>( 'groupsCellTemplate' );
  // <PostViewChildren />

  // <PreInputOutput revert />
  readonly workspace = input<GroupInfos>();
  // Raised after a user is created (basic or, when UserInvitation is present, invited).
  readonly userCreated = output<void>();
  // <PostInputOutput />

  // <PreIconsDefinition revert />
  // <PostIconsDefinition />

  // <PreDependencyInjection revert />
  readonly #translateService = inject( TranslateService );
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #notifService = inject( NotificationService );
  readonly #nzModalService = inject( NzModalService );
  readonly #destroyRef = inject( DestroyRef );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  protected isLoading: WritableSignal<boolean> = signal( false );
  protected users: WritableSignal<Array<WorkspaceUser>> = signal( [] );
  protected columns: Array<TableColumn<WorkspaceUser>> = [];
  protected rowActions: Array<TableAction<WorkspaceUser>> = [];
  protected actions: WritableSignal<ActionBarContent<WorkspaceUser>> = signal( { left: [], right: [] } );
  protected readonly filters: WritableSignal<Array<Filter<unknown>>> = signal( [] );
  protected pageSize: number = 10;
  protected selectedUsers: Array<WorkspaceUser> = [];
  #allUsers: Array<WorkspaceUser> = [];
  #roleFilter!: SelectFilter<'admin' | 'member'>;
  // Role labels of the group tags. Kept as fields (rather than translated in the template) because the
  // tags are built in TS; they are refreshed by #refreshLabels on every language change.
  #adminRoleLabel: string = '';
  #memberRoleLabel: string = '';
  // UserBanned injects '#bannedFilter!: SwitchFilter;' here.
  // <PostLocalVariables />

  // Front search/filter run inside the adaptive layout: it calls these on every
  // keystroke / filter toggle and uses the returned array as the displayed items.
  protected readonly searchFunc = ( input: string ): Array<WorkspaceUser> => {
    const q = input.trim().toLocaleLowerCase();
    if ( !q ) return this.users();
    return this.users().filter( u => this.#matchesSearch( u, q ) );
  };

  // Base searches user name + first/last name. Siblings (UserInvitation) append search fields.
  #matchesSearch( u: WorkspaceUser, q: string ): boolean {
    return u.userName.toLocaleLowerCase().startsWith( q )
      || u.firstName.toLocaleLowerCase().startsWith( q )
      || u.lastName.toLocaleLowerCase().startsWith( q )
      // <PostUsersTabSearchPredicate />
      ;
  }

  protected readonly filterFunc = (): Array<WorkspaceUser> => {
    const filtered = this.#computeFiltered();
    this.users.set( filtered );
    return filtered;
  };

  constructor() {
    // Load (and reload) users reactively once the workspace is set. On a fresh page load (F5)
    // the workspace is resolved asynchronously by UserService; triggering the query here rather
    // than in ngOnInit guarantees the ambient currentWorkspaceId is set before the command is sent.
    effect( () => {
      const ws = this.workspace();
      untracked( () => { if ( ws ) void this.loadUsers(); } );
    } );
  }

  ngOnInit(): void {
    this.initFilters();

    this.#translateService.onLangChange
      .pipe( takeUntilDestroyed( this.#destroyRef ) )
      .subscribe( () => this.#refreshLabels() );

    // <PostUsersTabInit />
  }

  ngAfterViewInit(): void {
    this.#refreshLabels();
  }

  #refreshLabels(): void {
    this.#translateService.get( [
      'CK.Admin.UserManagement.User.UserName',
      'CK.Admin.UserManagement.User.FirstName',
      'CK.Admin.UserManagement.User.LastName',
      'CK.Admin.UserManagement.Column.Groups',
      'CK.Admin.UserManagement.Filter.Group',
      'CK.Admin.UserManagement.Filter.SelectGroup',
      'CK.Admin.UserManagement.Role.Administrator',
      'CK.Admin.UserManagement.Role.Member',
      'Button.Create',
      'Button.Edit',
      'Button.Refresh',
      // <PostUsersTabTranslationKeys />
    ] ).pipe( first() ).subscribe( t => {
      this.#adminRoleLabel = t['CK.Admin.UserManagement.Role.Administrator'];
      this.#memberRoleLabel = t['CK.Admin.UserManagement.Role.Member'];
      this.initColumns( t );
      this.initActions( t );
      this.initRowActions( t );
      this.#refreshFilterLabels( t );
    } );
  }

  #refreshFilterLabels( t: Record<string, string> ): void {
    this.#roleFilter.label = t['CK.Admin.UserManagement.Filter.Group'];
    this.#roleFilter.placeholder = t['CK.Admin.UserManagement.Filter.SelectGroup'];
    this.#roleFilter.options[0].label = t['CK.Admin.UserManagement.Role.Administrator'];
    this.#roleFilter.options[1].label = t['CK.Admin.UserManagement.Role.Member'];
    // <PostUsersTabFilterLabels />
    // Re-emit a new array so the layout picks up the relabelled filters.
    this.filters.set( this.#buildFilters() );
  }

  // Base ships only the role filter; siblings (UserBanned) append theirs.
  #buildFilters(): Array<Filter<unknown>> {
    return [
      this.#roleFilter,
      // <PostUsersTabFilters />
    ];
  }

  async loadUsers(): Promise<void> {
    // <PreLoadUsers revert />
    try {
      this.isLoading.set( true );
      const res = await this.#crisEndpoint.sendOrThrowAsync( new GetWorkspaceUsersQCommand() );
      if ( res ) {
        this.#allUsers = [...res];
      }

      this.layout()?.clearSelection();
      this.users.set( this.#computeFiltered() );
    } catch {
      this.#notifService.notifyUserMessage( { level: UserMessageLevel.Error, message: this.#translateService.instant( 'CK.Admin.UserManagement.Data.ErrorWhileLoading' ) } as SimpleUserMessage );
    } finally {
      this.isLoading.set( false );
    }
    // <PostLoadUsers />
  }

  // Applies the role filter to the full set. Siblings (UserBanned) extend the result.
  #computeFiltered(): Array<WorkspaceUser> {
    let result = [...this.#allUsers];

    if ( this.#roleFilter?.active ) {
      const values = ( this.#roleFilter.value as Array<'admin' | 'member'> | undefined ) ?? [];
      if ( values.length > 0 ) {
        result = result.filter( u => values.includes( u.isWorkspaceAdmin ? 'admin' : 'member' ) );
      }
    }

    // <PostComputeFiltered />
    return result;
  }

  onTableSelection( users: Array<WorkspaceUser> ): void {
    this.selectedUsers = [...users];
  }

  // One tag per workspace (zone) the user belongs to: the current workspace shows its roles only, the
  // others are prefixed with their workspace name. A user belonging to a workspace without any other
  // group is a plain member of it. The server order (zone, then group name) is kept.
  protected groupTags( u: WorkspaceUser ): Array<{ label: string, isAdmin: boolean }> {
    const currentZoneId = this.workspace()?.groupId ?? 0;
    const zones = new Map<number, { zoneId: number, name: string, roles: Array<string>, isAdmin: boolean }>();
    for ( const g of u.groups ?? [] ) {
      // A zone group is its own workspace: CK.vGroup gives it a null ZoneId/ZoneName.
      const zoneId = g.isZone ? g.groupId : g.zoneId;
      const zoneName = g.isZone ? g.groupName : g.zoneName;
      const zone = zones.get( zoneId ) ?? { zoneId, name: zoneName, roles: [], isAdmin: false };
      if ( !zone.name ) zone.name = zoneName;
      // Same convention as UserWorkspaceGroupPicker: the 'Administrators' group of a zone is the
      // administrator role. The zone group itself carries no role: it is the mere membership.
      if ( g.groupName === 'Administrators' ) {
        zone.isAdmin = true;
        zone.roles.push( this.#adminRoleLabel );
      } else if ( !g.isZone ) {
        zone.roles.push( g.groupName );
      }
      zones.set( zoneId, zone );
    }
    return [...zones.values()].map( z => {
      const roles = z.roles.length > 0 ? z.roles.join( ', ' ) : this.#memberRoleLabel;
      // No prefix for the current workspace, nor for the groups that belong to no workspace at all.
      const prefixed = z.zoneId !== currentZoneId && z.name.length > 0;
      return { label: prefixed ? `${z.name}: ${roles}` : roles, isAdmin: z.isAdmin };
    } );
  }

  #groupsSortKey( u: WorkspaceUser ): string {
    return this.groupTags( u ).map( t => t.label ).join( ' | ' );
  }

  initColumns( t: Record<string, string> ): void {
    // <UsersTabColumnsRegistration>
    this.columns = [
      {
        name: 'userId',
        displayedName: '#',
        sortable: true,
        showInMobile: true,
        sortOrder: 'ascend',
        hidden: true,
        sortDirections: ['ascend', 'descend'],
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.userId - b.userId
      },
      {
        name: 'userName',
        displayedName: t['CK.Admin.UserManagement.User.UserName'],
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.userName.localeCompare( b.userName ),
        filter: {
          visible: false,
          searchValue: '',
          reset: () => this.users.set( this.#computeFiltered() ),
          search: ( s: string ) => {
            this.users.set( this.#computeFiltered().filter( u => u.userName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
          }
        }
      },
      // <PostUsersTabColumns />
      {
        name: 'firstName',
        displayedName: t['CK.Admin.UserManagement.User.FirstName'],
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.firstName.localeCompare( b.firstName ),
        filter: {
          visible: false,
          searchValue: '',
          reset: () => this.users.set( this.#computeFiltered() ),
          search: ( s: string ) => {
            this.users.set( this.#computeFiltered().filter( u => u.firstName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
          }
        }
      },
      {
        name: 'lastName',
        displayedName: t['CK.Admin.UserManagement.User.LastName'],
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.lastName.localeCompare( b.lastName ),
        filter: {
          visible: false,
          searchValue: '',
          reset: () => this.users.set( this.#computeFiltered() ),
          search: ( s: string ) => {
            this.users.set( this.#computeFiltered().filter( u => u.lastName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
          }
        }
      },
      {
        name: 'groups',
        displayedName: t['CK.Admin.UserManagement.Column.Groups'],
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => this.#groupsSortKey( a ).localeCompare( this.#groupsSortKey( b ) ),
        template: this.groupsCellTemplate()
      },
      // <PostUsersTabLastColumns />
    ];
    // </UsersTabColumnsRegistration>
  }

  initFilters(): void {
    this.#roleFilter = new SelectFilter<'admin' | 'member'>(
      'multiple',
      this.#translateService.instant( 'CK.Admin.UserManagement.Filter.Group' ),
      [
        { label: this.#translateService.instant( 'CK.Admin.UserManagement.Role.Administrator' ), value: 'admin' },
        { label: this.#translateService.instant( 'CK.Admin.UserManagement.Role.Member' ), value: 'member' }
      ],
      {
        defaultValue: [],
        placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Filter.SelectGroup' )
      }
    );
    // <PostInitFilters />
    this.filters.set( this.#buildFilters() );
  }

  initActions( t: Record<string, string> ): void {
    // <UsersTabActionsRegistration>
    const actions: ActionBarContent<WorkspaceUser> = {
      left: [],
      right: [
        {
          name: 'create',
          displayName: t['Button.Create'],
          icon: faPlus,
          isDanger: false,
          execute: () => this.openCreateUserModal(),
          shouldBeDisplayed: () => true,
        },
        {
          name: 'edit',
          displayName: t['Button.Edit'],
          icon: faEdit,
          isDanger: false,
          execute: () => this.openUserEditModal(),
          shouldBeDisplayed: () => this.selectedUsers.length === 1
        },
        // <PostUsersTabRightActions />
        {
          name: 'refresh',
          icon: faRotate,
          displayName: t['Button.Refresh'],
          isDanger: false,
          execute: async () => { await this.loadUsers(); },
          shouldBeDisplayed: () => true
        }
      ]
    };
    // </UsersTabActionsRegistration>
    this.actions.set( actions );
  }

  initRowActions( t: Record<string, string> ): void {
    // <UsersTabRowActionsRegistration>
    this.rowActions = [
      {
        name: 'edit',
        icon: faEdit,
        isDanger: false,
        // Same rendering as the action-bar buttons on the opposite side of the filters (which default
        // to 'primary'): the row actions must not look like a different kind of button.
        type: 'primary',
        tooltip: t['Button.Edit'],
        execute: ( u: WorkspaceUser ) => { void this.openUserEditModal( u ); },
        shouldBeDisplayed: () => true
      },
      // <PostUsersTabRowActions />
    ];
    // </UsersTabRowActionsRegistration>
  }

  // Ban / unban confirm methods are injected here by the UserBanned sibling.
  // <PostUsersTabMethods />

  // Create/edit modal openers are fields so a sibling (UserInvitation) can swap the strategy in
  // ngOnInit without a duplicate method definition.
  protected openCreateUserModal: () => Promise<void> = () => this.#defaultCreateUserModal();
  protected openUserEditModal: ( user?: WorkspaceUser ) => Promise<void> = ( user ) => this.#defaultUserEditModal( user );

  // Base: direct (basic) user creation. UserInvitation swaps this for the e-mail invitation flow.
  async #defaultCreateUserModal(): Promise<void> {
    const workspace = this.workspace();
    if ( !workspace ) return;

    const languages = Object.values( locales );
    const defaultCultureName = languages[0]?.name ?? 'fr';
    const formData: GenericFormData<unknown, unknown> = {
      formControls: {
        userName: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ),
          '',
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ),
            required: true,
            validators: [Validators.required]
          } ),
        firstName: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.FirstName' ),
          '',
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.FirstName' ),
            required: true,
            validators: [Validators.required]
          } ),
        lastName: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ),
          '',
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ),
            required: true,
            validators: [Validators.required]
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
      nzContent: EditUserForm,
      nzData: { user: { userId: 0 }, workspace, formData },
      nzOnOk: async ( cmp: EditUserForm ) => {
        if ( !cmp.valid ) return Promise.reject();
        const v = cmp.getValue();
        const extendedCultureId = languages.find( l => l.name === v.cultureName )?.id ?? languages[0]?.id ?? 0;
        // Provisions an initial basic-authentication password so the new user can sign in right away.
        // Set by property (not positional) because the generated ctor places the ambient parameters last.
        const command = new CreateWorkspaceUserCommand(v.userName, v.firstName, v.lastName, extendedCultureId, v.password, v.groups );
        command.password = v.password ?? '';
        const res = await this.#crisEndpoint.sendOrThrowAsync( command );
        this.#notifService.notifyUserMessage( res );
        await this.loadUsers();
        this.userCreated.emit();
        return undefined;
      }
    };
    this.#nzModalService.create( opts );
  }
  // Base edit: user name / names / culture / groups. UserInvitation swaps this to also edit the e-mail.
  async #defaultUserEditModal( user: WorkspaceUser = this.selectedUsers[0] ): Promise<void> {
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
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.FirstName' ),
            required: true,
            validators: [Validators.required]
          } ),
        lastName: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ),
          user.lastName,
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.LastName' ),
            required: true,
            validators: [Validators.required]
          } ),
        userName: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ),
          user.userName,
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.UserName' ),
            required: true,
            validators: [Validators.required]
          } ),
        cultureName: new FormControlConfig( 'select',
          this.#translateService.instant( 'CK.Admin.UserManagement.Form.DefaultLanguage' ),
          currentCultureName,
          {
            required: true,
            validators: [Validators.required],
            options: languages.map( l => ( { label: l.nativeName, value: l.name } ) )
          } ),
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
        const res = await this.#crisEndpoint.sendOrThrowAsync( editCommand );
        this.#notifService.notifyUserMessage( res );
        await this.loadUsers();
        return undefined;
      }
    };

    this.#nzModalService.create( opts );
  }
}
