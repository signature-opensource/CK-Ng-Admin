import { AfterViewInit, Component, DestroyRef, OnInit, TemplateRef, WritableSignal, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { first } from 'rxjs';
import { ModalOptions, NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { faArrowRotateLeft, faEdit, faPlus, faRotate, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  ActionBarContent,
  ArchiveUsersCommand,
  CreateInvitationCommand,
  EditUserForm,
  EditWorkspaceUserCommand,
  Filter,
  FormControlConfig,
  GenericFormData,
  GetWorkspaceInvitationDataQCommand,
  GetWorkspaceUsersQCommand,
  GroupInfos,
  HttpCrisEndpoint,
  NotificationService,
  RestoreUsersCommand,
  SelectFilter,
  SimpleUserMessage,
  SwitchFilter,
  Table,
  TableAction,
  TableCellContext,
  TableColumn,
  UserForm,
  UserMessageLevel,
  UserService,
  WorkspaceUser
} from '@local/ck-gen';
import { locales } from '@local/ck-gen/ts-locales/locales';

@Component( {
  selector: 'ck-users-tab',
  templateUrl: './users-tab.html',
  imports: [TranslateModule, Table, NzModalModule, NzTagModule]
} )
export class UsersTab implements OnInit, AfterViewInit {
  readonly tableComponent = viewChild<Table<WorkspaceUser>>( 'table' );
  readonly roleCellTemplate = viewChild.required<TemplateRef<TableCellContext<WorkspaceUser>>>( 'roleCellTemplate' );

  readonly workspace = input<GroupInfos>();
  readonly actionsChanged = output<ActionBarContent<WorkspaceUser>>();
  readonly filtersChanged = output<Array<Filter<unknown>>>();
  readonly invitationCreated = output<void>();

  // <PreDependencyInjection revert />
  readonly #translateService = inject( TranslateService );
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #userService = inject( UserService );
  readonly #notifService = inject( NotificationService );
  readonly #nzModalService = inject( NzModalService );
  readonly #destroyRef = inject( DestroyRef );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  protected isLoading: WritableSignal<boolean> = signal( false );
  protected users: WritableSignal<Array<WorkspaceUser>> = signal( [] );
  protected columns: Array<TableColumn<WorkspaceUser>> = [];
  protected rowActions: Array<TableAction<WorkspaceUser>> = [];
  protected pageSize: number = 10;
  protected selectedUsers: Array<WorkspaceUser> = [];
  #allUsers: Array<WorkspaceUser> = [];
  #filters: Array<Filter<unknown>> = [];
  #currentFilters: Array<Filter<unknown>> = [];
  #roleFilter!: SelectFilter<'admin' | 'member'>;
  #archivedFilter!: SwitchFilter;
  // <PostLocalVariables />

  async ngOnInit(): Promise<void> {
    this.initFilters();
    this.filtersChanged.emit( this.#filters );

    this.#translateService.onLangChange
      .pipe( takeUntilDestroyed( this.#destroyRef ) )
      .subscribe( () => this.#refreshLabels() );

    await this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.#refreshLabels();
  }

  #refreshLabels(): void {
    this.#translateService.get( [
      'CK.Admin.UserManagement.User.UserName',
      'CK.Admin.UserManagement.User.FirstName',
      'CK.Admin.UserManagement.User.LastName',
      'CK.Admin.UserManagement.Column.Role',
      'CK.Admin.UserManagement.Filter.Role',
      'CK.Admin.UserManagement.Filter.SelectRole',
      'CK.Admin.UserManagement.Filter.ShowArchived',
      'CK.Admin.UserManagement.Role.Administrator',
      'CK.Admin.UserManagement.Role.Member',
      'Button.Create',
      'Button.Edit',
      'Button.Delete',
      'Button.Restore',
      'Button.Refresh'
    ] ).pipe( first() ).subscribe( t => {
      this.initColumns( t );
      this.initActions( t );
      this.initRowActions( t );
      this.#refreshFilterLabels( t );
    } );
  }

  #refreshFilterLabels( t: Record<string, string> ): void {
    this.#roleFilter.label = t['CK.Admin.UserManagement.Filter.Role'];
    this.#roleFilter.placeholder = t['CK.Admin.UserManagement.Filter.SelectRole'];
    this.#roleFilter.options[0].label = t['CK.Admin.UserManagement.Role.Administrator'];
    this.#roleFilter.options[1].label = t['CK.Admin.UserManagement.Role.Member'];
    this.#archivedFilter.label = t['CK.Admin.UserManagement.Filter.ShowArchived'];
  }

  async loadUsers(): Promise<void> {
    try {
      this.isLoading.set( true );
      const res = await this.#crisEndpoint.sendOrThrowAsync( new GetWorkspaceUsersQCommand() );
      if ( res ) {
        this.#allUsers = [...res];
        this.users.set( [...res] );
      }

      this.tableComponent()?.clearSelection();
      this.applyFilters( this.#currentFilters );
    } catch {
      this.#notifService.notifyUserMessage( { level: UserMessageLevel.Error, message: this.#translateService.instant( 'CK.Admin.UserManagement.Data.ErrorWhileLoading' ) } as SimpleUserMessage );
    } finally {
      this.isLoading.set( false );
    }
  }

  applyFilters( f: Array<Filter<unknown>> ): void {
    this.#currentFilters = [...f];
    let result = [...this.#allUsers];

    if ( f.includes( this.#roleFilter ) ) {
      const values = ( this.#roleFilter.value as Array<'admin' | 'member'> | undefined ) ?? [];
      if ( values.length > 0 ) {
        result = result.filter( u => values.includes( u.isWorkspaceAdmin ? 'admin' : 'member' ) );
      }
    }

    if ( f.includes( this.#archivedFilter ) ) {
      result = this.#archivedFilter.value
        ? result.filter( u => !!u.binDate )
        : result.filter( u => !u.binDate );
    } else {
      // default: hide archived users when the filter is inactive
      result = result.filter( u => !u.binDate );
    }

    this.users.set( result );
  }

  onFiltersCleared(): void {
    this.users.set( [...this.#allUsers] );
  }

  onSearch( searchString: string ): void {
    this.users.set( [...this.#allUsers] );
    this.applyFilters( this.#currentFilters );
    const s = searchString.toLocaleLowerCase();
    this.users.set( this.users().filter( u =>
      u.userName.toLocaleLowerCase().startsWith( s ) ||
      u.firstName.toLocaleLowerCase().startsWith( s ) ||
      u.lastName.toLocaleLowerCase().startsWith( s )
    ) );
  }

  onTableSelection( users: Array<WorkspaceUser> ): void {
    this.selectedUsers = [...users];
  }

  getTotalCount(): number {
    return this.#allUsers.length;
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
          reset: () => this.applyFilters( this.#currentFilters ),
          search: ( s: string ) => {
            this.applyFilters( this.#currentFilters );
            this.users.set( this.users().filter( u => u.userName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
          }
        }
      },
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
          reset: () => this.applyFilters( this.#currentFilters ),
          search: ( s: string ) => {
            this.applyFilters( this.#currentFilters );
            this.users.set( this.users().filter( u => u.firstName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
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
          reset: () => this.applyFilters( this.#currentFilters ),
          search: ( s: string ) => {
            this.applyFilters( this.#currentFilters );
            this.users.set( this.users().filter( u => u.lastName.trim().toLowerCase().includes( s.trim().toLowerCase() ) ) );
          }
        }
      },
      {
        name: 'isWorkspaceAdmin',
        displayedName: t['CK.Admin.UserManagement.Column.Role'],
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: WorkspaceUser, b: WorkspaceUser ) => a.isWorkspaceAdmin === b.isWorkspaceAdmin ? 0 : a.isWorkspaceAdmin ? -1 : 1,
        template: this.roleCellTemplate()
      },
    ];
    // </UsersTabColumnsRegistration>
  }

  initFilters(): void {
    this.#roleFilter = new SelectFilter<'admin' | 'member'>(
      'multiple',
      this.#translateService.instant( 'CK.Admin.UserManagement.Filter.Role' ),
      [
        { label: this.#translateService.instant( 'CK.Admin.UserManagement.Role.Administrator' ), value: 'admin' },
        { label: this.#translateService.instant( 'CK.Admin.UserManagement.Role.Member' ), value: 'member' }
      ],
      {
        defaultValue: [],
        placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.Filter.SelectRole' )
      }
    );
    this.#archivedFilter = new SwitchFilter(
      this.#translateService.instant( 'CK.Admin.UserManagement.Filter.ShowArchived' ),
      false,
      false
    );
    this.#filters = [this.#roleFilter, this.#archivedFilter];
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
    this.actionsChanged.emit( actions );
  }

  initRowActions( t: Record<string, string> ): void {
    // <UsersTabRowActionsRegistration>
    this.rowActions = [
      {
        name: 'edit',
        icon: faEdit,
        isDanger: false,
        type: 'text',
        tooltip: t['Button.Edit'],
        execute: ( u: WorkspaceUser ) => { void this.openUserEditModal( u ); },
        shouldBeDisplayed: () => true
      },
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
      }
    ];
    // </UsersTabRowActionsRegistration>
  }

  confirmArchiveUsers( users: Array<WorkspaceUser> ): void {
    if ( users.length === 0 ) return;
    const opts: ModalOptions = {
      nzTitle: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ArchiveUsers' )} : ${users.map( i => i.userName ).join( ' ,' )} ?`,
      nzOnOk: async () => {
        const res = await this.#crisEndpoint.sendOrThrowAsync( new ArchiveUsersCommand( users.map( i => i.userId ), undefined, this.#userService.userProfile()!.userId ) );
        this.#notifService.notifyUserMessage( res );
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
        const res = await this.#crisEndpoint.sendOrThrowAsync( new RestoreUsersCommand( users.map( i => i.userId ), undefined, this.#userService.userProfile()!.userId ) );
        this.#notifService.notifyUserMessage( res );
        this.isLoading.set( true );
        await this.loadUsers();
      }
    };
    this.#nzModalService.confirm( opts );
  }

  async openCreateUserModal(): Promise<void> {
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
        const createRes = await this.#crisEndpoint.sendOrThrowAsync(
          new CreateInvitationCommand( v.email, v.groups, v.cultureName )
        );
        this.#notifService.notifyUserMessage( createRes );
        await this.loadUsers();
        this.invitationCreated.emit();
        return undefined;
      }
    };
    this.#nzModalService.create( opts );
  }

  async openUserEditModal( user: WorkspaceUser = this.selectedUsers[0] ): Promise<void> {
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
        email: new FormControlConfig( 'text',
          this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
          user.userName,
          {
            placeholder: this.#translateService.instant( 'CK.Admin.UserManagement.User.Email' ),
            required: true,
            validators: [Validators.required, Validators.email],
            errorMessages: { email: this.#translateService.instant( 'CK.Admin.UserManagement.Form.InvalidEmail' ) }
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
        const res = await this.#crisEndpoint.sendOrThrowAsync(
          new EditWorkspaceUserCommand(
            user.userId,
            v.firstName,
            v.lastName,
            v.email,
            v.cultureName,
            v.groups,
            v.password ?? undefined
          )
        );
        this.#notifService.notifyUserMessage( res );
        await this.loadUsers();
        return undefined;
      }
    };

    this.#nzModalService.create( opts );
  }
}
