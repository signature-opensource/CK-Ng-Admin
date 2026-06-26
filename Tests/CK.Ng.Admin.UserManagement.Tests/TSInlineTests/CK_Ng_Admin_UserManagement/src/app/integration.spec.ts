import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import axios from 'axios';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { AXIOS } from '@local/ck-gen/CK/Ng/AXIOSToken';
import {
  NgAuthService,
  AuthLevel,
  HttpCrisEndpoint,
  UserService,
  UserMessageLevel,
  CreateInvitationCommand,
  GetWorkspaceUsersQCommand,
  GetWorkspaceInvitationDataQCommand,
  GetWorkspacePendingInvitationsQCommand
} from '@local/ck-gen';
import { DEFAULT_LOCALE_INFO } from '@local/ck-gen/ts-locales/locales';

if ( process.env["VSCODE_INSPECTOR_OPTIONS"] ) jest.setTimeout( 30 * 60 * 1000 ); // 30 minutes

// CKGenAppModule.Providers ships a single shared `axios.create()` instance; replacing it with a
// per-test factory avoids the AuthService request-interceptor leaking auth state between tests
// (same workaround as CK.Ng.Admin.Tests).
const TEST_PROVIDERS = [
  ...CKGenAppModule.Providers.exclude( "CK.Ng.Axios.AxiosPackage" ),
  { provide: AXIOS, useFactory: () => axios.create() },
  provideZonelessChangeDetection()
];

describe( 'user-management integration', () => {
  let ngAuthService: NgAuthService;
  let cris: HttpCrisEndpoint;
  let userService: UserService;

  beforeEach( async () => {
    await TestBed.configureTestingModule( { providers: TEST_PROVIDERS } ).compileComponents();
    ngAuthService = TestBed.inject( NgAuthService );
    cris = TestBed.inject( HttpCrisEndpoint );
    userService = TestBed.inject( UserService );
    await ngAuthService.authService.isInitialized;
    await cris.updateAmbientValuesAsync();
  } );

  afterEach( async () => {
    await ngAuthService.authService.logout();
  } );

  it( 'a workspace admin creates an invitation and lists the workspace users', async () => {
    await ngAuthService.authService.basicLogin( 'UMAdmin', 'success' );
    expect( ngAuthService.authenticationInfo().level ).toBe( AuthLevel.Normal );

    // Sets the current workspace (and the CRIS ambient currentWorkspaceId) from the profile.
    await cris.updateAmbientValuesAsync();
    await userService.refreshUserProfileAsync();
    expect( userService.currentWorkspace() ).toBeDefined();

    // Attach the invitation to a workspace group so it shows up in the workspace-scoped pending list
    // (the workspace pending query filters invitations by the workspace their groups belong to).
    const invitationData = await cris.sendOrThrowAsync( new GetWorkspaceInvitationDataQCommand() );
    const groups = invitationData.groups.length > 0 ? [invitationData.groups[0].groupId] : [];

    const email = `um-invite-${Date.now()}@test.local`;
    const message = await cris.sendOrThrowAsync( new CreateInvitationCommand( email, groups, DEFAULT_LOCALE_INFO.id ) );
    expect( message.level ).not.toBe( UserMessageLevel.Error );

    const users = await cris.sendOrThrowAsync( new GetWorkspaceUsersQCommand() );
    expect( users.some( u => u.userName === 'UMAdmin' ) ).toBe( true );

    const pending = await cris.sendOrThrowAsync( new GetWorkspacePendingInvitationsQCommand() );
    expect( pending.some( i => i.email === email ) ).toBe( true );
  } );

  it( 'creating the same invitation twice returns an error-level message', async () => {
    await ngAuthService.authService.basicLogin( 'UMAdmin', 'success' );
    await cris.updateAmbientValuesAsync();
    await userService.refreshUserProfileAsync();

    const email = `um-dup-${Date.now()}@test.local`;
    const first = await cris.sendOrThrowAsync( new CreateInvitationCommand( email, [], DEFAULT_LOCALE_INFO.id ) );
    expect( first.level ).not.toBe( UserMessageLevel.Error );

    const second = await cris.sendOrThrowAsync( new CreateInvitationCommand( email, [], DEFAULT_LOCALE_INFO.id ) );
    expect( second.level ).toBe( UserMessageLevel.Error );
  } );

  it( 'a plain member is not allowed to create an invitation', async () => {
    await ngAuthService.authService.basicLogin( 'UMMember', 'success' );
    expect( ngAuthService.authenticationInfo().level ).toBe( AuthLevel.Normal );
    await cris.updateAmbientValuesAsync();
    await userService.refreshUserProfileAsync();

    // UMMember belongs to the workspace but is not an administrator: AdminCommandValidator rejects
    // the command, which surfaces as a thrown CrisResultError.
    await expect(
      cris.sendOrThrowAsync( new CreateInvitationCommand( `um-forbidden-${Date.now()}@test.local`, [], DEFAULT_LOCALE_INFO.id ) )
    ).rejects.toBeDefined();
  } );

  it( 'UMAdmin is recognized as workspace admin, UMMember is not', async () => {
    await ngAuthService.authService.basicLogin( 'UMAdmin', 'success' );
    await cris.updateAmbientValuesAsync();
    await userService.refreshUserProfileAsync();
    expect( userService.isAdmin() ).toBe( true );

    await ngAuthService.authService.logout();

    await ngAuthService.authService.basicLogin( 'UMMember', 'success' );
    await cris.updateAmbientValuesAsync();
    await userService.refreshUserProfileAsync();
    expect( userService.isAdmin() ).toBe( false );
  } );
} );
