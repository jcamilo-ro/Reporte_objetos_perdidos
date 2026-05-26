import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guardia de acceso para administración.
 * Evita entrar al panel administrador sin sesión iniciada y redirige al login
 * simulado. Más adelante puede validar tokens emitidos por Django.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.sesionActiva()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
