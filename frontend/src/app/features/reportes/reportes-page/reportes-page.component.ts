import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoReporte, FiltrosReporte, ReporteObjeto } from '../../../core/models/reporte-objeto.model';
import { ReportesService } from '../../../core/services/reportes.service';
import { ModalService } from '../../../core/services/modal.service';
import { ReportesListComponent } from '../../reportes-list/reportes-list.component';

/**
 * Página pública de consulta de reportes.
 * Muestra primero la tabla/listado, aplica filtros y delega las reglas de CRUD
 * al servicio central de reportes.
 */
@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [ReportesListComponent],
  templateUrl: './reportes-page.component.html'
})
export class ReportesPageComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  readonly filtros = signal<FiltrosReporte>({
    estado: '',
    categoria: '',
    tipo: '',
    busqueda: ''
  });

  readonly reportes = computed(() => this.reportesService.filtrarReportes(this.filtros(), false));

  aplicarFiltros(filtros: FiltrosReporte): void {
    this.filtros.set(filtros);
  }

  crearNuevoReporte(): void {
    this.router.navigate(['/reportar']);
  }

  editarReporte(reporte: ReporteObjeto): void {
    this.router.navigate(['/reportar'], { state: { reporte } });
  }

  async cambiarEstado(evento: { reporte: ReporteObjeto; estado: EstadoReporte; observacion?: string }): Promise<void> {
    if (await this.modalService.showConfirmModal('Enviar cambio de estado', 'El cambio de estado quedará pendiente de confirmación del administrador. ¿Deseas continuar?', 'Enviar solicitud')) {
      this.reportesService.solicitarCambioEstado(evento.reporte.id, evento.estado, 'usuario', evento.observacion);
      await this.modalService.showInfoModal('Solicitud enviada', 'El cambio de estado quedó pendiente para revisión del administrador.');
    }
  }

  async eliminarReporte(reporte: ReporteObjeto): Promise<void> {
    if (await this.modalService.showConfirmModal('Ocultar reporte', 'El reporte se ocultará de la vista pública, pero seguirá disponible para administración. ¿Confirmas?', 'Ocultar')) {
      this.reportesService.eliminarDeVistaPublica(reporte.id, 'usuario');
    }
  }
}
