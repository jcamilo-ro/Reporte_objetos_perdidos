import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './shared/components/app-header/app-header.component';
import { AppModalComponent } from './shared/components/app-modal/app-modal.component';

/**
 * Componente raíz de la aplicación Angular.
 * Conecta el encabezado compartido con el enrutador donde se renderiza el
 * dashboard principal.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, AppModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
