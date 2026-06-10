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
  DefaultTableColumn,
  GetPlatformPendingInvitationsQCommand,
  GetWorkspacePendingInvitationsQCommand,
  HttpCrisEndpoint,
  NotificationService,
  PendingInvitation,
  ResendInvitationsCommand,
  Table,
  TableAction,
  TableCellContext,
  TableColumn,
  UserService,
  utcDateToLocal
} from '@local/ck-gen';

@Component( {
  selector: 'ck-invitations-table',
  templateUrl: './invitations-table.html',
  styleUrls: ['./invitations-table.less'],
  imports: [Table, TranslateModule, NzTagModule]
} )
export class InvitationsTable {
  readonly tableComponent = viewChild<Table<PendingInvitation>>( 'table' );
  readonly activeCellTemplate = viewChild.required<TemplateRef<TableCellContext<PendingInvitation>>>( 'activeCellTemplate' );

  readonly workspaceId = input<number>();
  readonly selectionChanged = output<Array<PendingInvitation>>();
  readonly actionsChanged = output<ActionBarContent<PendingInvitation>>();

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
  readonly #labels = toSignal(
    this.#translateService.onLangChange.pipe(
      startWith( null ),
      switchMap( () => this.#translateService.get( [
        'CK.Admin.UserManagement.User.Email',
        'CK.Admin.UserManagement.Column.IsInvitationActive',
        'CK.Admin.UserManagement.Column.ExpirationDate',
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
              const res = await this.#crisEndpoint.sendOrThrowAsync( new ResendInvitationsCommand( [inv], undefined, this.#userService.userProfile()!.userId ) );
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
      this.actionsChanged.emit( actions );
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
    if ( res ) this.invitations.set( [...res] );
  }

  getTableSelection( invs: Array<PendingInvitation> ): void {
    this.selectedItems.set( [...invs] );
    this.selectionChanged.emit( invs );
  }

  clearSelection(): void {
    this.tableComponent()?.clearSelection();
    this.selectedItems.set( [] );
  }
}
