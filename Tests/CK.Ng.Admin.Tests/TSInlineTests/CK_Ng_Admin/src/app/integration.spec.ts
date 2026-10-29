import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { NgAuthService, AuthLevel, HttpCrisEndpoint, GetUserProfileQCommand, UserService } from '@local/ck-gen';
import { AXIOS } from '@local/ck-gen/CK/Ng/AXIOSToken';
import { ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import axios from 'axios';
import { AppComponent } from './app.component';
import { BasicLoginCommand } from '@local/ck-gen';

function basicLogin( userName: string, password: string ): BasicLoginCommand {
    const c = new BasicLoginCommand();
    c.userName = userName;
    c.password = password;
    return c;
}

if ( process.env["VSCODE_INSPECTOR_OPTIONS"] ) jest.setTimeout( 30 * 60 * 1000 ); // 30 minutes

// CKGenAppModule.Providers ships `{ provide: AXIOS, useValue: axios.create() }`, which is
// evaluated once at module load and reused across every TestBed module. That makes each
// test's AuthService stack a new request interceptor on the shared axios — by the second
// login the previous interceptor still holds a stale token reference, and auth context
// leaks into the next test. Replacing it with a useFactory gives every test a fresh axios
// (and a fresh AuthService.onIntercept registration).
const TEST_PROVIDERS = [
    ...CKGenAppModule.Providers.exclude( "CK.Ng.Axios.AxiosPackage" ),
    { provide: AXIOS, useFactory: () => axios.create() }
];

describe( 'integration tests', () => {
    let ngAuthService: NgAuthService;
    let cris: HttpCrisEndpoint;
    let userService: UserService;

    beforeEach( async () => {
        await TestBed.configureTestingModule(
            {
                imports: [AppComponent],
                providers: [...TEST_PROVIDERS, { provide: ComponentFixtureAutoDetect, useValue: true }]
            } ).compileComponents();

        ngAuthService = TestBed.inject( NgAuthService );
        cris = TestBed.inject( HttpCrisEndpoint );
        userService = TestBed.inject( UserService );
        await ngAuthService.authService.isInitialized;
        await cris.updateAmbientValuesAsync();
    } );

    afterEach( async () => {
        await ngAuthService.authService.logout();
        ngAuthService.authService.close();
    } );

    it( 'should be able to get profile', async () => {
        const authService = ngAuthService.authService;

        expect( authService.level ).toBe( AuthLevel.None );
        expect( ( await authService.refreshSchemesAsync() ).length ).toBeGreaterThan( 0 );

        expect( ngAuthService.authenticationInfo() ).toStrictEqual( authService.authenticationInfo );
        await cris.sendOrThrowAsync( basicLogin( 'TestUser', 'success' ) );
        expect( ngAuthService.level() ).toBeGreaterThanOrEqual( AuthLevel.Normal );
        expect( ngAuthService.authenticationInfo() ).toStrictEqual( authService.authenticationInfo );

        const profile = await cris.sendOrThrowAsync( new GetUserProfileQCommand( authService.actor.actorId ) );
        expect( profile ).not.toBeNull();
        expect( profile!.userName ).toBe( 'TestUser' );
        // CK.Ng.Admin extends user-service with an isAdmin signal computed from groups,
        // so the profile must expose groups and preferredWorkspaceId (from UserProfile.Workspace).
        expect( profile!.groups ).toBeDefined();
        expect( profile!.preferredWorkspaceId ).toBeDefined();
    } );

    // TestUser is a plain member of AdminZone (group 3) with grantLevel 16. The isAdmin signal
    // looks for a group named 'AdminZone' with grantLevel >= 112 (then falls back to the
    // current workspace's grantLevel) — both checks must fail here.
    it( 'TestUser is not admin', async () => {
        await TestBed.inject( HttpCrisEndpoint ).sendOrThrowAsync( basicLogin( 'TestUser', 'success' ) );
        expect( ngAuthService.level() ).toBeGreaterThanOrEqual( AuthLevel.Normal );

        await userService.refreshUserProfileAsync();

        expect( userService.userProfile() ).toBeDefined();
        expect( userService.userProfile()!.userName ).toBe( 'TestUser' );
        expect( userService.isAdmin() ).toBe( false );
    } );

    // AdminUser is a member of Administrators (group 2). Administrators and AdminZone share
    // the same AclId, so CK.fAclGrantLevel returns 127 for AdminUser on AdminZone -> the
    // isAdmin signal's 'AdminZone' branch must fire.
    it( 'AdminUser is admin', async () => {
        await TestBed.inject( HttpCrisEndpoint ).sendOrThrowAsync( basicLogin( 'AdminUser', 'success' ) );
        expect( ngAuthService.level() ).toBeGreaterThanOrEqual( AuthLevel.Normal );

        await userService.refreshUserProfileAsync();

        expect( userService.userProfile() ).toBeDefined();
        expect( userService.userProfile()!.userName ).toBe( 'AdminUser' );
        expect( userService.isAdmin() ).toBe( true );
    } );
} );
