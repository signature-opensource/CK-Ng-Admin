import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { ForceResetPasswordForm } from '@local/ck-gen';
import { appConfig } from './app.config';

describe( 'ck-force-reset-password-form', () => {
  let fixture: ComponentFixture<ForceResetPasswordForm>;
  let translate: TranslateService;

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  const passwordItem = () => Array.from( host().querySelectorAll( 'nz-form-item' ) )
    .find( i => i.querySelector( 'nz-form-label' )?.textContent?.trim() === translate.instant( 'CK.Admin.UserManagement.User.Password' ) )!;
  const passwordInput = () => passwordItem().querySelector( 'input' ) as HTMLInputElement;
  // Messages show as nz-form-control error tips, one div per message.
  const passwordErrors = () => Array.from( passwordItem().querySelectorAll( '.ant-form-item-explain-error div' ) )
    .map( e => e.textContent?.trim() );

  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      providers: [
        ...appConfig.providers,
        { provide: NZ_MODAL_DATA, useValue: { userName: 'jdoe' } }
      ],
      imports: [ForceResetPasswordForm]
    } ).compileComponents();
    translate = TestBed.inject( TranslateService );
    await firstValueFrom( translate.use( 'en' ) );
    fixture = TestBed.createComponent( ForceResetPasswordForm );
    // The password template is a view child: the field definitions see it only after the first change detection.
    await render();
    await render();
  } );

  it( 'password prefilled and valid', async () => {
    expect( passwordInput().value ).not.toBe( '' );
    expect( fixture.componentInstance.valid ).toBe( true );
  } );

  it( 'emptied password shows CK.Admin.UserManagement.User.PasswordRequired after showErrors', async () => {
    // Emptied without user interaction, so the field is neither dirty nor touched.
    fixture.componentInstance.userForm.model.set( { password: '' } );
    await render();
    expect( fixture.componentInstance.valid ).toBe( false );
    expect( passwordErrors() ).toEqual( [] );

    fixture.componentInstance.showErrors();
    await render();

    expect( passwordErrors() ).toEqual( [translate.instant( 'CK.Admin.UserManagement.User.PasswordRequired' )] );
  } );

  it( 'regenerate replaces the value', async () => {
    const prefilled = passwordInput().value;

    passwordItem().querySelector<HTMLButtonElement>( 'button.password-refresh' )!.click();
    await render();

    expect( passwordInput().value ).not.toBe( prefilled );
    expect( fixture.componentInstance.getValue() ).toBe( passwordInput().value );
  } );

  it( 'getValue returns the password', async () => {
    const input = passwordInput();
    input.value = 'Dictated-Pass42';
    input.dispatchEvent( new Event( 'input' ) );
    input.dispatchEvent( new Event( 'blur' ) );
    await render();

    expect( fixture.componentInstance.getValue() ).toBe( 'Dictated-Pass42' );
  } );

  it( 'a weak password is refused', async () => {
    const input = passwordInput();
    input.value = 'abc';
    input.dispatchEvent( new Event( 'input' ) );
    await render();

    expect( fixture.componentInstance.valid ).toBe( false );
  } );
} );
