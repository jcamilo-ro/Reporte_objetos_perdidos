import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Servicio base para comunicación con Django REST Framework.
 * Actualmente la aplicación usa `ReportesService` con localStorage para la demo,
 * pero este archivo deja centralizado el punto de conexión real con el backend.
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api/reportes/';

  /**
   * Consulta reportes desde Django. Los parámetros se envían tal como los espera
   * el ViewSet del backend: estado, categoría, tipo, búsqueda y admin.
   */
  obtenerReportes(parametros: Record<string, string>): Observable<unknown> {
    let params = new HttpParams();

    Object.entries(parametros).forEach(([clave, valor]) => {
      if (valor) {
        params = params.set(clave, valor);
      }
    });

    return this.http.get(this.apiUrl, { params });
  }
}
