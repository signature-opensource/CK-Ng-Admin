import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
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
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import {
  CompleteRegistrationCommand,
  HttpCrisEndpoint,
  NotificationService,
  PASSWORD_MIN_LENGTH,
  passwordComplexityValidator,
  passwordsMatchValidator,
  PendingUser,
  ValidateInvitationTokenCommand
} from '@local/ck-gen';
import { LocaleInfo, LocaleService, locales } from '@local/ck-gen/ts-locales/locales';

@Component( {
  selector: 'ck-register',
  templateUrl: './register.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    FontAwesomeModule,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzSpinModule
  ]
} )
export class Register implements OnInit {
  // <PreViewChildren revert />
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #formBuilder = inject( FormBuilder );
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

  protected readonly registerForm: FormGroup = this.#formBuilder.group(
    {
      // <PreEmailFormControlDefinition revert />
      email: new FormControl<string>( { value: '', disabled: true }, { nonNullable: true, validators: [Validators.required, Validators.email] } ),
      // <PostEmailFormControlDefinition />
      // <PreFirstNameFormControlDefinition revert />
      firstName: new FormControl<string>( '', { nonNullable: true, validators: [Validators.required] } ),
      // <PostFirstNameFormControlDefinition />
      // <PreLastNameFormControlDefinition revert />
      lastName: new FormControl<string>( '', { nonNullable: true, validators: [Validators.required] } ),
      // <PostLastNameFormControlDefinition />
      // <PreCultureNameFormControlDefinition revert />
      cultureName: new FormControl<string>( 'fr', { nonNullable: true, validators: [Validators.required] } ),
      // <PostCultureNameFormControlDefinition />
      // <PrePasswordFormControlDefinition revert />
      password: new FormControl<string>( '', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength( PASSWORD_MIN_LENGTH ), passwordComplexityValidator]
      } ),
      // <PostPasswordFormControlDefinition />
      // <PreConfirmPasswordFormControlDefinition revert />
      confirmPassword: new FormControl<string>( '', { nonNullable: true, validators: [Validators.required] } )
      // <PostConfirmPasswordFormControlDefinition />
    },
    { validators: [passwordsMatchValidator( 'password', 'confirmPassword' )] }
  );

  #token = '';
  // <PostLocalVariables />

  constructor() {
    // Keep the app locale (ngx-translate + ng-zorro i18n) in sync with the
    // form's selected language so labels/placeholders/error tips re-translate
    // live as the user changes the dropdown. Also covers the initial patch
    // from `user.cultureName` in ngOnInit.
    this.registerForm.get( 'cultureName' )!.valueChanges
      .pipe( takeUntilDestroyed() )
      .subscribe( v => { if ( v ) this.#localeService.setLocale( v ); } );
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
      this.registerForm.patchValue( {
        email: user.email,
        cultureName: matchedLocale?.name ?? this.languages[0]?.name ?? 'fr'
      } );
    } catch {
      this.tokenError.set( this.#translateService.instant( 'CK.Admin.Register.InvalidToken' ) );
    } finally {
      this.loading.set( false );
    }
    // <PostValidateInvitationToken />
  }

  async submit(): Promise<void> {
    // <PreCompleteRegistration revert />
    if ( !this.registerForm.valid || this.submitting() ) return;
    this.submitting.set( true );

    const raw = this.registerForm.getRawValue();
    try {
      const extendedCultureId = this.languages.find( l => l.name === raw.cultureName )?.id ?? this.languages[0]?.id ?? 0;
      const res = await this.#crisEndpoint.sendOrThrowAsync(
        new CompleteRegistrationCommand( raw.email, raw.firstName, raw.lastName, extendedCultureId, raw.password, this.#token )
      );
      if ( res ) this.#notifService.notifyUserMessage( res );
      await this.#router.navigate( ['/auth'] );
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
