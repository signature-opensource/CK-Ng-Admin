import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { fr_FR } from 'ng-zorro-antd/i18n';
import {
  CompleteRegistrationCommand,
  HttpCrisEndpoint,
  NotificationService,
  PendingUser,
  Register,
  SimpleUserMessage,
  UserMessageLevel,
  ValidateInvitationTokenCommand,
  ValidateInvitationTokenResult
} from '@local/ck-gen';
import { LocaleService, locales } from '@local/ck-gen/ts-locales/locales';
import { appConfig } from './app.config';

// The test app ships English only: a French locale gives the language select a real choice.
const FR_ID = 1036;
locales['fr'] = { name: 'fr', nativeName: 'Français', englishName: 'French', id: FR_ID, ngxTranslate: 'fr', zorro: fr_FR };
const EN_ID = locales['en'].id;

const TOKEN = 'invitation-token';
const EMAIL = 'invitee@example.com';
const STRONG = 'Abcdefg1!';

// GenericForm renders one nz-form-item per field, in definition order.
const EMAIL_ITEM = 0;
const USER_NAME_ITEM = 1;
const FIRST_NAME_ITEM = 2;
const LAST_NAME_ITEM = 3;
const CULTURE_ITEM = 4;
const PASSWORD_ITEM = 5;
const CONFIRM_ITEM = 6;

