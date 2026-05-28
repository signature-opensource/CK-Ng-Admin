import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';
import { HttpCrisEndpoint } from '@local/ck-gen';

describe( 'AppComponent', () => {
  let cris: HttpCrisEndpoint;

  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      // Added by CK.TS.AngularEngine: DI is fully configured and available in tests.
      providers: appConfig.providers,
      imports: [AppComponent],
    } ).compileComponents();

    cris = TestBed.inject( HttpCrisEndpoint );
    await cris.updateAmbientValuesAsync();
  } );

  it( 'should create the app', () => {
    const fixture = TestBed.createComponent( AppComponent );
    const app = fixture.componentInstance;
    expect( app ).toBeTruthy();
  } );

  it( `should have the 'CK_Ng_Admin' title`, () => {
    const fixture = TestBed.createComponent( AppComponent );
    const app = fixture.componentInstance;
    expect( app.title ).toEqual( 'CK_Ng_Admin' );
  } );

  it( 'should render title', () => {
    const fixture = TestBed.createComponent( AppComponent );
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect( compiled.querySelector( 'h1' )?.textContent ).toContain( 'Hello, CK_Ng_Admin' );
  } );
} );
