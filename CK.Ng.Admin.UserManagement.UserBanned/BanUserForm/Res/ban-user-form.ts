import { Component, Signal, inject, viewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GenericForm, GenericFormData } from '@local/ck-gen';
import { DateTime, DurationLikeObject } from 'luxon';
import { TranslateModule } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { DisabledTimeFn, NzDatePickerModule } from 'ng-zorro-antd/date-picker';

// The nz-date-picker of the GenericForm yields JS Dates; the commands take luxon DateTime.
function toDateTime( value: Date | null | undefined ): DateTime | undefined {
  return value ? DateTime.fromJSDate( value ).toUTC() : undefined;
}

function isSameDay( a: Date, b: Date ): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// [from, to[ as an array, the shape ng-zorro expects for its disabled hour/minute lists.
function range( from: number, to: number ): Array<number> {
  return Array.from( { length: Math.max( 0, to - from ) }, ( _, i ) => from + i );
}

export type BanDurationKey = 'eternal' | 'hour' | 'day' | 'week' | 'month' | 'custom';

// Durations offered in the select. A missing `duration` means no end date is computed here:
// 'eternal' lets the server store 9999-12-31, 'custom' defers to the date picker.
export const BAN_DURATIONS: ReadonlyArray<{ key: BanDurationKey, labelKey: string, duration?: DurationLikeObject }> = [
  { key: 'eternal', labelKey: 'CK.Admin.UserManagement.Ban.Eternal' },
  { key: 'hour', labelKey: 'CK.Admin.UserManagement.Ban.DurationHour', duration: { hours: 1 } },
  { key: 'day', labelKey: 'CK.Admin.UserManagement.Ban.DurationDay', duration: { days: 1 } },
  { key: 'week', labelKey: 'CK.Admin.UserManagement.Ban.DurationWeek', duration: { weeks: 1 } },
  { key: 'month', labelKey: 'CK.Admin.UserManagement.Ban.DurationMonth', duration: { months: 1 } },
  { key: 'custom', labelKey: 'CK.Admin.UserManagement.Ban.DurationCustom' }
];

@Component( {
  selector: 'ck-ban-user-form',
  templateUrl: './ban-user-form.html',
  imports: [TranslateModule, FormsModule, ReactiveFormsModule, NzFormModule, NzSelectModule, NzDatePickerModule, GenericForm]
} )
export class BanUserForm {
  // <PreViewChildren revert />
  readonly formComponent: Signal<GenericForm | undefined> = viewChild( 'formComp' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  // Scalar-field config (the free-text keyReason) consumed by the GenericForm. The GenericForm
  // also reads it from NZ_MODAL_DATA (modal mode); binding it satisfies its required input.
  public formData: GenericFormData<unknown, unknown>;
  // Names of the users being banned, shown as a reminder in the modal.
  public userNames: Array<string>;
  public readonly durations = BAN_DURATIONS;
  // Selected duration. Permanent by default: it is the common case and it reproduces the behaviour
  // of the former "eternal" checkbox, which was checked by default.
  public banDuration: BanDurationKey = 'eternal';
  // Absolute end date, entered only when banDuration is 'custom'.
  public customEndDate: Date | null = null;
  // Set on the first rejected confirmation so the missing end date is reported. The GenericForm
  // only renders its own control errors once the form is dirty or touched.
  public submitAttempted: boolean = false;
  // <PostLocalVariables />

  constructor() {
    this.formData = this.#nzModalData.formData;
    this.userNames = this.#nzModalData.userNames ?? [];
  }

  get isCustomDuration(): boolean {
    return this.banDuration === 'custom';
  }

  // A banishment cannot end before it starts (check constraint BanStartDate <= BanEndDate).
  // nzDisabledDate is evaluated per day cell (the Date is that day at midnight), so it can only rule
  // out whole days: today stays selectable and the elapsed part of it is cut by disabledEndTime.
  readonly disabledEndDate = ( d: Date ): boolean => {
    const startOfToday = new Date();
    startOfToday.setHours( 0, 0, 0, 0 );
    return d.getTime() < startOfToday.getTime();
  };

  // On today only, hours and minutes already elapsed are ruled out. A minute is disabled as soon as
  // it has started: picking the current minute would yield HH:mm:00, which is already in the past.
  // DisabledTimeConfig requires all three callbacks, so they are always returned.
  readonly disabledEndTime: DisabledTimeFn = ( value ) => {
    const now = new Date();
    const d = Array.isArray( value ) ? value[0] : value;
    const today = !!d && isSameDay( d, now );
    return {
      nzDisabledHours: () => today ? range( 0, now.getHours() ) : [],
      nzDisabledMinutes: ( hour: number ) => today && hour === now.getHours() ? range( 0, now.getMinutes() + 1 ) : [],
      nzDisabledSeconds: () => []
    };
  };

  // Called by UsersTab when a confirmation is rejected: surfaces every pending validation message.
  showErrors(): void {
    this.submitAttempted = true;
    this.formComponent()?.form()?.markAllAsTouched();
  }

  get missingEndDate(): boolean {
    return this.submitAttempted && this.isCustomDuration && !this.customEndDate;
  }

  // The picker rules out past slots, but its "Now" shortcut still lands on the current instant, which
  // is already past by the time the command reaches the server.
  get pastEndDate(): boolean {
    return this.submitAttempted && this.isCustomDuration
      && !!this.customEndDate && this.customEndDate.getTime() <= Date.now();
  }

  get valid(): boolean {
    const form = this.formComponent()?.form();
    if ( !form || !form.valid ) return false;
    // In 'custom' mode the end date is mandatory and must still be in the future.
    return !this.isCustomDuration || ( !!this.customEndDate && this.customEndDate.getTime() > Date.now() );
  }

  getValue(): { keyReason: string, banEndDate?: DateTime } {
    const raw = this.formComponent()!.form()!.getRawValue();
    // The reason is free text: only the surrounding whitespace is dropped.
    const keyReason = ( raw.keyReason as string ).trim();
    return { keyReason, banEndDate: this.#computeEndDate() };
  }

  // An eternal banishment is expressed by leaving the end date undefined: the server stores 9999-12-31.
  // Seconds are always dropped: the picker works at the minute and a ban end needs no finer grain.
  #computeEndDate(): DateTime | undefined {
    if ( this.banDuration === 'custom' ) return toDateTime( this.customEndDate )?.startOf( 'minute' );
    const d = BAN_DURATIONS.find( o => o.key === this.banDuration )?.duration;
    return d ? DateTime.utc().plus( d ).startOf( 'minute' ) : undefined;
  }
}
