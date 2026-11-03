import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app';
import { appConfig } from './app.config';

describe( 'AppComponent', () => {
  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      // Added by CK.TS.AngularEngine: DI is fully configured and available in tests.
      providers: appConfig.providers,
      imports: [AppComponent],
    } ).compileComponents();
  } );

  it( 'should create the app', () => {
    const fixture = TestBed.createComponent( AppComponent );
    const app = fixture.componentInstance;
    expect( app ).toBeTruthy();
  } );
} );
