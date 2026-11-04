import { ApplicationRef, DebugElement, getDebugNode, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { NzDatePickerComponent } from 'ng-zorro-antd/date-picker';
import { NzModalService } from 'ng-zorro-antd/modal';
import {
  AuthLevel,
  BanUserForm,
  GetWorkspaceUsersQCommand,
  GroupInfos,
  HttpCrisEndpoint,
  NgAuthService,
  NotificationService,
  UsersTab,
  UserService,
  WorkspaceUser
} from '@local/ck-gen';
import { appConfig } from './app.config';

const workspace = new GroupInfos( 3, 'AdminZone', true, 0, '' );
const now = Date.UTC( 2031, 0, 15, 10, 30, 45, 500 );

// Opened through UsersTab.confirmBanUsers: the reason field and its rules come from the UserBanned transformer.
describe( 'ck-ban-user-form', () => {
  let tab: ComponentFixture<UsersTab>;
  let translate: TranslateService;
  let form: BanUserForm;
  let host: HTMLElement;

  const render = async () => {
    const appRef = TestBed.inject( ApplicationRef );
    appRef.tick();
    await tab.whenStable();
    appRef.tick();
  };
  const itemOf = ( labelKey: string ) => Array.from( host.querySelectorAll( 'nz-form-item' ) )
    .find( i => i.querySelector( 'nz-form-label' )?.textContent?.trim() === translate.instant( labelKey ) );
  // Messages show as text under the control, one span per message.
  const errorsOf = ( labelKey: string ) => Array.from( itemOf( labelKey )!.querySelectorAll( '.form-control-error' ) )
    .map( e => e.textContent?.trim() );
  const typeReason = async ( text: string ) => {
    const input = itemOf( 'CK.Admin.UserManagement.Ban.KeyReason' )!.querySelector( 'input' ) as HTMLInputElement;
    input.value = text;
    input.dispatchEvent( new Event( 'input' ) );
    input.dispatchEvent( new Event( 'blur' ) );
    await render();
  };
  const chooseDuration = async ( labelKey: string ) => {
    itemOf( 'CK.Admin.UserManagement.Ban.Duration' )!.querySelector<HTMLElement>( '.ant-select-selector' )!.click();
    await render();
    Array.from( document.querySelectorAll<HTMLElement>( 'nz-option-item' ) )
      .find( o => o.textContent?.includes( translate.instant( labelKey ) ) )!
      .click();
    await render();
  };

  // Writes through the picker's registered change callback, the one [formField] hooks into, as a chosen date does.
  const pickEndDate = async ( date: Date ) => {
    const picker = ( getDebugNode( host.querySelector( 'nz-date-picker' )! ) as DebugElement ).componentInstance as NzDatePickerComponent;
    ( picker as unknown as { onChangeFn: ( v: Date | null ) => void } ).onChangeFn( date );
    await render();
  };

  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      providers: [
        ...appConfig.providers,
        { provide: UserService, useValue: { userProfile: signal( undefined ) } },
        // Banning requires the Critical level (a recent login).
        { provide: NgAuthService, useValue: { level: signal( AuthLevel.Critical ) } },
        {
          provide: HttpCrisEndpoint,
          useValue: {
            ambientValuesOverride: {},
            sendOrThrowAsync: jest.fn( async ( cmd: unknown ) => cmd instanceof GetWorkspaceUsersQCommand ? [] : undefined ),
            updateAmbientValuesAsync: jest.fn().mockResolvedValue( undefined ),
            // The AuthService of the Cris authentication hooks the endpoint and refreshes its session through sendAsync:
            // with no result, it stays anonymous.
            addHook: jest.fn(),
            sendAsync: jest.fn().mockResolvedValue( {} )
          }
        },
        { provide: NotificationService, useValue: { notifyUserMessage: jest.fn() } }
      ],
      imports: [UsersTab]
    } ).compileComponents();
    translate = TestBed.inject( TranslateService );
    await firstValueFrom( translate.use( 'en' ) );
    tab = TestBed.createComponent( UsersTab );
    tab.componentRef.setInput( 'workspace', workspace );
    tab.componentInstance.confirmBanUsers( [{ userId: 7, userName: 'jdoe' } as WorkspaceUser] );
    const modal = tab.componentRef.injector.get( NzModalService ).openModals[0];
    form = modal.getContentComponent() as BanUserForm;
    host = modal.getElement();
    // The end-date template is a view child: the field definitions see it only after the first change detection.
    await render();
    await render();
  } );

  afterEach( () => jest.restoreAllMocks() );

  it( 'spaces-only reason shows CK.Admin.UserManagement.Ban.ReasonRequired', async () => {
    await typeReason( '   ' );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.KeyReason' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.ReasonRequired' )] );
  } );

  it( 'empty reason shows ReasonRequired once, not twice', async () => {
    await typeReason( '' );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.KeyReason' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.ReasonRequired' )] );
  } );

  it( '129 characters shows ReasonTooLong', async () => {
    await typeReason( 'a'.repeat( 129 ) );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.KeyReason' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.ReasonTooLong' )] );
  } );

  it( 'a % shows ReasonInvalidChars', async () => {
    await typeReason( 'Fraud 100%' );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.KeyReason' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.ReasonInvalidChars' )] );
  } );

  it( 'eternal gives no end date', async () => {
    await typeReason( 'Fraud' );

    expect( itemOf( 'CK.Admin.UserManagement.Ban.EndDate' ) ).toBeUndefined();
    expect( form.valid ).toBe( true );
    expect( form.getValue() ).toEqual( { keyReason: 'Fraud', banEndDate: undefined } );
  } );

  it( 'day gives now + 1 day at the minute', async () => {
    // A frozen clock makes the expected minute exact whenever the test runs.
    jest.spyOn( Date, 'now' ).mockReturnValue( now );
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationDay' );

    expect( form.valid ).toBe( true );
    expect( form.getValue().banEndDate?.toISO() ).toBe( '2031-01-16T10:30:00.000Z' );
  } );

  it( 'custom without date shows EndDateRequired after showErrors', async () => {
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationCustom' );

    expect( form.valid ).toBe( false );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.EndDate' ) ).toEqual( [] );

    form.showErrors();
    await render();

    expect( errorsOf( 'CK.Admin.UserManagement.Ban.EndDate' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.EndDateRequired' )] );
  } );

  it( 'custom in the past shows EndDatePast', async () => {
    const clock = jest.spyOn( Date, 'now' ).mockReturnValue( now );
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationCustom' );
    // Picked one minute ahead, then confirmed once that minute has passed.
    form.banForm.model.update( m => ( { ...m, customEndDate: new Date( now + 60_000 ) } ) );
    await render();
    expect( form.valid ).toBe( true );

    clock.mockReturnValue( now + 120_000 );

    expect( form.valid ).toBe( false );
    form.showErrors();
    await render();
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.EndDate' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.EndDatePast' )] );
  } );

  it( 'custom gives the picked end date at the minute', async () => {
    jest.spyOn( Date, 'now' ).mockReturnValue( now );
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationCustom' );
    // Non-zero seconds: the end date is expected at the minute.
    await pickEndDate( new Date( Date.UTC( 2031, 0, 15, 13, 42, 17 ) ) );

    expect( form.valid ).toBe( true );
    expect( form.getValue().banEndDate?.toISO() ).toBe( '2031-01-15T13:42:00.000Z' );
  } );

  it( 'leaving the end-date picker empty shows EndDateRequired', async () => {
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationCustom' );
    expect( errorsOf( 'CK.Admin.UserManagement.Ban.EndDate' ) ).toEqual( [] );

    host.querySelector( 'nz-date-picker input' )!.dispatchEvent( new Event( 'focusout', { bubbles: true } ) );
    await render();

    expect( errorsOf( 'CK.Admin.UserManagement.Ban.EndDate' ) )
      .toEqual( [translate.instant( 'CK.Admin.UserManagement.Ban.EndDateRequired' )] );
  } );

  it( 'back to a preset after a custom date expired, the ban can be confirmed', async () => {
    const clock = jest.spyOn( Date, 'now' ).mockReturnValue( now );
    await typeReason( 'Fraud' );
    await chooseDuration( 'CK.Admin.UserManagement.Ban.DurationCustom' );
    await pickEndDate( new Date( now + 60_000 ) );
    clock.mockReturnValue( now + 120_000 );
    expect( form.valid ).toBe( false );

    await chooseDuration( 'CK.Admin.UserManagement.Ban.Eternal' );

    expect( form.valid ).toBe( true );
    expect( form.getValue().banEndDate ).toBeUndefined();
  } );

  it( 'getValue trims the reason', async () => {
    await typeReason( '  Fraud  ' );

    expect( form.getValue().keyReason ).toBe( 'Fraud' );
  } );
} );
