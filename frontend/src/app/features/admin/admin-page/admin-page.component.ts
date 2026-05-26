import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EstadoReporte, FiltrosReporte, ReporteObjeto } from '../../../core/models/reporte-objeto.model';
import { ReportesService } from '../../../core/services/reportes.service';
import { ModalService } from '../../../core/services/modal.service';
import { ReportesListComponent } from '../../reportes-list/reportes-list.component';

/**
 * Página de administración simulada.
 * Centraliza reportes visibles, ocultos, entregados antiguos y cambios pendientes,
 * dejando el código listo para reemplazar este modo por autenticación real.
 */
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [ReportesListComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  readonly resumen = this.reportesService.resumen;
  readonly filtros = signal<FiltrosReporte>({ estado: '', categoria: '', tipo: '', busqueda: '' });
  readonly reportes = computed(() => this.reportesService.filtrarReportes(this.filtros(), true));

  aplicarFiltros(filtros: FiltrosReporte): void {
    this.filtros.set(filtros);
  }

  crearNuevoReporte(): void {
    this.router.navigate(['/reportar']);
  }

  editarReporte(reporte: ReporteObjeto): void {
    this.router.navigate(['/reportar'], { state: { reporte, modoAdministrador: true } });
  }

  async cambiarEstado(evento: { reporte: ReporteObjeto; estado: EstadoReporte; observacion?: string }): Promise<void> {
    if (await this.modalService.showConfirmModal('Cambiar estado', `¿Confirmas cambiar el estado a "${evento.estado}"?`, 'Cambiar estado')) {
      this.reportesService.solicitarCambioEstado(evento.reporte.id, evento.estado, 'administrador');
    }
  }

  async eliminarReporte(reporte: ReporteObjeto): Promise<void> {
    if (reporte.eliminadoVistaPublica) {
      if (await this.modalService.showConfirmModal('Eliminar definitivamente', 'Este reporte ya está oculto. ¿Deseas eliminarlo definitivamente de administración?', 'Eliminar')) {
        this.reportesService.eliminarDefinitivamente(reporte.id, 'administrador');
      }
      return;
    }

    if (await this.modalService.showConfirmModal('Ocultar reporte', '¿Ocultar este reporte de la vista pública? Seguirá disponible en administración e historial.', 'Ocultar')) {
      this.reportesService.eliminarDeVistaPublica(reporte.id, 'administrador');
    }
  }

  async validarReporte(reporte: ReporteObjeto): Promise<void> {
    if (await this.modalService.showConfirmModal('Validar reporte', '¿Confirmas que este reporte fue validado por administración?', 'Validar')) {
      this.reportesService.validarReporte(reporte.id);
    }
  }

  async aprobarCambio(reporte: ReporteObjeto): Promise<void> {
    if (await this.modalService.showConfirmModal('Aprobar solicitud', '¿Aprobar el cambio solicitado?', 'Aprobar')) {
      this.reportesService.aprobarCambioEstado(reporte.id);
    }
  }

  async rechazarCambio(reporte: ReporteObjeto): Promise<void> {
    if (await this.modalService.showConfirmModal('Rechazar solicitud', '¿Rechazar el cambio solicitado?', 'Rechazar')) {
      this.reportesService.rechazarCambioEstado(reporte.id);
    }
  }

  async restaurarReporte(reporte: ReporteObjeto): Promise<void> {
    if (await this.modalService.showConfirmModal('Restaurar reporte', '¿Restaurar este reporte en la vista pública?', 'Restaurar')) {
      this.reportesService.restaurarVistaPublica(reporte.id);
    }
  }
}
