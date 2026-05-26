import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReporteObjeto } from '../../../core/models/reporte-objeto.model';
import { ReportesService } from '../../../core/services/reportes.service';
import { ReporteFormComponent } from '../../reporte-form/reporte-form.component';

type ReporteFormulario = Omit<
  ReporteObjeto,
  'id' | 'codigo' | 'creadoEn' | 'actualizadoEn' | 'entregadoEn' | 'validadoAdministrador' | 'validadoEn' | 'eliminadoVistaPublica' | 'eliminadoEn' | 'cambioPendiente' | 'historial'
>;

/**
 * Página de registro y edición.
 * Mantiene el formulario separado de la consulta para que el flujo se sienta
 * liviano y profesional.
 */
@Component({
  selector: 'app-reporte-form-page',
  standalone: true,
  imports: [ReporteFormComponent],
  templateUrl: './reporte-form-page.component.html'
})
export class ReporteFormPageComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  readonly reporteEditar = signal<ReporteObjeto | null>((this.router.getCurrentNavigation()?.extras.state?.['reporte'] as ReporteObjeto) ?? null);
  readonly modoAdministrador = signal(Boolean(this.router.getCurrentNavigation()?.extras.state?.['modoAdministrador']));

  crearReporte(reporte: ReporteFormulario): void {
    this.reportesService.agregarReporte(reporte);
  }

  actualizarReporte(reporte: ReporteObjeto): void {
    this.reportesService.actualizarReporte(reporte, this.modoAdministrador() ? 'administrador' : 'usuario');
  }

  cancelar(): void {
    this.router.navigate(['/reportes']);
  }

  consultarReportes(): void {
    this.router.navigate(['/reportes']);
  }

  salir(): void {
    this.router.navigate(['/inicio']);
  }
}
