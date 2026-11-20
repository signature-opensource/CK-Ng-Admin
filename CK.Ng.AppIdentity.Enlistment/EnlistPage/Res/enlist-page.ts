import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ApprovePartyCommand, AuthLevel, EnlistmentTicket, EnlistmentTicketInfo, GetEnlistmentTicketsQCommand, GetPartyInstancesQCommand, GetPendingApprovalsQCommand, HttpCrisEndpoint, NgAuthService, OpenEnlistmentTicketCommand, PartyApprovalOutcome, PartyApprovalStatus, PartyInstance, PendingApproval, RemovePartyInstanceCommand, RevokeEnlistmentTicketCommand } from '@local/ck-gen';

/** A party that waits for an approval, with the holders of its pending approvals. */
export interface WaitingParty {
    readonly party: string;
    readonly holders: ReadonlyArray<string>;
    /** The oldest pending approval of the party (milliseconds). */
    readonly since: number;
    /** The party name of the Opened template when the party is a new dynamic instance of it ("$Worker-{Name}"). */
    readonly template?: string;
    /** The number of keys that compete for the approval of the party (the highest of its holders): more than one is suspect. */
    readonly competing: number;
}

/** An approved dynamic instance of an Opened template, with its holders. */
export interface InstanceParty {
    readonly party: string;
    readonly template: string;
    readonly holders: ReadonlyArray<string>;
}

/**
 * The approval page. At the Critical level, it lists the parties that wait for an approval (the operator chooses one
 * here rather than following a link); with "?party=", it approves this party with the codes read on it (one per holder
 * it waits on). The approval requires the Critical level: the operator signs in again in a popup, the page keeps the codes.
 */
@Component( {
    selector: 'ck-enlist-page',
    imports: [
        FormsModule,
        TranslatePipe,
        NzAlertModule,
        NzButtonModule,
        NzCheckboxModule,
        NzInputModule
    ],
    templateUrl: './enlist-page.html'
} )
export class EnlistPage {
    // <PreDependencyInjection revert />
    readonly #auth = inject( NgAuthService );
    readonly #cris = inject( HttpCrisEndpoint );
    readonly #route = inject( ActivatedRoute );
    // <PostDependencyInjection />

