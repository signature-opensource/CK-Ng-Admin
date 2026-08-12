import { Component, Signal, inject, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GenericForm, GenericFormData } from '@local/ck-gen';
import { TranslateModule } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';

@Component( {
  selector: 'ck-ban-user-form',
  templateUrl: './ban-user-form.html',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, NzFormModule, NzCheckboxModule, GenericForm]
} )
export class BanUserForm {
  // <PreViewChildren revert />
  readonly formComponent: Signal<GenericForm | undefined> = viewChild( 'formComp' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  // Scalar-field config (keyReason/banStartDate/banEndDate) consumed by the GenericForm. The GenericForm
  // also reads it from NZ_MODAL_DATA (modal mode); binding it satisfies its required input.
  public formData: GenericFormData<unknown, unknown>;
  // Names of the users being banned, shown as a reminder in the modal.
  public userNames: Array<string>;
  // When checked the end date is ignored and the banishment is eternal (the server stores 9999-12-31).
  public isEternal: boolean = true;
  // <PostLocalVariables />

  constructor() {
    this.formData = this.#nzModalData.formData;
    this.userNames = this.#nzModalData.userNames ?? [];
  }

  get valid(): boolean {
    const form = this.formComponent()?.form();
    return !!form && form.valid;
  }

  getValue(): { keyReason: string, banStartDate?: Date, banEndDate?: Date } {
    const raw = this.formComponent()!.form()!.getRawValue();
    return {
      keyReason: raw.keyReason,
      banStartDate: raw.banStartDate ?? undefined,
      // An eternal banishment is expressed by leaving the end date undefined.
      banEndDate: this.isEternal ? undefined : ( raw.banEndDate ?? undefined )
    };
  }
}
