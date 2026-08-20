import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { generateStrongPassword, PasswordStrength, passwordComplexityValidator } from '@local/ck-gen';

@Component( {
  selector: 'ck-force-reset-password-form',
  templateUrl: './force-reset-password-form.html',
  styleUrls: ['./force-reset-password-form.less'],
  imports: [FormsModule, ReactiveFormsModule, TranslateModule, FontAwesomeModule, NzButtonModule, NzFormModule, NzInputModule, PasswordStrength]
} )
export class ForceResetPasswordForm {
  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA, { optional: true } );
  // <PostDependencyInjection />

  // <PreIconsDefinition revert />
  protected readonly refreshIcon = faRotate;
  // <PostIconsDefinition />

  // <PreLocalVariables revert />
  /** Name of the user whose password is being reset, displayed as a reminder. */
  public readonly userName: string = this.#nzModalData?.userName ?? '';
  // Deliberately a readable text input, not a masked one: the administrator has to dictate the
  // password to the user. Pre-filled with a strong value, regenerable, as in the creation flow.
  public readonly form = new FormGroup( {
    password: new FormControl<string>( generateStrongPassword(), {
      nonNullable: true,
      validators: [Validators.required, passwordComplexityValidator]
    } )
  } );
  // <PostLocalVariables />

  get passwordControl(): FormControl<string> {
    return this.form.controls.password;
  }

  get valid(): boolean {
    return this.form.valid;
  }

  getValue(): string {
    return this.passwordControl.getRawValue();
  }

  /** Reveals what is missing when the modal is confirmed on an invalid form. */
  showErrors(): void {
    this.form.markAllAsTouched();
  }

  regeneratePassword(): void {
    this.passwordControl.setValue( generateStrongPassword() );
  }
}
