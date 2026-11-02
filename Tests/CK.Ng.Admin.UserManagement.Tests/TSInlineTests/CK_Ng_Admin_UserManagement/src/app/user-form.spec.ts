import { ApplicationRef, DebugElement, Provider, Type, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { required } from '@angular/forms/signals';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { NZ_MODAL_DATA, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import {
  GenericFields,
  GetWorkspaceInvitationDataQCommand,
  GetWorkspaceUsersQCommand,
  GroupInfos,
  HttpCrisEndpoint,
  NotificationService,
  selectField,
  UserForm,
  UsersTab,
  UserService,
  WorkspaceInvitationData
} from '@local/ck-gen';
import { locales } from '@local/ck-gen/ts-locales/locales';
import { appConfig } from './app.config';

const languages = Object.values( locales );

const platformZone = new GroupInfos( 10, 'Platform Zone', true, 0, '' );
// What GetWorkspaceInvitationDataQCommand returns: the opener adds the workspace group itself.
const invitedGroups = [
  new GroupInfos( 11, 'Administrators', false, 10, 'Platform Zone' ),
  new GroupInfos( 12, 'Warehouse A', false, 10, 'Platform Zone' ),
  new GroupInfos( 13, 'Administrators', false, 12, 'Warehouse A' )
];
const hierarchy = [platformZone, ...invitedGroups];
const twoOrgs = [
  ...hierarchy,
  new GroupInfos( 20, 'Other Org', true, 0, '' ),
  new GroupInfos( 21, 'Administrators', false, 20, 'Other Org' )
];
// No 'Platform Zone': ngOnInit still looks up the Administrators group of every org and child, so each has one.
const noPlatformZone = [
  new GroupInfos( 1, 'Lyon', false, 3, 'AdminZone' ),
  new GroupInfos( 3, 'AdminZone', true, 0, '' ),
  new GroupInfos( 4, 'Administrators', false, 3, 'AdminZone' ),
  new GroupInfos( 5, 'Administrators', false, 1, 'Lyon' )
];

const member = 'CK.Admin.UserManagement.Role.Member';
const administrator = 'CK.Admin.UserManagement.Role.Administrator';
const orgBoxes = '.groups > .group-choices';
const warehouseBoxes = '.warehouse-groups .group-choices';

describe( 'ck-user-form', () => {
  let translate: TranslateService;
  let form: UserForm;
  let host: HTMLElement;
  let render: () => Promise<void>;

  const itemOf = ( labelKey: string ) => Array.from( host.querySelectorAll( 'nz-form-item' ) )
    .find( i => i.querySelector( 'nz-form-label' )?.textContent?.trim() === translate.instant( labelKey ) );
  // Messages show as text under the control, one span per message.
  const errorsOf = ( labelKey: string ) => Array.from( itemOf( labelKey )!.querySelectorAll( '.form-control-error' ) )
    .map( e => e.textContent?.trim() );
  const typeEmail = async ( text: string ) => {
    const input = itemOf( 'CK.Admin.UserManagement.User.Email' )!.querySelector( 'input' ) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent( new Event( 'input' ) );
    input.dispatchEvent( new Event( 'blur' ) );
    await render();
  };
  const groupsField = () => form.userForm.form['groups']();
  const boxOf = ( scope: string, roleKey: string ) => Array.from( host.querySelectorAll<HTMLElement>( `${scope} label[nz-checkbox]` ) )
    .find( l => l.textContent?.trim() === translate.instant( roleKey ) )!;
  // The inner input covers the whole square: it is the element a user hits.
  const clickBox = async ( scope: string, roleKey: string ) => {
    boxOf( scope, roleKey ).querySelector<HTMLInputElement>( 'input.ant-checkbox-input' )!.click();
    await render();
  };
  const isTicked = ( scope: string, roleKey: string ) => {
    const box = boxOf( scope, roleKey );
    return box.classList.contains( 'ant-checkbox-wrapper-checked' ) && box.querySelector<HTMLInputElement>( 'input' )!.checked;
  };
  const chooseOrg = async ( groupName: string ) => {
    host.querySelector<HTMLElement>( '.org-select .ant-select-selector' )!.click();
    await render();
    Array.from( document.querySelectorAll<HTMLElement>( 'nz-option-item' ) )
      .find( o => o.textContent?.includes( groupName ) )!
      .click();
    await render();
  };

  const configure = async ( extra: Provider[], imports: Type<unknown>[], send: jest.Mock = jest.fn() ) => {
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

  // The form alone, with the opener's data given directly and no e-mail field: for the groups behaviour.
  let fixture: ComponentFixture<UserForm>;
  const open = async ( groupInfos: GroupInfos[] ) => {
    const fields: GenericFields = {
      cultureName: selectField( 'CK.Admin.UserManagement.Form.DefaultLanguage', languages[0]?.name ?? 'fr',
        { options: languages.map( l => ( { label: l.nativeName, value: l.name } ) ), rules: p => required( p ) } )
    };
    await configure( [{ provide: NZ_MODAL_DATA, useValue: { groupInfos, languages, fields } }], [UserForm] );
    fixture = TestBed.createComponent( UserForm );
    form = fixture.componentInstance;
    host = fixture.nativeElement;
    render = async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    // The groups template reaches the form once its view query resolves, after the first render.
    await render();
    await render();
  };

  // The create modal of UsersTab: the UserInvitation transformer swaps the opener in ngOnInit and supplies the e-mail field.
  const openThroughTab = async () => {
    const send = jest.fn( async ( cmd: unknown ) => {
      if ( cmd instanceof GetWorkspaceInvitationDataQCommand ) return new WorkspaceInvitationData( [], invitedGroups );
      if ( cmd instanceof GetWorkspaceUsersQCommand ) return [];
      return undefined;
    } );
    await configure( [], [UsersTab], send );
    const tab = TestBed.createComponent( UsersTab );
    tab.componentRef.setInput( 'workspace', platformZone );
    const appRef = TestBed.inject( ApplicationRef );
    render = async () => {
      appRef.tick();
      await tab.whenStable();
      appRef.tick();
    };
    await render();
    // openCreateUserModal is protected: the action bar calls it.
    await ( tab.componentInstance as any ).openCreateUserModal();
    const modal = tab.componentRef.injector.get( NzModalService ).openModals[0];
    form = modal.getContentComponent() as UserForm;
    host = modal.getElement();
    await render();
    await render();
  };

  it( 'invalid e-mail blocks validity', async () => {
    await openThroughTab();
    await clickBox( orgBoxes, member );
    await typeEmail( 'anne@example.com' );
    expect( form.valid ).toBe( true );

    await typeEmail( 'anne' );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.User.Email' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Form.InvalidEmail' )] );
  } );

  it( 'empty e-mail blocks validity', async () => {
    await openThroughTab();
    await clickBox( orgBoxes, member );
    await typeEmail( 'anne@example.com' );
    expect( form.valid ).toBe( true );

    await typeEmail( '' );

    expect( form.valid ).toBe( false );
  } );

  it( 'getValue merges e-mail, culture and groups', async () => {
    await openThroughTab();
    await typeEmail( 'anne@example.com' );
    await clickBox( orgBoxes, member );

    expect( form.getValue() ).toEqual( {
      email: 'anne@example.com',
      cultureName: 'en',
      groups: [10]
    } );
  } );

  it( 'no group ticked blocks validity and shows GroupsRequired once touched', async () => {
    await open( hierarchy );
    expect( errorsOf( 'CK.Admin.UserManagement.Form.Groups' ) ).toEqual( [] );

    await clickBox( orgBoxes, member );
    await clickBox( orgBoxes, member );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Form.Groups' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Form.GroupsRequired' )] );
  } );

  it.each<[string, string, string, number]>( [
    ['member of the org', orgBoxes, member, 10],
    ['administrator of the org', orgBoxes, administrator, 11],
    ['member of the warehouse', warehouseBoxes, member, 12],
    ['administrator of the warehouse', warehouseBoxes, administrator, 13]
  ] )( 'a click on the box of the %s adds its group once and touches the field', async ( _name, scope, role, id ) => {
    await open( hierarchy );
    expect( groupsField().touched() ).toBe( false );

    await clickBox( scope, role );

    expect( form.getValue().groups ).toEqual( [id] );
    expect( groupsField().touched() ).toBe( true );
  } );

  it( 'ticking member then administrator of an org yields both ids', async () => {
    await open( hierarchy );

    await clickBox( orgBoxes, member );
    await clickBox( orgBoxes, administrator );

    expect( form.getValue().groups ).toEqual( [10, 11] );
  } );

  it( 'a warehouse administrator tick and the groups agree after switching org and back', async () => {
    await open( twoOrgs );
    await clickBox( warehouseBoxes, administrator );

    await chooseOrg( 'Other Org' );
    await chooseOrg( 'Platform Zone' );

    expect( isTicked( warehouseBoxes, administrator ) ).toBe( true );
    expect( form.getValue().groups ).toEqual( [13] );

    await clickBox( warehouseBoxes, administrator );

    expect( isTicked( warehouseBoxes, administrator ) ).toBe( false );
    expect( form.getValue().groups ).toEqual( [] );
  } );

  it( "fallback picker used when no group is named 'Platform Zone'", async () => {
    await open( noPlatformZone );

    const groupsItem = itemOf( 'CK.Admin.UserManagement.Form.Groups' )!;
    expect( groupsItem.querySelector( '.groups' ) ).toBeNull();
    const picker: DebugElement = fixture.debugElement.query( By.css( 'ck-user-workspace-group-picker' ) );
    expect( picker ).not.toBeNull();

    // Writes through the select's registered change callback, the one the picker's ngModel hooks into, as a picked option does.
    const select = picker.query( By.directive( NzSelectComponent ) ).componentInstance as NzSelectComponent;
    ( select as unknown as { onChange: ( v: number[] ) => void } ).onChange( [1] );
    await render();

    expect( form.getValue().groups ).toEqual( [1] );
  } );
} );
