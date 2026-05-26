import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Encabezado principal de la aplicación.
 * Provee navegación por rutas y muestra cierre de sesión cuando el administrador
 * inició sesión con la autenticación simulada.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  readonly authService = inject(AuthService);

  cerrarSesion(): void {
    this.authService.cerrarSesion();
  }
}
