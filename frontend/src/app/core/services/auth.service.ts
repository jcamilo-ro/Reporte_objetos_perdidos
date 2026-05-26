import { Injectable, computed, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

/**
 * Servicio de autenticación simulada.
 * Controla el ingreso al modo administrador con credenciales locales y deja una
 * capa clara para reemplazarla después por autenticación real con Django.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageService = inject(StorageService);
  private readonly storageKey = 'udenar-admin-auth';
  private readonly sesionSignal = signal<boolean>(this.storageService.obtener<boolean>(this.storageKey) ?? false);

  readonly sesionActiva = this.sesionSignal.asReadonly();
  readonly nombreRol = computed(() => (this.sesionSignal() ? 'Administrador' : 'Usuario público'));

  iniciarSesion(usuario: string, contrasena: string): boolean {
    const credencialesValidas = usuario.trim() === 'admin' && contrasena === '123abc';

    if (credencialesValidas) {
      this.sesionSignal.set(true);
      this.storageService.guardar(this.storageKey, true);
    }

    return credencialesValidas;
  }

  cerrarSesion(): void {
    this.sesionSignal.set(false);
    this.storageService.guardar(this.storageKey, false);
  }
}
