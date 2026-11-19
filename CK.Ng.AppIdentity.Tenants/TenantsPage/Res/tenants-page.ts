import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { AuthLevel, CreateTenantInstanceCommand, GetTenantHostsQCommand, GetTenantInstancesQCommand, HttpCrisEndpoint, NgAuthService, RemoveTenantInstanceCommand, SetTenantIndexCommand, TenantInstanceInfo, TenantTemplateInfo } from '@local/ck-gen';

/** An application that holds Opened tenant templates, with its templates (undefined until they are read). */
export interface TenantHost {
    readonly host: string;
    readonly templates?: ReadonlyArray<TenantTemplateInfo>;
    readonly error?: string;
}

/**
 * The tenants page. At the Critical level, it lists the applications that hold Opened tenant templates (found among the
 * remotes of its application and of the hub of the System), their templates and their tenants. A run-time tenant is created by its name (its index is the first
 * free one), moved to a free index, or removed (its identity is deleted: it needs a confirmation).
 */
@Component( {
    selector: 'ck-tenants-page',
    imports: [
        FormsModule,
        TranslatePipe,
        NzAlertModule,
        NzButtonModule,
        NzInputModule
    ],
    templateUrl: './tenants-page.html'
} )
export class TenantsPage {
    // <PreDependencyInjection revert />
    readonly #auth = inject( NgAuthService );
    readonly #cris = inject( HttpCrisEndpoint );
    // <PostDependencyInjection />

    // <PreLocalVariables revert />
    /** The applications that hold tenant templates, undefined before they are read. */
    readonly hosts = signal<TenantHost[] | undefined>( undefined );
    readonly loading = signal( false );
    /** The operation in progress (its key), undefined when there is none. */
    readonly busy = signal<string | undefined>( undefined );
    /** The error of the last command. */
    readonly error = signal<string | undefined>( undefined );
    /** The names entered for the new tenants, by template ("host|template"). */
    readonly newNames = signal<Readonly<Record<string, string>>>( {} );
    /** The indices entered to move a tenant, by its full name. */
    readonly newIndices = signal<Readonly<Record<string, string>>>( {} );
    /** The tenant whose removal waits for its confirmation. */
    readonly confirmingRemoval = signal<string | undefined>( undefined );
    readonly #now = signal( Date.now() );
    /** The seconds left in the Critical window: 0 when the operator is not at the Critical level. */
    readonly secondsLeft = computed( () => {
        if( this.#auth.level() !== AuthLevel.Critical ) return 0;
        const end = this.#auth.authenticationInfo().criticalExpires?.toMillis() ?? 0;
        return Math.max( 0, Math.floor( (end - this.#now()) / 1000 ) );
    } );
    readonly isCritical = computed( () => this.secondsLeft() > 0 );
    // <PostLocalVariables />

    constructor() {
        const timer = setInterval( () => this.#now.set( Date.now() ), 1000 );
        inject( DestroyRef ).onDestroy( () => clearInterval( timer ) );
        // The tenants are read once the operator is at the Critical level.
        effect( () => {
            if( this.isCritical() && this.hosts() === undefined ) untracked( () => this.refreshAsync() );
        } );
    }

    /** Signs in again at the Critical level, in a popup (from a click). */
    async signInAsync(): Promise<boolean> {
        return await this.#auth.elevateToCritical();
    }

    /** The key of a template in the forms of the page. */
    templateKey( host: string, template: TenantTemplateInfo ): string {
        return host + '|' + template.templateName;
    }

    /** Whether an instance is a run-time one that can be moved or removed. */
    isRuntime( instance: TenantInstanceInfo ): boolean {
        return !instance.isConfigured;
    }

    setNewName( key: string, value: string ): void {
        this.newNames.update( n => ( { ...n, [key]: value } ) );
    }

    setNewIndex( fullName: string, value: string ): void {
        this.newIndices.update( n => ( { ...n, [fullName]: value } ) );
    }

    /**
     * Reads the applications that accept the tenant commands, then the templates of each one: an application without
     * template is not shown (it may only have the handlers).
     */
    async refreshAsync(): Promise<void> {
        this.loading.set( true );
        this.error.set( undefined );
        try {
            const hosts = await this.#cris.sendOrThrowAsync( new GetTenantHostsQCommand() ) ?? [];
            const result: TenantHost[] = [];
            for( const host of hosts ) {
                try {
                    const q = new GetTenantInstancesQCommand();
                    q.targetPartyFullName = host;
                    const templates = await this.#cris.sendOrThrowAsync( q ) ?? [];
                    if( templates.length > 0 ) result.push( { host, templates } );
                }
                catch( e ) {
                    result.push( { host, error: e instanceof Error ? e.message : String( e ) } );
                }
            }
            this.hosts.set( result );
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.loading.set( false );
        }
    }

    // Executes an operation at the Critical level (the operator signs in again when the window is over), then reads again.
    async #runAsync( key: string, action: () => Promise<unknown> ): Promise<void> {
        if( this.busy() !== undefined ) return;
        if( !this.isCritical() && !await this.signInAsync() ) return;
        this.busy.set( key );
        this.error.set( undefined );
        try {
            await action();
        }
        catch( e ) {
            this.error.set( e instanceof Error ? e.message : String( e ) );
        }
        finally {
            this.busy.set( undefined );
        }
        await this.refreshAsync();
    }

    /** Creates a tenant of a template, named by the operator. */
    async createAsync( host: string, template: TenantTemplateInfo ): Promise<void> {
        const key = this.templateKey( host, template );
        const name = ( this.newNames()[key] ?? '' ).trim();
        if( name.length === 0 ) return;
        await this.#runAsync( key, async () => {
            const c = new CreateTenantInstanceCommand();
            c.targetPartyFullName = host;
            c.templateName = template.templateName;
            c.name = name;
            await this.#cris.sendOrThrowAsync( c );
            this.setNewName( key, '' );
        } );
    }

    /** Moves a run-time tenant to the index entered by the operator. */
    async moveAsync( host: string, instance: TenantInstanceInfo ): Promise<void> {
        const index = Number.parseInt( this.newIndices()[instance.fullName] ?? '', 10 );
        if( !Number.isInteger( index ) || index <= 0 ) return;
        await this.#runAsync( instance.fullName, async () => {
            const c = new SetTenantIndexCommand();
            c.targetPartyFullName = host;
            c.tenantFullName = instance.fullName;
            c.index = index;
            await this.#cris.sendOrThrowAsync( c );
            this.setNewIndex( instance.fullName, '' );
        } );
    }

    /** First click: asks for the confirmation. Second click (the confirmation): removes the run-time tenant. */
    async removeAsync( host: string, instance: TenantInstanceInfo ): Promise<void> {
        if( this.confirmingRemoval() !== instance.fullName ) {
            this.confirmingRemoval.set( instance.fullName );
            return;
        }
        this.confirmingRemoval.set( undefined );
        await this.#runAsync( instance.fullName, async () => {
            const c = new RemoveTenantInstanceCommand();
            c.targetPartyFullName = host;
            c.tenantFullName = instance.fullName;
            await this.#cris.sendOrThrowAsync( c );
        } );
    }

    cancelRemoval(): void {
        this.confirmingRemoval.set( undefined );
    }
}