    // <PreLocalVariables revert />
    /** The full name of the party to approve ("?party="), null when there is none: the page lists the waiting parties. */
    readonly party: string | null = this.#route.snapshot.queryParamMap.get( 'party' );
    /** The codes entered by the operator: one per holder of the party once the pending approvals are read. */
    readonly codes = signal<string[]>( [''] );
    readonly sending = signal( false );
    /** The outcomes of the last approval (one per holder), undefined before any approval. */
    readonly outcomes = signal<PartyApprovalOutcome[] | undefined>( undefined );
    /** The error of the last command. */
    readonly error = signal<string | undefined>( undefined );
    /** The pending approvals that reach this page (read at the Critical level), undefined before they are read. */
    readonly pending = signal<PendingApproval[] | undefined>( undefined );
    /** The approved dynamic instances that reach this page (read at the Critical level), undefined before they are read. */
    readonly instances = signal<PartyInstance[] | undefined>( undefined );
    /** The instance being removed. */
    readonly removing = signal<string | undefined>( undefined );
    /** The full name of the party the operator expects (the pre-authorized enlistment ticket). */
    readonly expected = signal( '' );
    /** The lifetime of the ticket, in hours. */
    readonly lifetimeHours = signal( 24 );
    /** The ticket just opened: shown once (its text is a secret, given to the expected party at start). */
    readonly openedTicket = signal<EnlistmentTicket | undefined>( undefined );
    /** The enlistment tickets of the Authentication Center (read at the Critical level), undefined before they are read. */
    readonly tickets = signal<EnlistmentTicketInfo[] | undefined>( undefined );
    readonly openingTicket = signal( false );
    /** The ticket being revoked. */
    readonly revoking = signal<string | undefined>( undefined );
    readonly loading = signal( false );
    protected readonly statusName = PartyApprovalStatus;
    readonly #now = signal( Date.now() );
    /** The seconds left in the Critical window: 0 when the operator is not at the Critical level. */
    readonly secondsLeft = computed( () => {
        if( this.#auth.level() !== AuthLevel.Critical ) return 0;
        const end = this.#auth.authenticationInfo().criticalExpires?.toMillis() ?? 0;
        return Math.max( 0, Math.floor( (end - this.#now()) / 1000 ) );
    } );
    readonly isCritical = computed( () => this.secondsLeft() > 0 );
    readonly canApprove = computed( () => !this.sending() && this.codes().some( c => c.trim().length > 0 ) );
    /** The parties that wait for an approval, the oldest first. */
    readonly waitingParties = computed<WaitingParty[]>( () => {
        const byParty = new Map<string, { holders: string[], since: number, template?: string, competing: number }>();
        for( const p of this.pending() ?? [] ) {
            const since = p.since.toMillis();
            const e = byParty.get( p.partyFullName );
            if( e ) {
                e.holders.push( p.holderFullName );
                e.since = Math.min( e.since, since );
                e.template ??= p.templatePartyName ?? undefined;
                e.competing = Math.max( e.competing, p.competingKeyCount );
            }
            else byParty.set( p.partyFullName, { holders: [p.holderFullName], since, template: p.templatePartyName ?? undefined, competing: p.competingKeyCount } );
        }
        return [...byParty.entries()].map( ( [party, e] ) => ( { party, holders: e.holders, since: e.since, template: e.template, competing: e.competing } ) )
                                     .sort( ( a, b ) => a.since - b.since );
    } );
    /** The approved dynamic instances, by party. */
    readonly instanceParties = computed<InstanceParty[]>( () => {
        const byParty = new Map<string, { template: string, holders: string[] }>();
        for( const i of this.instances() ?? [] ) {
            const e = byParty.get( i.partyFullName );
            if( e ) e.holders.push( i.holderFullName );
            else byParty.set( i.partyFullName, { template: i.templatePartyName, holders: [i.holderFullName] } );
        }
        return [...byParty.entries()].map( ( [party, e] ) => ( { party, template: e.template, holders: e.holders } ) );
    } );
    /** The template of the party to approve when it is a new dynamic instance. */
    readonly template = computed( () => this.holders().find( h => h.templatePartyName )?.templatePartyName ?? undefined );
    /** The pending approvals of the party to approve: one per holder it waits on. */
    readonly holders = computed( () => ( this.pending() ?? [] ).filter( p => p.partyFullName === this.party ) );
    /**
     * The number of keys that compete for the approval of the party to approve (the highest of its holders): more than one
     * is a sign of an attack (anyone can present keys under the name of a waiting party), or of a party that restarted.
     */
    readonly competing = computed( () => Math.max( 1, ...this.holders().map( h => h.competingKeyCount ) ) );
    // <PostLocalVariables />

    constructor() {
        const timer = setInterval( () => this.#now.set( Date.now() ), 1000 );
        inject( DestroyRef ).onDestroy( () => clearInterval( timer ) );
        // The pending approvals are read once the operator is at the Critical level.
        effect( () => {
            if( this.isCritical() && this.pending() === undefined ) untracked( () => this.refreshAsync() );
        } );
    }

    /** The link of a waiting party: this page, for it. */
    partyLink( party: string ): string {
        return '?party=' + encodeURIComponent( party );
    }

    /** Formats a time of the pending approvals. */
    formatSince( millis: number ): string {
        return new Date( millis ).toLocaleString();
    }

    /** Signs in again at the Critical level, in a popup (from a click). */
    async signInAsync(): Promise<boolean> {
        return await this.#auth.elevateToCritical();
    }

    /**
     * Reads the pending approvals. For the party to approve, the code fields follow its holders (one per holder) while
     * nothing has been entered.
     */
    async refreshAsync(): Promise<void> {
        this.loading.set( true );
        try {
            const list = await this.#cris.sendOrThrowAsync( new GetPendingApprovalsQCommand() );
            this.pending.set( list ?? [] );
            if( this.party === null ) {
                this.instances.set( await this.#cris.sendOrThrowAsync( new GetPartyInstancesQCommand() ) ?? [] );
                this.tickets.set( await this.#cris.sendOrThrowAsync( new GetEnlistmentTicketsQCommand() ) ?? [] );
            }
            const holders = this.holders().length;
            if( this.party !== null && holders > 1 && this.codes().every( c => c.trim().length === 0 ) ) {
                this.codes.set( Array<string>( holders ).fill( '' ) );
            }
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.loading.set( false );
        }
    }

    /**
     * Removes an approved dynamic instance from its holders: its pinned identity is forgotten, it becomes a candidate again
     * when it calls. Like the approval, it requires the Critical level.
     */
    async removeInstanceAsync( party: string ): Promise<void> {
        if( this.removing() !== undefined ) return;
        if( !this.isCritical() && !await this.signInAsync() ) return;
        this.removing.set( party );
        this.error.set( undefined );
        try {
            const c = new RemovePartyInstanceCommand();
            c.partyFullName = party;
            await this.#cris.sendOrThrowAsync( c );
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.removing.set( undefined );
        }
        await this.refreshAsync();
    }

    /**
     * Opens a pre-authorized enlistment ticket for the expected party: the ticket is shown once, the operator gives it to
     * the party (it starts with it and is trusted at once). Like the approval, it requires the Critical level.
     */
    async openTicketAsync(): Promise<void> {
        const party = this.expected().trim();
        if( party.length === 0 || this.openingTicket() ) return;
        if( !this.isCritical() && !await this.signInAsync() ) return;
        this.openingTicket.set( true );
        this.error.set( undefined );
        this.openedTicket.set( undefined );
        try {
            const c = new OpenEnlistmentTicketCommand();
            c.partyFullName = party;
            c.lifetimeHours = this.lifetimeHours();
            const t = await this.#cris.sendOrThrowAsync( c );
            if( !t ) this.error.set( 'The Authentication Center refused the ticket (see its logs).' );
            else this.openedTicket.set( t );
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.openingTicket.set( false );
        }
        await this.refreshAsync();
    }

    /** Revokes an enlistment ticket. */
    async revokeTicketAsync( id: string ): Promise<void> {
        if( this.revoking() !== undefined ) return;
        if( !this.isCritical() && !await this.signInAsync() ) return;
        this.revoking.set( id );
        this.error.set( undefined );
        try {
            const c = new RevokeEnlistmentTicketCommand();
            c.ticketId = id;
            await this.#cris.sendOrThrowAsync( c );
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.revoking.set( undefined );
        }
        await this.refreshAsync();
    }

    setCode( index: number, value: string ): void {
        this.codes.update( c => c.map( ( v, i ) => i === index ? value : v ) );
    }

    addCode(): void {
        this.codes.update( c => [...c, ''] );
    }

    removeCode( index: number ): void {
        this.codes.update( c => c.length > 1 ? c.filter( ( _, i ) => i !== index ) : [''] );
    }

    /** The holder whose code a field is for, when there is one field per holder. */
    codeHolder( index: number ): string | undefined {
        const holders = this.holders();
        return holders.length === this.codes().length ? holders[index]?.holderFullName : undefined;
    }

    /**
     * Sends the approval. When the Critical window is over, the operator signs in again first (the click opens the popup),
     * the codes are kept. The pending approvals are read again after it.
     */
    async approveAsync(): Promise<void> {
        if( this.party === null || !this.canApprove() ) return;
        if( !this.isCritical() && !await this.signInAsync() ) return;
        this.sending.set( true );
        this.error.set( undefined );
        try {
            const c = new ApprovePartyCommand();
            c.partyFullName = this.party;
            c.codes.push( ...this.codes().map( v => v.trim() ).filter( v => v.length > 0 ) );
            this.outcomes.set( await this.#cris.sendOrThrowAsync( c ) ?? [] );
        }
        catch( e ) {
            this.outcomes.set( undefined );
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.sending.set( false );
        }
        await this.refreshAsync();
    }
}
