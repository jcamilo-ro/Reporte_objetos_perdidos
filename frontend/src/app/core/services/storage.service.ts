import { Injectable } from '@angular/core';

/**
 * Servicio de almacenamiento local.
 * Encapsula el uso de `localStorage` para que ReportesService no dependa
 * directamente de la API del navegador y sea más fácil reemplazar esta capa por
 * persistencia real en Django.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  obtener<T>(clave: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const valor = localStorage.getItem(clave);

    if (!valor) {
      return null;
    }

    try {
      return JSON.parse(valor) as T;
    } catch {
      return null;
    }
  }

  guardar<T>(clave: string, valor: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(clave, JSON.stringify(valor));
  }
}
