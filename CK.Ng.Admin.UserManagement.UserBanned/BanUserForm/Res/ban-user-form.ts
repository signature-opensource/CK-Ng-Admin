import { Component, TemplateRef, inject, signal, viewChild } from '@angular/core';
import { FormField, required, validate } from '@angular/forms/signals';
import { DateTime, DurationLikeObject } from 'luxon';
import { TranslatePipe } from '@ngx-translate/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { DisabledTimeFn, NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { CustomFieldContext, customField, GenericFields, GenericForm, genericForm, GenericFormHandle, selectField } from '@local/ck-gen';

// nz-date-picker yields JS Dates; the commands take luxon DateTime.
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

// The picker rules out past slots, but its "Now" shortcut still lands on the current instant, which
// is already past by the time the command reaches the server.
function hasElapsed( end: Date | null ): boolean {
  return !!end && end.getTime() <= Date.now();
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

type BanFormValue = { keyReason: string, banDuration: BanDurationKey, customEndDate: Date | null };

@Component( {
  selector: 'ck-ban-user-form',
  templateUrl: './ban-user-form.html',
  imports: [FormField, TranslatePipe, NzDatePickerModule, GenericForm]
} )
export class BanUserForm {
  // <PreViewChildren revert />
  protected readonly endDateTemplate = viewChild<TemplateRef<CustomFieldContext<Date | null>>>( 'endDateTemplate' );
  // <PostViewChildren />

  // <PreDependencyInjection revert />
  readonly #nzModalData = inject( NZ_MODAL_DATA );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  // Names of the users being banned, shown as a reminder in the modal.
  public userNames: Array<string>;
  /**
   * The `keyReason` field given by the opener in `NZ_MODAL_DATA.fields`, then `banDuration` (permanent
   * by default, the common case) and `customEndDate`, shown and required only for the 'custom' duration.
   * Its fields are fixed when the component is created.
   */
  public readonly banForm: GenericFormHandle<GenericFields>;
  // The end-date rule reads Date.now(), which no signal tracks: bumping this re-runs it.
  readonly #clock = signal( 0 );
  // <PostLocalVariables />

  constructor() {
    this.userNames = this.#nzModalData.userNames ?? [];
    const reasonFields: GenericFields = this.#nzModalData.fields;
    this.banForm = genericForm<GenericFields>( () => ( {
      ...reasonFields,
      banDuration: selectField<BanDurationKey>( 'CK.Admin.UserManagement.Ban.Duration', 'eternal', {
        options: BAN_DURATIONS.map( d => ( { label: d.labelKey, value: d.key } ) )
      } ),
      customEndDate: customField<Date | null>( 'CK.Admin.UserManagement.Ban.EndDate', null, {
        template: this.endDateTemplate()!,
        show: m => m['banDuration'] === 'custom',
        rules: p => {
          required( p, { message: 'CK.Admin.UserManagement.Ban.EndDateRequired' } );
          validate( p, ( { value } ) => {
            this.#clock();
            return hasElapsed( value() ) ? { kind: 'endDatePast', message: 'CK.Admin.UserManagement.Ban.EndDatePast' } : undefined;
          } );
        }
      } )
    } ) );
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

  // Called by UsersTab when a confirmation is rejected: surfaces every pending validation message,
  // including an end date that has elapsed since it was picked.
  showErrors(): void {
    this.#clock.update( n => n + 1 );
    this.banForm.form().markAsTouched();
  }

  // The end date is checked against the clock here too: the form's own rule only re-runs on a change.
  get valid(): boolean {
    const v = this.#value();
    return this.banForm.form().valid() && !( v.banDuration === 'custom' && hasElapsed( v.customEndDate ) );
  }

  getValue(): { keyReason: string, banEndDate?: DateTime } {
    const v = this.#value();
    // The reason is free text: only the surrounding whitespace is dropped.
    return { keyReason: v.keyReason.trim(), banEndDate: this.#computeEndDate( v ) };
  }

  #value(): BanFormValue {
    return this.banForm.model() as BanFormValue;
  }

  // An eternal banishment is expressed by leaving the end date undefined: the server stores 9999-12-31.
  // Seconds are always dropped: the picker works at the minute and a ban end needs no finer grain.
  #computeEndDate( v: BanFormValue ): DateTime | undefined {
    if ( v.banDuration === 'custom' ) return toDateTime( v.customEndDate )?.startOf( 'minute' );
    const d = BAN_DURATIONS.find( o => o.key === v.banDuration )?.duration;
    return d ? DateTime.utc().plus( d ).startOf( 'minute' ) : undefined;
  }
}
