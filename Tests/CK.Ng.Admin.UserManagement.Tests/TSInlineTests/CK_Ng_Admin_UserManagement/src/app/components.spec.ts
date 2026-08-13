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

  // The "Groups" column renders one tag per workspace: the current workspace shows its roles only,
  // the others are prefixed with their name. Zone groups carry the mere membership of a workspace.
  it( 'builds one group tag per workspace and prefixes the other workspaces', () => {
    const fixture = TestBed.createComponent( UsersTab );
    // The workspace input is what tells which tag must not be prefixed.
    fixture.componentRef.setInput( 'workspace', { groupId: 3, groupName: 'AdminZone', isZone: true, zoneId: 0, zoneName: '' } );
    // groupTags is protected: it is the template that calls it.
    const groupTags = ( u: unknown ): Array<{ label: string, isAdmin: boolean }> =>
      ( fixture.componentInstance as any ).groupTags( u );

    // Administrator of the current workspace + ContentManager of another one. A zone group is its own
    // workspace: CK.vGroup gives it no zoneId/zoneName, hence the empty values below.
    const tags = groupTags( {
      groups: [
        { groupId: 3, groupName: 'AdminZone', isZone: true, zoneId: 0, zoneName: '' },
        { groupId: 2, groupName: 'Administrators', isZone: false, zoneId: 3, zoneName: 'AdminZone' },
        { groupId: 15, groupName: 'Villars', isZone: true, zoneId: 0, zoneName: '' },
        { groupId: 17, groupName: 'ContentManager', isZone: false, zoneId: 15, zoneName: 'Villars' }
      ]
    } );

    expect( tags.length ).toBe( 2 );
    // Current workspace: the roles only (the administrator label is translated).
    expect( tags[0].isAdmin ).toBe( true );
    expect( tags[0].label ).not.toContain( ':' );
    expect( tags[1] ).toEqual( { label: 'Villars: ContentManager', isAdmin: false } );

    // Several groups in the same workspace are joined into a single tag.
    const joined = groupTags( {
      groups: [
        { groupId: 15, groupName: 'Villars', isZone: true, zoneId: 0, zoneName: '' },
        { groupId: 17, groupName: 'ContentManager', isZone: false, zoneId: 15, zoneName: 'Villars' },
        { groupId: 18, groupName: 'Accounting', isZone: false, zoneId: 15, zoneName: 'Villars' }
      ]
    } );
    expect( joined.length ).toBe( 1 );
    expect( joined[0].label ).toBe( 'Villars: ContentManager, Accounting' );

    // Belonging to a workspace without any other group: a plain member of it, prefix included.
    const memberOnly = groupTags( { groups: [{ groupId: 15, groupName: 'Villars', isZone: true, zoneId: 0, zoneName: '' }] } );
    expect( memberOnly.length ).toBe( 1 );
    expect( memberOnly[0].isAdmin ).toBe( false );
    expect( memberOnly[0].label.startsWith( 'Villars: ' ) ).toBe( true );
  } );
} );
