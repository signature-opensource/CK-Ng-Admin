import { TestBed } from '@angular/core/testing';
import { UserManagementPage, UsersTab, InvitationsTable, HttpCrisEndpoint } from '@local/ck-gen';
import { appConfig } from './app.config';

/**
 * Smoke tests: the user-management components must instantiate with the fully generated DI.
 * Change detection is intentionally NOT triggered — these assert construction only, leaving the
 * backend-driven ngOnInit flows to the integration spec.
 */
describe( 'user-management components', () => {
  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      providers: appConfig.providers,
      imports: [UserManagementPage, UsersTab, InvitationsTable]
    } ).compileComponents();

    const cris = TestBed.inject( HttpCrisEndpoint );
    await cris.updateAmbientValuesAsync();
  } );

  it( 'creates the user-management page', () => {
    const fixture = TestBed.createComponent( UserManagementPage );
    expect( fixture.componentInstance ).toBeTruthy();
  } );

  it( 'creates the users tab', () => {
    const fixture = TestBed.createComponent( UsersTab );
    expect( fixture.componentInstance ).toBeTruthy();
  } );

  it( 'creates the invitations table', () => {
    const fixture = TestBed.createComponent( InvitationsTable );
    expect( fixture.componentInstance ).toBeTruthy();
  } );
} );
