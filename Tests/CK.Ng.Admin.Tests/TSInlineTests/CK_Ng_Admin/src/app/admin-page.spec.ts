import { TestBed } from '@angular/core/testing';
import { AdminPage, HttpCrisEndpoint } from '@local/ck-gen';
import { appConfig } from './app.config';

describe( 'AdminPage', () => {
  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      // Added by CK.TS.AngularEngine: DI is fully configured and available in tests.
      providers: appConfig.providers,
      imports: [AdminPage],
    } ).compileComponents();

    const cris = TestBed.inject( HttpCrisEndpoint );
    await cris.updateAmbientValuesAsync();
  } );

  it( 'should create the admin page', () => {
    const fixture = TestBed.createComponent( AdminPage );
    expect( fixture.componentInstance ).toBeTruthy();
  } );

  it( 'should host a router outlet for the admin child routes', () => {
    const fixture = TestBed.createComponent( AdminPage );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect( compiled.querySelector( 'router-outlet' ) ).not.toBeNull();
  } );
} );
