import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthLevel, BasicLoginCommand, EnlistPage, HttpCrisEndpoint, NgAuthService, PartyApprovalStatus } from '@local/ck-gen';
import { appConfig } from './app.config';

if( process.env["VSCODE_INSPECTOR_OPTIONS"] ) jest.setTimeout( 30 * 60 * 1000 ); // 30 minutes

// The FakeApprovalHandler of the test project: "Test/$D" waits on "Test/$Holder", whose code is "1234-5678".
const goodCode = '1234-5678';

describe( 'EnlistPage', () => {
    let auth: NgAuthService;
    let cris: HttpCrisEndpoint;

    // The page reads "?party=" from its route.
    async function createAsync( party: string | null ): Promise<ComponentFixture<EnlistPage>> {
        await TestBed.configureTestingModule( {
            providers: [
                ...appConfig.providers,
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap( party !== null ? { party } : {} ) } } }
            ],
            imports: [EnlistPage]
        } ).compileComponents();
        auth = TestBed.inject( NgAuthService );
        cris = TestBed.inject( HttpCrisEndpoint );
        await auth.authService.isInitialized;
        await cris.updateAmbientValuesAsync();
        const fixture = TestBed.createComponent( EnlistPage );
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

    function query( fixture: ComponentFixture<EnlistPage>, selector: string ): NodeListOf<Element> {
        fixture.detectChanges();
        return ( fixture.nativeElement as HTMLElement ).querySelectorAll( selector );
    }

    afterEach( async () => {
        await auth.authService.logout();
        auth.authService.close();
    } );

    it( 'has nothing to approve without a party', async () => {
        const fixture = await createAsync( null );
        expect( fixture.componentInstance.party ).toBeNull();
        expect( query( fixture, '.ck-enlist-approve' ).length ).toBe( 0 );
    } );

    it( 'asks to sign in until the operator is at the Critical level', async () => {
        const fixture = await createAsync( 'Test/$D' );
        const page = fixture.componentInstance;
        expect( page.party ).toBe( 'Test/$D' );
        expect( page.isCritical() ).toBe( false );
        expect( query( fixture, '.ck-enlist-sign-in' ).length ).toBe( 1 );
        await signInAsync();
        expect( page.isCritical() ).toBe( true );
        expect( page.secondsLeft() ).toBeGreaterThan( 0 );
        expect( query( fixture, '.ck-enlist-sign-in' ).length ).toBe( 0 );
        expect( query( fixture, '.ck-enlist-time-left' ).length ).toBe( 1 );
    } );

    it( 'shows the outcome per holder: a wrong code, then the right one among others', async () => {
        const fixture = await createAsync( 'Test/$D' );
        const page = fixture.componentInstance;
        await signInAsync();
        expect( page.canApprove() ).toBe( false );

        page.setCode( 0, '0000-0000' );
        await page.approveAsync();
        expect( page.error() ).toBeUndefined();
        expect( page.outcomes()!.map( o => [o.holderFullName, o.status] ) ).toEqual( [['Test/$Holder', PartyApprovalStatus.CodeMismatch]] );
        expect( query( fixture, '.ck-enlist-outcome' ).length ).toBe( 1 );

        // A party that waits on several holders shows several codes: they are all sent.
        page.addCode();
        page.setCode( 1, goodCode );
        expect( page.codes() ).toEqual( ['0000-0000', goodCode] );
        await page.approveAsync();
        expect( page.outcomes()!.map( o => [o.holderFullName, o.status] ) ).toEqual( [['Test/$Holder', PartyApprovalStatus.Approved]] );

        page.removeCode( 0 );
        expect( page.codes() ).toEqual( [goodCode] );
    } );

    it( 'says when no party waits for the approval of the party', async () => {
        const fixture = await createAsync( 'Test/$Nobody' );
        const page = fixture.componentInstance;
        await signInAsync();
        page.setCode( 0, goodCode );
        await page.approveAsync();
        expect( page.outcomes()!.length ).toBe( 0 );
        expect( query( fixture, '.ck-enlist-outcome' ).length ).toBe( 1 );
    } );
} );
