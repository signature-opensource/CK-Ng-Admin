import { Component, computed, effect, inject, OnInit, signal, TemplateRef, untracked, viewChild } from '@angular/core';
import { FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faEnvelope,
  faEye,
  faEyeSlash,
  faLanguage,
  faLock,
  faUser
} from '@fortawesome/free-solid-svg-icons';

import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import {
  CompleteRegistrationCommand,
  CustomFieldContext,
  customField,
  GenericForm,
  genericForm,
  HttpCrisEndpoint,
  NotificationService,
  passwordComplexity,
  passwordsMatch,
  PasswordStrength,
  PendingUser,
  textField,
  UserMessageLevel,
  ValidateInvitationTokenCommand
} from '@local/ck-gen';
import { LocaleInfo, LocaleService, locales } from '@local/ck-gen/ts-locales/locales';

@Component( {
  selector: 'ck-register',
  templateUrl: './register.html',
  imports: [
    FormField,
    TranslateModule,
    FontAwesomeModule,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule,
    GenericForm,
    PasswordStrength
  ]
} )
export class Register implements OnInit {
  // <PreViewChildren revert />
  protected readonly firstNameError = viewChild<TemplateRef<CustomFieldContext<string>>>( 'firstNameError' );
  protected readonly lastNameError = viewChild<TemplateRef<CustomFieldContext<string>>>( 'lastNameError' );
  protected readonly cultureTemplate = viewChild<TemplateRef<CustomFieldContext<string>>>( 'cultureTemplate' );
  protected readonly passwordTemplate = viewChild<TemplateRef<CustomFieldContext<string>>>( 'passwordTemplate' );
  protected readonly passwordError = viewChild<TemplateRef<CustomFieldContext<string>>>( 'passwordError' );
  protected readonly confirmTemplate = viewChild<TemplateRef<CustomFieldContext<string>>>( 'confirmTemplate' );
  protected readonly confirmError = viewChild<TemplateRef<CustomFieldContext<string>>>( 'confirmError' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #notifService = inject( NotificationService );
  readonly #route = inject( ActivatedRoute );
  readonly #router = inject( Router );
  readonly #translateService = inject( TranslateService );
  readonly #localeService = inject( LocaleService );
  // <PostDependencyInjection />

  // <PreInputOutput revert />
  // <PostInputOutput />

  // <PreIconsDefinition revert />
  protected readonly eyeIcon = faEye;
  protected readonly eyeSlashIcon = faEyeSlash;
  protected readonly passwordIcon = faLock;
  protected readonly userIcon = faUser;
  protected readonly emailIcon = faEnvelope;
  protected readonly langIcon = faLanguage;
  // <PostIconsDefinition />

  // <PreLocalVariables revert />
  protected readonly loading = signal( true );
  protected readonly tokenError = signal<string | null>( null );
  protected readonly submitting = signal( false );
  protected readonly showPassword = signal( false );
  protected readonly showConfirmPassword = signal( false );
  protected readonly languages: Array<LocaleInfo> = Object.values( locales );

  protected readonly registerForm = genericForm( () => ( {
    // <PreEmailFormControlDefinition revert />
    // Filled from the invitation and never edited: a disabled field skips validation, so it carries no rules.
    email: textField( 'CK.Admin.Register.Email.Placeholder', '', { prefixIcon: this.emailIcon, disabled: true } ),
    // <PostEmailFormControlDefinition />
    // <PreUserNameFormControlDefinition revert />
    // Optional nickname. When left blank the backend uses the e-mail as the user name.
    userName: textField( 'CK.Admin.Register.UserName.Placeholder', '', { prefixIcon: this.userIcon, autocomplete: 'username' } ),
    // <PostUserNameFormControlDefinition />
    // <PreFirstNameFormControlDefinition revert />
    firstName: textField( 'CK.Admin.Register.FirstName.Placeholder', '', {
      prefixIcon: this.userIcon,
      autocomplete: 'given-name',
      errorTemplate: this.firstNameError(),
      rules: p => required( p, { message: 'CK.Admin.Register.FirstName.Required' } )
    } ),
    // <PostFirstNameFormControlDefinition />
    // <PreLastNameFormControlDefinition revert />
    lastName: textField( 'CK.Admin.Register.LastName.Placeholder', '', {
      prefixIcon: this.userIcon,
      autocomplete: 'family-name',
      errorTemplate: this.lastNameError(),
      rules: p => required( p, { message: 'CK.Admin.Register.LastName.Required' } )
    } ),
    // <PostLastNameFormControlDefinition />
    // <PreCultureNameFormControlDefinition revert />
    cultureName: customField( 'CK.Admin.UserManagement.Form.DefaultLanguage', 'fr', {
      template: this.cultureTemplate()!,
      rules: p => required( p )
    } ),
    // <PostCultureNameFormControlDefinition />
    // <PrePasswordFormControlDefinition revert />
    password: customField( 'CK.Admin.Register.Password.Placeholder', '', {
      template: this.passwordTemplate()!,
      errorTemplate: this.passwordError(),
      rules: p => {
        required( p, { message: 'CK.Admin.Register.Password.Required' } );
        passwordComplexity( p );
      }
    } ),
    // <PostPasswordFormControlDefinition />
    // <PreConfirmPasswordFormControlDefinition revert />
    confirmPassword: customField( 'CK.Admin.Register.ConfirmPassword.Placeholder', '', {
      template: this.confirmTemplate()!,
      errorTemplate: this.confirmError(),
      rules: p => required( p, { message: 'CK.Admin.Register.ConfirmPassword.Required' } )
    } )
    // <PostConfirmPasswordFormControlDefinition />
  } ), { rules: p => passwordsMatch( p.password, p.confirmPassword, { message: 'CK.Admin.Register.ConfirmPassword.Mismatch' } ) } );

  readonly #cultureName = computed( () => this.registerForm.model().cultureName );
  #token = '';
  // <PostLocalVariables />

  constructor() {
    // A language the user picks switches the app locale (ngx-translate and ng-zorro i18n) so the page
    // re-translates live. Only a user change marks the field dirty: the construction default switches
    // nothing, and ngOnInit applies the invitation's language itself.
    effect( () => {
      const cultureName = this.#cultureName();
      if ( untracked( () => this.registerForm.form.cultureName().dirty() ) ) {
        this.#localeService.setLocale( cultureName );
      }
    } );
  }

  async ngOnInit(): Promise<void> {
    // <PreValidateInvitationToken revert />
    this.#token = this.#route.snapshot.paramMap.get( 'token' ) ?? '';
    if ( !this.#token ) {
      this.tokenError.set( this.#translateService.instant( 'CK.Admin.Register.InvalidToken' ) );
      this.loading.set( false );
      return;
    }

    try {
      const tokenRes = await this.#crisEndpoint.sendOrThrowAsync( new ValidateInvitationTokenCommand( this.#token ) );

      if ( !tokenRes || !tokenRes.user ) {
        this.tokenError.set(
          tokenRes?.userMessage?.message ?? this.#translateService.instant( 'CK.Admin.Register.InvalidToken' )
        );
        this.loading.set( false );
        return;
      }

      const user: PendingUser = tokenRes.user;
      const matchedLocale = this.languages.find( l => l.id === user.defaultXLCID );
      const cultureName = matchedLocale?.name ?? this.languages[0]?.name ?? 'fr';
      this.registerForm.model.update( m => ( { ...m, email: user.email, cultureName } ) );
      this.#localeService.setLocale( cultureName );
    } catch {
      this.tokenError.set( this.#translateService.instant( 'CK.Admin.Register.InvalidToken' ) );
    } finally {
      this.loading.set( false );
    }
    // <PostValidateInvitationToken />
  }

  async submit(): Promise<void> {
    // <PreCompleteRegistration revert />
    if ( !this.registerForm.form().valid() || this.submitting() ) return;
    this.submitting.set( true );

    const raw = this.registerForm.model();
    try {
      const extendedCultureId = this.languages.find( l => l.name === raw.cultureName )?.id ?? this.languages[0]?.id ?? 0;
      const command = new CompleteRegistrationCommand( raw.email, raw.firstName, raw.lastName, extendedCultureId, raw.password, this.#token );
      // Optional nickname: leave unset when blank so the backend falls back to the e-mail. Set by
      // property (not positional) because the generated ctor places the ambient culture parameter last.
      command.userName = raw.userName?.trim() || undefined;
      command.currentCultureName = raw.cultureName;
      const res = await this.#crisEndpoint.sendOrThrowAsync(command);
      if (res) this.#notifService.notifyUserMessage(res);
      if (res?.level !== UserMessageLevel.Error) {
          await this.#router.navigate(['/auth']);
      }
    } finally {
      this.submitting.set( false );
    }
    // <PostCompleteRegistration />
  }

  toggleShowPassword(): void {
    this.showPassword.update( v => !v );
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword.update( v => !v );
  }

}
