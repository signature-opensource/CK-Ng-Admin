import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormField, form } from '@angular/forms/signals';
import { TranslateService } from '@ngx-translate/core';
import { NzSelectComponent } from 'ng-zorro-antd/select';
import { GroupInfos, UserWorkspaceGroupPicker } from '@local/ck-gen';
import { appConfig } from './app.config';

@Component( {
  selector: 'test-group-picker-host',
  imports: [FormField, UserWorkspaceGroupPicker],
  template: `<ck-user-workspace-group-picker [formField]="userForm.groups" [groups]="groups" />`
} )
class GroupPickerHost {
  readonly model = signal<{ groups: number[] }>( { groups: [] } );
  readonly userForm = form( this.model );
  readonly groups = [new GroupInfos( 1, 'Lyon', false, 3, 'AdminZone' ), new GroupInfos( 2, 'Paris', false, 3, 'AdminZone' )];
}

describe( 'ck-user-workspace-group-picker', () => {
  let fixture: ComponentFixture<GroupPickerHost>;

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const host = () => fixture.nativeElement as HTMLElement;
  // A click on the select toggles its dropdown, which stays open after an option click in multiple mode.
  // The dropdown's virtual scroll viewport renders its options one animation frame after opening.
  const tick = async ( groupName: string ) => {
    const select = host().querySelector<HTMLElement>( 'nz-select' )!;
    if ( !select.classList.contains( 'ant-select-open' ) ) {
      select.querySelector<HTMLElement>( '.ant-select-selector' )!.click();
      await render();
      await new Promise( r => requestAnimationFrame( r ) );
      await render();
    }
    Array.from( document.querySelectorAll<HTMLElement>( 'nz-option-item' ) )
      .find( o => o.textContent?.includes( groupName ) )!
      .click();
    await render();
  };

  beforeEach( async () => {
    await TestBed.configureTestingModule( {
      providers: appConfig.providers,
      imports: [GroupPickerHost]
    } ).compileComponents();
    fixture = TestBed.createComponent( GroupPickerHost );
    await render();
  } );

  it( 'bound with [formField], ticking a group writes its id into the model', async () => {
    await tick( 'Paris' );

    expect( fixture.componentInstance.model().groups ).toEqual( [2] );
  } );

  it( 'model value checks the matching groups', async () => {
    fixture.componentInstance.model.set( { groups: [2] } );
    await render();

    const member = TestBed.inject( TranslateService ).instant( 'CK.Admin.UserManagement.Role.Member' );
    const tags = Array.from( host().querySelectorAll( 'nz-select-item' ) ).map( t => t.getAttribute( 'title' ) );
    expect( tags ).toEqual( [`Paris - ${member}`] );
  } );

  it( 'leaving the picker without a change marks the field touched', async () => {
    const field = fixture.componentInstance.userForm.groups;
    expect( field().touched() ).toBe( false );

    fixture.debugElement.query( By.directive( NzSelectComponent ) ).triggerEventHandler( 'nzBlur' );
    await render();

    expect( field().touched() ).toBe( true );
    expect( fixture.componentInstance.model().groups ).toEqual( [] );
  } );
} );
