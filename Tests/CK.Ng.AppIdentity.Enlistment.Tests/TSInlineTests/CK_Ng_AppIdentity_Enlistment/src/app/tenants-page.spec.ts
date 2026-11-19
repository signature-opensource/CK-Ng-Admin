import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthLevel, BasicLoginCommand, HttpCrisEndpoint, NgAuthService, TenantsPage } from '@local/ck-gen';
import { appConfig } from './app.config';

if( process.env["VSCODE_INSPECTOR_OPTIONS"] ) jest.setTimeout( 30 * 60 * 1000 ); // 30 minutes

// The FakeTenantHandler of the test project: the application is the only host, with the template "Test/Customers"
// (at most 4 tenants): "Configured" (#1), "Acme" (#2, a run-time tenant), "Beta" (not loaded: its index is taken).
describe( 'TenantsPage', () => {
    let auth: NgAuthService;
    let cris: HttpCrisEndpoint;

    async function createAsync(): Promise<ComponentFixture<TenantsPage>> {
        await TestBed.configureTestingModule( {
            providers: [...appConfig.providers],
            imports: [TenantsPage]
        } ).compileComponents();
        auth = TestBed.inject( NgAuthService );
        cris = TestBed.inject( HttpCrisEndpoint );
        await auth.authService.isInitialized;
        await cris.updateAmbientValuesAsync();
        const fixture = TestBed.createComponent( TenantsPage );
        fixture.detectChanges();
        return fixture;
    }

    async function signInAsync(): Promise<void> {
        const login = new BasicLoginCommand();
        login.userName = 'TestUser';
        login.password = 'success';
        await cris.sendOrThrowAsync( login );
        expect( auth.level() ).toBe( AuthLevel.Critical );
    }

    function query( fixture: ComponentFixture<TenantsPage>, selector: string ): NodeListOf<Element> {
        fixture.detectChanges();
        return ( fixture.nativeElement as HTMLElement ).querySelectorAll( selector );
    }

    // An absent optional value is undefined in the TypeScript Poco: null here, to compare.
    function names( page: TenantsPage ): Array<[string, number | null, boolean, string | null]> {
        return page.hosts()![0].templates![0].instances.map( i => [i.name, i.index ?? null, i.isConfigured, i.unloadedReason ?? null] );
    }

    afterEach( async () => {
        await auth.authService.logout();
        auth.authService.close();
    } );

    it( 'asks to sign in until the operator is at the Critical level', async () => {
        const fixture = await createAsync();
        const page = fixture.componentInstance;
        expect( page.isCritical() ).toBe( false );
        expect( query( fixture, '.ck-tenants-sign-in' ).length ).toBe( 1 );
        expect( page.hosts() ).toBeUndefined();
        await signInAsync();
        expect( page.isCritical() ).toBe( true );
        expect( query( fixture, '.ck-tenants-sign-in' ).length ).toBe( 0 );
    } );

    it( 'lists the tenants of the hosts, creates, moves and removes a run-time tenant', async () => {
        const fixture = await createAsync();
        const page = fixture.componentInstance;
        await signInAsync();
        await page.refreshAsync();
        expect( page.error() ).toBeUndefined();
        const hosts = page.hosts()!;
        expect( hosts.length ).toBe( 1 );
        const host = hosts[0].host;
        const template = hosts[0].templates![0];
        expect( template.templateName ).toBe( 'Test/Customers' );
        expect( names( page ) ).toEqual( [['Configured', 1, true, null], ['Acme', 2, false, null], ['Beta', 1, false, 'IndexTaken']] );
        expect( query( fixture, '.ck-tenants-instance' ).length ).toBe( 3 );
        expect( query( fixture, '.ck-tenants-unloaded' ).length ).toBe( 1 );
        // The configured tenant can't be moved nor removed.
        expect( query( fixture, '.ck-tenants-move' ).length ).toBe( 2 );

        // Created by its name: the first free index.
        page.setNewName( page.templateKey( host, template ), 'Gamma' );
        await page.createAsync( host, template );
        expect( page.error() ).toBeUndefined();
        expect( names( page ).find( n => n[0] === 'Gamma' ) ).toEqual( ['Gamma', 3, false, null] );

        // The unloaded tenant is moved to a free index: it is loaded.
        const beta = page.hosts()![0].templates![0].instances.find( i => i.name === 'Beta' )!;
        page.setNewIndex( beta.fullName, '4' );
        await page.moveAsync( host, beta );
        expect( names( page ).find( n => n[0] === 'Beta' ) ).toEqual( ['Beta', 4, false, null] );

        // A removal asks for a confirmation.
        const acme = page.hosts()![0].templates![0].instances.find( i => i.name === 'Acme' )!;
        await page.removeAsync( host, acme );
        expect( page.confirmingRemoval() ).toBe( acme.fullName );
        expect( query( fixture, '.ck-tenants-remove-confirm' ).length ).toBe( 1 );
        expect( names( page ).some( n => n[0] === 'Acme' ) ).toBe( true );
        await page.removeAsync( host, acme );
        expect( page.confirmingRemoval() ).toBeUndefined();
        expect( names( page ).some( n => n[0] === 'Acme' ) ).toBe( false );
    } );
} );
