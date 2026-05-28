import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CKGenAppModule } from '@local/ck-gen/CK/Angular/CKGenAppModule';
import { CommonModule } from '@angular/common';

@Component( {
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, CKGenAppModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.less'
} )
export class AppComponent {

  title = 'CK_Ng_Admin';
}
