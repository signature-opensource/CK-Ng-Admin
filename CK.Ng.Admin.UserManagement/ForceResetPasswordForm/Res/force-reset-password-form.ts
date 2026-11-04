import { Component, TemplateRef, inject, viewChild } from '@angular/core';
import { FormField, required } from '@angular/forms/signals';
import { TranslatePipe } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { CustomFieldContext, customField, generateStrongPassword, GenericForm, genericForm, passwordComplexity, PasswordStrength } from '@local/ck-gen';

@Component( {
  selector: 'ck-force-reset-password-form',
  templateUrl: './force-reset-password-form.html',
  styleUrls: ['./force-reset-password-form.less'],
  imports: [FormField, TranslatePipe, FontAwesomeModule, NzButtonModule, NzInputModule, GenericForm, PasswordStrength]
} )
export class ForceResetPasswordForm {
  // <PreViewChildren revert />
  protected readonly passwordTemplate = viewChild<TemplateRef<CustomFieldContext<string>>>( 'passwordTemplate' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA, { optional: true } );
  // <PostDependencyInjection />

  // <PreIconsDefinition revert />
  protected readonly refreshIcon = faRotate;
  // <PostIconsDefinition />

  // <PreLocalVariables revert />
  /** Name of the user whose password is being reset, displayed as a reminder. */
  public readonly userName: string = this.#nzModalData?.userName ?? '';
  // Drawn once: the field definitions below are re-read reactively and would draw a new default each time.
  readonly #initialPassword = generateStrongPassword();
  /**
   * The single `password` field: a readable text input, not a masked one, because the administrator
   * dictates the password to the user. Pre-filled with a strong value, regenerable, as in the creation flow.
   */
  public readonly userForm = genericForm( () => ( {
    password: customField<string>( 'CK.Admin.UserManagement.User.Password', this.#initialPassword, {
      template: this.passwordTemplate()!,
      rules: p => {
        required( p, { message: 'CK.Admin.UserManagement.User.PasswordRequired' } );
        // No message: ck-password-strength under the input lists the unmet criteria.
        passwordComplexity( p );
      }
    } )
  } ) );
  // <PostLocalVariables />

  get valid(): boolean {
    return this.userForm.form().valid();
  }

  getValue(): string {
    return this.userForm.model().password;
  }

  /** Reveals what is missing when the modal is confirmed on an invalid form. */
  showErrors(): void {
    this.userForm.form().markAsTouched();
  }

  regeneratePassword(): void {
    this.userForm.model.update( m => ( { ...m, password: generateStrongPassword() } ) );
  }
}
