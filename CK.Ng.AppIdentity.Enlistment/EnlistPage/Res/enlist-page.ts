import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ApprovePartyCommand, AuthLevel, HttpCrisEndpoint, NgAuthService, PartyApprovalOutcome, PartyApprovalStatus } from '@local/ck-gen';

/**
 * The approval page: the operator approves the party named by "?party=" with the codes read on it (one per party it
 * waits on). The approval requires the Critical level: the operator signs in again in a popup, the page keeps the codes.
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
    /** The full name of the party to approve ("?party="), null when there is none. */
    readonly party: string | null = this.#route.snapshot.queryParamMap.get( 'party' );
    /** The codes entered by the operator. */
    readonly codes = signal<string[]>( [''] );
    readonly sending = signal( false );
    /** The outcomes of the last approval (one per holder), undefined before any approval. */
    readonly outcomes = signal<PartyApprovalOutcome[] | undefined>( undefined );
    /** The error of the last approval. */
    readonly error = signal<string | undefined>( undefined );
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
    // <PostLocalVariables />

    constructor() {
        const timer = setInterval( () => this.#now.set( Date.now() ), 1000 );
        inject( DestroyRef ).onDestroy( () => clearInterval( timer ) );
    }

    /** Signs in again at the Critical level, in a popup (from a click). */
    async signInAsync(): Promise<boolean> {
        return await this.#auth.elevateToCritical();
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

    /**
     * Sends the approval. When the Critical window is over, the operator signs in again first (the click opens the popup),
     * the codes are kept.
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
    }
}
