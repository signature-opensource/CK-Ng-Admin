import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ApprovePartyCommand, AuthLevel, GetPendingApprovalsQCommand, HttpCrisEndpoint, NgAuthService, PartyApprovalOutcome, PartyApprovalStatus, PendingApproval } from '@local/ck-gen';

/** A party that waits for an approval, with the holders of its pending approvals. */
export interface WaitingParty {
    readonly party: string;
    readonly holders: ReadonlyArray<string>;
    /** The oldest pending approval of the party (milliseconds). */
    readonly since: number;
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
        const byParty = new Map<string, { holders: string[], since: number }>();
        for( const p of this.pending() ?? [] ) {
            const since = p.since.toMillis();
            const e = byParty.get( p.partyFullName );
            if( e ) {
                e.holders.push( p.holderFullName );
                e.since = Math.min( e.since, since );
            }
            else byParty.set( p.partyFullName, { holders: [p.holderFullName], since } );
        }
        return [...byParty.entries()].map( ( [party, e] ) => ( { party, holders: e.holders, since: e.since } ) )
                                     .sort( ( a, b ) => a.since - b.since );
    } );
    /** The pending approvals of the party to approve: one per holder it waits on. */
    readonly holders = computed( () => ( this.pending() ?? [] ).filter( p => p.partyFullName === this.party ) );
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
