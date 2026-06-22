import { Component, TemplateRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateTime } from 'luxon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { startWith, switchMap } from 'rxjs';
import { faEnvelope, faRotate } from '@fortawesome/free-solid-svg-icons';
import { ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  ActionBarContent,
  AdaptivePageLayout,
  DefaultTableColumn,
  Filter,
  GetPlatformPendingInvitationsQCommand,
  GetWorkspacePendingInvitationsQCommand,
  HttpCrisEndpoint,
  NotificationService,
  PendingInvitation,
  ResendInvitationsCommand,
  SelectFilter,
  TableAction,
  TableCellContext,
  TableColumn,
  UserService,
  utcDateToLocal
} from '@local/ck-gen';

@Component( {
  selector: 'ck-invitations-table',
  templateUrl: './invitations-table.html',
  imports: [AdaptivePageLayout, TranslateModule, NzTagModule]
} )
export class InvitationsTable {
  readonly layout = viewChild<AdaptivePageLayout<PendingInvitation>>( 'layout' );
  readonly activeCellTemplate = viewChild.required<TemplateRef<TableCellContext<PendingInvitation>>>( 'activeCellTemplate' );

  readonly workspaceId = input<number>();
  readonly selectionChanged = output<Array<PendingInvitation>>();

  // <PreDependencyInjection revert />
  readonly #translateService = inject( TranslateService );
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #userService = inject( UserService );
  readonly #notifService = inject( NotificationService );
  readonly #nzModalService = inject( NzModalService );
  // <PostDependencyInjection />

  // <PreLocalVariables revert />
  readonly pageSize = 10;
  readonly invitations = signal<Array<PendingInvitation>>( [] );
  readonly selectedItems = signal<Array<PendingInvitation>>( [] );
  readonly actions = signal<ActionBarContent<PendingInvitation>>( { left: [], right: [] } );
  readonly filters = signal<Array<Filter<unknown>>>( [] );
  #allInvitations: Array<PendingInvitation> = [];
  #stateFilter?: SelectFilter<'active' | 'expired'>;

  // Front search/filter run inside the adaptive layout: it calls these on every
  // keystroke / filter toggle and uses the returned array as the displayed items.
  readonly searchFunc = ( input: string ): Array<PendingInvitation> => {
    const q = input.trim().toLocaleLowerCase();
    if ( !q ) return this.invitations();
    return this.invitations().filter( i => i.email.toLocaleLowerCase().includes( q ) );
  };

  readonly filterFunc = (): Array<PendingInvitation> => {
    const filtered = this.#computeFiltered();
    this.invitations.set( filtered );
    return filtered;
  };