describe( 'ck-register', () => {
  let fixture: ComponentFixture<Register>;
  let send: jest.Mock;
  let completeReply: () => Promise<SimpleUserMessage | undefined>;
  let notifyUserMessage: jest.Mock;
  let navigate: jest.SpyInstance;
  let setLocale: jest.SpyInstance;
  let translate: TranslateService;

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const item = ( index: number ) => host().querySelectorAll( 'nz-form-item' )[index];
  const inputOf = ( index: number ) => item( index ).querySelector( 'input' ) as HTMLInputElement;
  const tipOf = ( index: number ) => item( index ).querySelector( '.ant-form-item-explain-error' )?.textContent?.trim() ?? '';
  const submitButton = () => host().querySelector( '.ck-register-submit' ) as HTMLButtonElement;
  const type = async ( index: number, text: string ) => {
    const input = inputOf( index );
    input.value = text;
    input.dispatchEvent( new Event( 'input' ) );
    input.dispatchEvent( new Event( 'blur' ) );
    await render();
  };
  const fillValid = async ( userName = '' ) => {
    await type( USER_NAME_ITEM, userName );
    await type( FIRST_NAME_ITEM, 'Ada' );
    await type( LAST_NAME_ITEM, 'Lovelace' );
    await type( PASSWORD_ITEM, STRONG );
    await type( CONFIRM_ITEM, STRONG );
  };
  const pressEnter = () => inputOf( LAST_NAME_ITEM ).dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Enter', bubbles: true } ) );
  const sentCompletions = () => send.mock.calls.map( c => c[0] ).filter( c => c instanceof CompleteRegistrationCommand ) as CompleteRegistrationCommand[];
  // The dropdown's virtual scroll viewport renders its options one animation frame after opening.
  const chooseLanguage = async ( nativeName: string ) => {
    item( CULTURE_ITEM ).querySelector<HTMLElement>( '.ant-select-selector' )!.click();
    await render();
    await new Promise( r => requestAnimationFrame( r ) );
    await render();
    Array.from( document.querySelectorAll<HTMLElement>( 'nz-option-item' ) )
      .find( o => o.textContent?.includes( nativeName ) )!
      .click();
    await render();
  };
  const pendingCompletion = () => {
    let reply!: ( value: SimpleUserMessage ) => void;
    const pending = new Promise<SimpleUserMessage>( resolve => reply = resolve );
    completeReply = () => pending;
    return reply;
  };

  const open = async ( token: string | null, validate: () => Promise<ValidateInvitationTokenResult | undefined> ) => {
    send = jest.fn( ( cmd: unknown ) => cmd instanceof ValidateInvitationTokenCommand ? validate() : completeReply() );
    notifyUserMessage = jest.fn();
    await TestBed.configureTestingModule( {
      providers: [
        ...appConfig.providers,
        { provide: HttpCrisEndpoint, useValue: { sendOrThrowAsync: send } },
        { provide: NotificationService, useValue: { notifyUserMessage } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap( token ? { token } : {} ) } } }
      ],
      imports: [Register]
    } ).compileComponents();
    translate = TestBed.inject( TranslateService );
    await firstValueFrom( translate.use( 'en' ) );
    navigate = jest.spyOn( TestBed.inject( Router ), 'navigate' ).mockResolvedValue( true );
    setLocale = jest.spyOn( TestBed.inject( LocaleService ), 'setLocale' ).mockResolvedValue( undefined );
    fixture = TestBed.createComponent( Register );
    await render();
    await render();
  };
  const invitation = ( defaultXLCID: number ) => async () => new ValidateInvitationTokenResult( undefined, new PendingUser( defaultXLCID, EMAIL ) );
  const openInvited = () => open( TOKEN, invitation( EN_ID ) );

  beforeEach( () => {
    completeReply = async () => new SimpleUserMessage( UserMessageLevel.Info, 'Registered' );
  } );

  it( 'a valid token fills and locks the e-mail', async () => {
    await openInvited();

    expect( inputOf( EMAIL_ITEM ).value ).toBe( EMAIL );
    expect( inputOf( EMAIL_ITEM ).disabled ).toBe( true );
  } );

  it( 'no token shows the invalid invitation alert and no form', async () => {
    await open( null, invitation( EN_ID ) );

    expect( host().querySelector( 'nz-alert' )?.textContent ).toContain( translate.instant( 'CK.Admin.Register.InvalidToken' ) );
    expect( host().querySelector( 'ck-generic-form' ) ).toBeNull();
    expect( send ).not.toHaveBeenCalled();
  } );

  it( 'a token the server knows no user for shows its message in the alert', async () => {
    await open( TOKEN, async () => new ValidateInvitationTokenResult( new SimpleUserMessage( UserMessageLevel.Error, 'Invitation expired' ) ) );

    expect( host().querySelector( 'nz-alert' )?.textContent ).toContain( 'Invitation expired' );
    expect( host().querySelector( 'ck-generic-form' ) ).toBeNull();
  } );

  it( 'empty first name shows CK.Admin.Register.FirstName.Required', async () => {
    await openInvited();
    await type( FIRST_NAME_ITEM, '' );

    expect( tipOf( FIRST_NAME_ITEM ) ).toBe( translate.instant( 'CK.Admin.Register.FirstName.Required' ) );
  } );

  it( 'empty last name shows CK.Admin.Register.LastName.Required', async () => {
    await openInvited();
    await type( LAST_NAME_ITEM, '' );

    expect( tipOf( LAST_NAME_ITEM ) ).toBe( translate.instant( 'CK.Admin.Register.LastName.Required' ) );
  } );

  it( 'empty password shows CK.Admin.Register.Password.Required', async () => {
    await openInvited();
    await type( PASSWORD_ITEM, '' );

    expect( tipOf( PASSWORD_ITEM ) ).toBe( translate.instant( 'CK.Admin.Register.Password.Required' ) );
  } );

  it( 'a weak password keeps the submit disabled', async () => {
    await openInvited();
    await fillValid();
    await type( PASSWORD_ITEM, 'abcdefg1!' );
    await type( CONFIRM_ITEM, 'abcdefg1!' );

    expect( submitButton().disabled ).toBe( true );
  } );

  it( 'empty confirmation shows CK.Admin.Register.ConfirmPassword.Required', async () => {
    await openInvited();
    await type( PASSWORD_ITEM, STRONG );
    await type( CONFIRM_ITEM, '' );

    expect( tipOf( CONFIRM_ITEM ) ).toBe( translate.instant( 'CK.Admin.Register.ConfirmPassword.Required' ) );
  } );

  it( 'mismatch shows CK.Admin.Register.ConfirmPassword.Mismatch', async () => {
    await openInvited();
    await type( PASSWORD_ITEM, STRONG );
    await type( CONFIRM_ITEM, STRONG + 'x' );

    expect( tipOf( CONFIRM_ITEM ) ).toBe( translate.instant( 'CK.Admin.Register.ConfirmPassword.Mismatch' ) );
    expect( submitButton().disabled ).toBe( true );
  } );

  it( 'a valid token switches the UI to the invitation language, even when it is the default one', async () => {
    await open( TOKEN, invitation( FR_ID ) );

    expect( setLocale ).toHaveBeenCalledTimes( 1 );
    expect( setLocale ).toHaveBeenCalledWith( 'fr' );
  } );

  it( 'the page alone does not switch the UI language while the token is checked', async () => {
    await open( TOKEN, () => new Promise( () => undefined ) );

    expect( host().querySelector( 'nz-spin' ) ).not.toBeNull();
    expect( setLocale ).not.toHaveBeenCalled();
  } );

  it( 'changing the culture switches the UI language', async () => {
    await openInvited();
    setLocale.mockClear();

    await chooseLanguage( 'Français' );

    expect( setLocale ).toHaveBeenCalledTimes( 1 );
    expect( setLocale ).toHaveBeenCalledWith( 'fr' );
  } );

  it( 'submit sends CompleteRegistrationCommand with the trimmed user name, the token and the culture the user chose, then navigates to /auth', async () => {
    await openInvited();
    await chooseLanguage( 'Français' );
    await fillValid( '  ada  ' );
    submitButton().click();
    await render();

    expect( sentCompletions() ).toHaveLength( 1 );
    expect( sentCompletions()[0] ).toMatchObject( {
      email: EMAIL,
      firstName: 'Ada',
      lastName: 'Lovelace',
      extendedCultureId: FR_ID,
      password: STRONG,
      token: TOKEN,
      userName: 'ada',
      currentCultureName: 'fr'
    } );
    expect( notifyUserMessage ).toHaveBeenCalledTimes( 1 );
    expect( navigate ).toHaveBeenCalledWith( ['/auth'] );
  } );

  it( 'a blank user name is sent as undefined', async () => {
    await openInvited();
    await fillValid( '   ' );
    submitButton().click();
    await render();

    expect( sentCompletions() ).toHaveLength( 1 );
    expect( sentCompletions()[0].userName ).toBeUndefined();
  } );

  it( 'an Error result keeps the page', async () => {
    completeReply = async () => new SimpleUserMessage( UserMessageLevel.Error, 'Rejected' );
    await openInvited();
    await fillValid();
    submitButton().click();
    await render();

    expect( sentCompletions() ).toHaveLength( 1 );
    expect( notifyUserMessage ).toHaveBeenCalledTimes( 1 );
    expect( navigate ).not.toHaveBeenCalled();
    expect( submitButton().disabled ).toBe( false );
  } );

  it( 'submit disabled and loading while the command is in flight', async () => {
    await openInvited();
    const reply = pendingCompletion();
    await fillValid();
    submitButton().click();
    await render();

    expect( submitButton().disabled ).toBe( true );
    expect( submitButton().classList ).toContain( 'ant-btn-loading' );

    reply( new SimpleUserMessage( UserMessageLevel.Info, 'Registered' ) );
    await render();
  } );

  it( 'Enter in a field submits once, and a second Enter while in flight sends nothing more', async () => {
    await openInvited();
    const reply = pendingCompletion();
    await fillValid();

    pressEnter();
    pressEnter();
    reply( new SimpleUserMessage( UserMessageLevel.Info, 'Registered' ) );
    await render();

    expect( sentCompletions() ).toHaveLength( 1 );
    expect( navigate ).toHaveBeenCalledWith( ['/auth'] );
  } );

  it( 'a send that throws enables submit again', async () => {
    completeReply = () => Promise.reject( new Error( 'offline' ) );
    await openInvited();
    await fillValid();

    // Called directly: submit() lets the rejection reach its caller, which a click would turn into a jest failure.
    await expect( fixture.componentInstance.submit() ).rejects.toThrow( 'offline' );
    await render();

    expect( sentCompletions() ).toHaveLength( 1 );
    expect( navigate ).not.toHaveBeenCalled();
    expect( submitButton().disabled ).toBe( false );
  } );

  it( 'submit refuses while the form is invalid', async () => {
    await openInvited();
    await type( FIRST_NAME_ITEM, 'Ada' );

    await fixture.componentInstance.submit();

    expect( sentCompletions() ).toHaveLength( 0 );
    expect( submitButton().disabled ).toBe( true );
  } );
} );
