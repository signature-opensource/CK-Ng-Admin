import { ApplicationRef, Provider, Type, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { required } from '@angular/forms/signals';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { NZ_MODAL_DATA, NzModalService, NzModalState } from 'ng-zorro-antd/modal';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import {
  CreateWorkspaceUserCommand,
  EditUserForm,
  EditWorkspaceUserData,
  GenericFields,
  GetWorkspaceUserEditDataQCommand,
  GetWorkspaceUsersQCommand,
  GroupInfos,
  HttpCrisEndpoint,
  NotificationService,
  selectField,
  textField,
  UsersTab,
  UserService
} from '@local/ck-gen';
import { appConfig } from './app.config';

type ModalUser = { userId: number, userName: string, firstName: string, lastName: string };

const workspace = new GroupInfos( 3, 'AdminZone', true, 0, '' );
const lyon = new GroupInfos( 1, 'Lyon', false, 3, 'AdminZone' );
const paris = new GroupInfos( 2, 'Paris', false, 3, 'AdminZone' );

// The scalar fields an opener passes in NZ_MODAL_DATA, as UsersTab builds them.
const scalarFields = ( user: ModalUser ): GenericFields => ( {
  firstName: textField( 'CK.Admin.UserManagement.User.FirstName', user.firstName, { rules: p => required( p ) } ),
  lastName: textField( 'CK.Admin.UserManagement.User.LastName', user.lastName, { rules: p => required( p ) } ),
  userName: textField( 'CK.Admin.UserManagement.User.UserName', user.userName, { rules: p => required( p ) } ),
  cultureName: selectField( 'CK.Admin.UserManagement.Form.DefaultLanguage', 'en', {
    options: [{ label: 'English', value: 'en' }],
    rules: p => required( p )
  } )
} );

let send: jest.Mock;
let userGroups: GroupInfos[];
let translate: TranslateService;

const setUp = async ( extra: Provider[], imports: Type<unknown>[] ) => {
  send = jest.fn( async ( cmd: unknown ) => {
    if ( cmd instanceof GetWorkspaceUserEditDataQCommand ) {
      return new EditWorkspaceUserData( userGroups, [lyon, paris] );
    }
    if ( cmd instanceof GetWorkspaceUsersQCommand ) {
      return [];
    }
    return undefined;
  } );
  await TestBed.configureTestingModule( {
    providers: [
      ...appConfig.providers,
      { provide: UserService, useValue: { userProfile: signal( undefined ) } },
      { provide: HttpCrisEndpoint, useValue: { sendOrThrowAsync: send, updateAmbientValuesAsync: jest.fn().mockResolvedValue( undefined ) } },
      { provide: NotificationService, useValue: { notifyUserMessage: jest.fn() } },
      ...extra
    ],
    imports
  } ).compileComponents();
  translate = TestBed.inject( TranslateService );
  await firstValueFrom( translate.use( 'en' ) );
};

describe( 'ck-edit-user-form', () => {
  let fixture: ComponentFixture<EditUserForm>;

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const itemOf = ( labelKey: string ) => Array.from( host().querySelectorAll( 'nz-form-item' ) )
    .find( i => i.querySelector( 'nz-form-label' )?.textContent?.trim() === translate.instant( labelKey ) );
  const inputOf = ( labelKey: string ) => itemOf( labelKey )!.querySelector( 'input' ) as HTMLInputElement;
  // Messages show as nz-form-control error tips, one div per message.
  const errorsOf = ( labelKey: string ) => Array.from( itemOf( labelKey )!.querySelectorAll( '.ant-form-item-explain-error div' ) )
    .map( e => e.textContent?.trim() );
  const type = async ( input: HTMLInputElement, text: string ) => {
    input.value = text;
    input.dispatchEvent( new Event( 'input' ) );
    input.dispatchEvent( new Event( 'blur' ) );
    await render();
  };
  // The culture select comes first: group queries go through the picker.
  const picker = () => fixture.debugElement.query( By.css( 'ck-user-workspace-group-picker' ) );
  // A click on the select toggles its dropdown, which stays open after an option click in multiple mode.
  const tick = async ( groupName: string ) => {
    const select = ( picker().nativeElement as HTMLElement ).querySelector<HTMLElement>( 'nz-select' )!;
    if ( !select.classList.contains( 'ant-select-open' ) ) {
      select.querySelector<HTMLElement>( '.ant-select-selector' )!.click();
      await render();
    }
    Array.from( document.querySelectorAll<HTMLElement>( 'nz-option-item' ) )
      .find( o => o.textContent?.includes( groupName ) )!
      .click();
    await render();
  };
  const open = async ( user: ModalUser, groupsOfUser: GroupInfos[] ) => {
    userGroups = groupsOfUser;
    await setUp( [{ provide: NZ_MODAL_DATA, useValue: { user, workspace, fields: scalarFields( user ) } }], [EditUserForm] );
    fixture = TestBed.createComponent( EditUserForm );
    // The groups arrive from the server after the first render.
    await render();
    await render();
  };
  const openCreate = () => open( { userId: 0, userName: '', firstName: '', lastName: '' }, [] );
  const openEdit = () => open( { userId: 7, userName: 'amartin', firstName: 'Anne', lastName: 'Martin' }, [paris] );
  const fillNames = async () => {
    await type( inputOf( 'CK.Admin.UserManagement.User.FirstName' ), 'Anne' );
    await type( inputOf( 'CK.Admin.UserManagement.User.LastName' ), 'Martin' );
    await type( inputOf( 'CK.Admin.UserManagement.User.UserName' ), 'amartin' );
  };

  it( 'create: invalid with no group ticked', async () => {
    await openCreate();
    await fillNames();

    expect( fixture.componentInstance.valid ).toBe( false );
  } );

  it( 'create: valid once names, user name and one group are set', async () => {
    await openCreate();
    await fillNames();
    await tick( 'Paris' );

    expect( fixture.componentInstance.valid ).toBe( true );
  } );

  it( 'create: password prefilled, regenerate changes it, strength meter shown', async () => {
    await openCreate();
    const prefilled = inputOf( 'CK.Admin.UserManagement.User.Password' ).value;
    expect( prefilled ).not.toBe( '' );

    itemOf( 'CK.Admin.UserManagement.User.Password' )!.querySelector<HTMLButtonElement>( 'button.password-refresh' )!.click();
    await render();

    expect( inputOf( 'CK.Admin.UserManagement.User.Password' ).value ).not.toBe( prefilled );
    expect( itemOf( 'CK.Admin.UserManagement.User.Password' )!.querySelector( 'ck-password-strength' ) ).not.toBeNull();
  } );

  it( 'create: empty password shows CK.Admin.UserManagement.User.PasswordRequired', async () => {
    await openCreate();

    await type( inputOf( 'CK.Admin.UserManagement.User.Password' ), '' );

    expect( errorsOf( 'CK.Admin.UserManagement.User.Password' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.User.PasswordRequired' )] );
  } );

  it( 'create: no group ticked after touching the picker shows CK.Admin.UserManagement.Form.GroupsRequired', async () => {
    await openCreate();
    expect( errorsOf( 'CK.Admin.UserManagement.Form.Groups' ) ).toEqual( [] );

    picker().query( By.directive( NzSelectComponent ) ).triggerEventHandler( 'nzBlur' );
    await render();

    expect( errorsOf( 'CK.Admin.UserManagement.Form.Groups' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Form.GroupsRequired' )] );
  } );

  it( 'edit: no password field, groups preloaded from the server', async () => {
    await openEdit();

    expect( itemOf( 'CK.Admin.UserManagement.User.Password' ) ).toBeUndefined();
    const member = translate.instant( 'CK.Admin.UserManagement.Role.Member' );
    const tags = Array.from( itemOf( 'CK.Admin.UserManagement.Form.Groups' )!.querySelectorAll( 'nz-select-item' ) )
      .map( t => t.getAttribute( 'title' ) );
    expect( tags ).toEqual( [`Paris - ${member}`] );
  } );

  it( 'getValue merges scalar fields and groups', async () => {
    await openEdit();
    await type( inputOf( 'CK.Admin.UserManagement.User.FirstName' ), 'Annie' );

    expect( fixture.componentInstance.getValue() ).toEqual( {
      firstName: 'Annie',
      lastName: 'Martin',
      userName: 'amartin',
      cultureName: 'en',
      groups: [2]
    } );
  } );
} );

describe( 'ck-users-tab create user modal', () => {
  beforeEach( async () => {
    userGroups = [];
    await setUp( [], [UsersTab] );
  } );

  it( 'an invalid OK rejects silently', async () => {
    const tab = TestBed.createComponent( UsersTab );
    tab.componentRef.setInput( 'workspace', workspace );
    const appRef = TestBed.inject( ApplicationRef );
    const settle = async () => {
      appRef.tick();
      await tab.whenStable();
      appRef.tick();
    };
    // Opened before the first change detection: UserInvitation, composed in this app, swaps the
    // opener in ngOnInit. openCreateUserModal is protected: the action bar calls it.
    await ( tab.componentInstance as any ).openCreateUserModal();
    const modal = tab.componentRef.injector.get( NzModalService ).openModals[0];
    await settle();
    const form = document.querySelector( 'ck-edit-user-form' )!;
    expect( form ).not.toBeNull();

    await modal.triggerOk().catch( () => undefined );
    await settle();

    expect( modal.getState() ).toBe( NzModalState.OPEN );
    expect( send.mock.calls.some( ( [cmd] ) => cmd instanceof CreateWorkspaceUserCommand ) ).toBe( false );
    expect( form.querySelectorAll( '.ant-form-item-explain-error' ).length ).toBe( 0 );
  } );
} );