  protected expirationDate( inv: PendingInvitation ): string {
    return utcDateToLocal( inv.expirationDateUtc.toString() );
  }
  readonly #labels = toSignal(
    this.#translateService.onLangChange.pipe(
      startWith( null ),
      switchMap( () => this.#translateService.get( [
        'CK.Admin.UserManagement.User.Email',
        'CK.Admin.UserManagement.Column.IsInvitationActive',
        'CK.Admin.UserManagement.Column.ExpirationDate',
        'CK.Admin.UserManagement.Filter.State',
        'CK.Admin.UserManagement.Filter.SelectState',
        'CK.Admin.UserManagement.Invitation.Active',
        'CK.Admin.UserManagement.Invitation.Expired',
        'Button.ResendInvitation',
        'Button.Refresh'
      ] ) )
    ),
    { initialValue: {} as Record<string, string> }
  );
  // <PostLocalVariables />

  readonly columns = computed<Array<TableColumn<PendingInvitation>>>( () => {
    const t = this.#labels();
    const activeTmpl = this.activeCellTemplate();
    // <InvitationsColumnsRegistration>
    return [
      {
        name: 'email',
        displayedName: t['CK.Admin.UserManagement.User.Email'] ?? '',
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: PendingInvitation, b: PendingInvitation ) => a.email.localeCompare( b.email )
      },
      new DefaultTableColumn<PendingInvitation>(
        'active',
        t['CK.Admin.UserManagement.Column.IsInvitationActive'] ?? '',
        {
          sortable: true,
          showInMobile: false,
          sortDirections: ['ascend', 'descend'],
          hidden: false,
          sortFn: ( a: PendingInvitation, b: PendingInvitation ) => a.active === b.active ? 0 : a.active ? -1 : 1,
          template: activeTmpl
        }
      ),
      {
        name: 'expirationDateUtc',
        displayedName: t['CK.Admin.UserManagement.Column.ExpirationDate'] ?? '',
        sortable: true,
        showInMobile: true,
        sortDirections: ['ascend', 'descend'],
        hidden: false,
        sortFn: ( a: PendingInvitation, b: PendingInvitation ) => {
          const d = a.expirationDateUtc ? DateTime.fromISO( a.expirationDateUtc.toString() ) : DateTime.fromISO( '0001-01-01T00:00:00' );
          const d1 = b.expirationDateUtc ? DateTime.fromISO( b.expirationDateUtc.toString() ) : DateTime.fromISO( '0001-01-01T00:00:00' );
          return d.toMillis() - d1.toMillis();
        },
        valueFormatter: ( _, row: PendingInvitation ) => utcDateToLocal( row.expirationDateUtc.toString() )
      }
    ];
    // </InvitationsColumnsRegistration>
  } );

  readonly rowActions = computed<Array<TableAction<PendingInvitation>>>( () => {
    const t = this.#labels();
    // <InvitationsRowActionsRegistration>
    return [
      {
        name: 'resend',
        icon: faEnvelope,
        isDanger: false,
        type: 'text',
        tooltip: t['Button.ResendInvitation'] ?? '',
        execute: ( inv: PendingInvitation ) => {
          const modalOpts: ModalOptions = {
            nzTitle: this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ResendInvitation' ),
            nzContent: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ResendInvitationContent' )} : ${inv.email}`,
            nzOnOk: async () => {
              const res = await this.#crisEndpoint.sendOrThrowAsync( new ResendInvitationsCommand( [inv] ) );
              this.#notifService.notifyUserMessage( res );
              await this.getInvitations();
            }
          };
          this.#nzModalService.confirm( modalOpts );
        },
        shouldBeDisplayed: () => true
      }
    ];
    // </InvitationsRowActionsRegistration>
  } );

  constructor() {
    effect( () => {
      const t = this.#labels();
      // <InvitationsActionsRegistration>
      const actions: ActionBarContent<PendingInvitation> = {
        left: [],
        right: [
          {
            name: 'resend',
            displayName: t['Button.ResendInvitation'] ?? '',
            icon: faEnvelope,
            isDanger: false,
            execute: () => {
              const modalOpts: ModalOptions = {
                nzTitle: this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ResendInvitation' ),
                nzContent: `${this.#translateService.instant( 'CK.Admin.UserManagement.Modal.ResendInvitationContent' )} : ${this.selectedItems().map( i => i.email ).join( ', ' )}`,
                nzOnOk: async () => {
                  const res = await this.#crisEndpoint.sendOrThrowAsync( new ResendInvitationsCommand( this.selectedItems(), undefined, this.#userService.userProfile()!.userId ) );
                  this.#notifService.notifyUserMessage( res );
                  await this.getInvitations();
                  this.clearSelection();
                }
              };
              this.#nzModalService.confirm( modalOpts );
            },
            shouldBeDisplayed: () => this.selectedItems().length > 0
          },
          {
            name: 'refresh',
            icon: faRotate,
            displayName: t['Button.Refresh'] ?? '',
            isDanger: false,
            execute: async () => {
              await this.getInvitations();
              this.clearSelection();
            },
            shouldBeDisplayed: () => true
          }
        ]
      };
      // </InvitationsActionsRegistration>
      this.actions.set( actions );
    } );

    // Build / relabel the Active-Expired filter whenever translations change.
    effect( () => {
      const t = this.#labels();
      if ( !this.#stateFilter ) {
        this.#stateFilter = new SelectFilter<'active' | 'expired'>(
          'multiple',
          t['CK.Admin.UserManagement.Filter.State'] ?? '',
          [
            { label: t['CK.Admin.UserManagement.Invitation.Active'] ?? '', value: 'active' },
            { label: t['CK.Admin.UserManagement.Invitation.Expired'] ?? '', value: 'expired' }
          ],
          {
            defaultValue: [],
            placeholder: t['CK.Admin.UserManagement.Filter.SelectState'] ?? ''
          }
        );
      } else {
        this.#stateFilter.label = t['CK.Admin.UserManagement.Filter.State'] ?? '';
        this.#stateFilter.placeholder = t['CK.Admin.UserManagement.Filter.SelectState'] ?? '';
        this.#stateFilter.options[0].label = t['CK.Admin.UserManagement.Invitation.Active'] ?? '';
        this.#stateFilter.options[1].label = t['CK.Admin.UserManagement.Invitation.Expired'] ?? '';
      }
      this.filters.set( [this.#stateFilter] );
    } );

    effect( () => {
      const wsId = this.workspaceId();
      untracked( () => { void this.#load( wsId ); } );
    } );
  }

  async getInvitations(): Promise<void> {
    await this.#load( this.workspaceId() );
  }

  async #load( wsId: number | undefined ): Promise<void> {
    const res = wsId
      ? await this.#crisEndpoint.sendOrThrowAsync( new GetWorkspacePendingInvitationsQCommand() )
      : await this.#crisEndpoint.sendOrThrowAsync( new GetPlatformPendingInvitationsQCommand() );
    if ( res ) this.#allInvitations = [...res];
    this.invitations.set( this.#computeFiltered() );
  }

  // Applies the Active / Expired filter (shows everything when inactive) to the full set.
  #computeFiltered(): Array<PendingInvitation> {
    let result = [...this.#allInvitations];
    if ( this.#stateFilter?.active ) {
      const values = ( this.#stateFilter.value as Array<'active' | 'expired'> | undefined ) ?? [];
      if ( values.length > 0 ) {
        result = result.filter( i => values.includes( i.active ? 'active' : 'expired' ) );
      }
    }
    return result;
  }

  getTableSelection( invs: Array<PendingInvitation> ): void {
    this.selectedItems.set( [...invs] );
    this.selectionChanged.emit( invs );
  }

  clearSelection(): void {
    this.layout()?.clearSelection();
    this.selectedItems.set( [] );
  }
}
