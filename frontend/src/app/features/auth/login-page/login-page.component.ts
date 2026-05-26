import { Component, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Página de inicio de sesión administrativa.
 * Usa credenciales simuladas para proteger el panel administrador sin agregar
 * todavía backend de autenticación.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal('');

  readonly formulario = this.formBuilder.nonNullable.group({
    usuario: ['', Validators.required],
    contrasena: ['', Validators.required]
  });

  ingresar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.error.set('Ingresa usuario y contraseña.');
      return;
    }

    const { usuario, contrasena } = this.formulario.getRawValue();

    if (!this.authService.iniciarSesion(usuario, contrasena)) {
      this.error.set('Credenciales incorrectas. Usa admin y la contraseña en minúsculas.');
      return;
    }

    this.router.navigate(['/admin']);
  }
}
