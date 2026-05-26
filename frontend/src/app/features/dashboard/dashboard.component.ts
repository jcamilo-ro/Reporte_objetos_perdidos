import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReportesService } from '../../core/services/reportes.service';
import { EstadoReporte, FiltrosReporte, ReporteObjeto } from '../../core/models/reporte-objeto.model';
import { ModalService } from '../../core/services/modal.service';
import { ReporteFormComponent } from '../reporte-form/reporte-form.component';
import { ReportesListComponent } from '../reportes-list/reportes-list.component';

/**
 * Pantalla principal del sistema.
 * Orquesta la portada de "Gestión universitaria", la consulta previa de reportes,
 * el formulario progresivo y el bloque administrativo. Se conecta con
 * `ReportesService` para leer, filtrar y registrar los casos.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReporteFormComponent, ReportesListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly modalService = inject(ModalService);

  readonly resumen = this.reportesService.resumen;
  readonly filtros = signal<FiltrosReporte>({ estado: '', categoria: '', tipo: 'perdido', busqueda: '' });
  readonly filtrosAdmin = signal<FiltrosReporte>({ estado: '', categoria: '', tipo: '', busqueda: '' });
  readonly modoAdministrador = signal(false);
  readonly reporteEditar = signal<ReporteObjeto | null>(null);

  /**
   * Lista pública calculada. Excluye reportes eliminados lógicamente y entregados
   * con más de una semana.
   */
  readonly reportesFiltrados = computed(() => this.reportesService.filtrarReportes(this.filtros(), false));

  /**
   * Lista administrativa calculada. Incluye todo para trazabilidad.
   */
  readonly reportesAdminFiltrados = computed(() => this.reportesService.filtrarReportes(this.filtrosAdmin(), true));

  /**
   * Recibe reportes emitidos por los formularios y los entrega al servicio.
   */
  crearReporte(
    reporte: Omit<
      ReporteObjeto,
      'id' | 'creadoEn' | 'actualizadoEn' | 'entregadoEn' | 'eliminadoVistaPublica' | 'eliminadoEn' | 'cambioPendiente' | 'historial'
    >
  ): void {
    this.reportesService.agregarReporte(reporte);
  }

  /**
   * Guarda una edición desde el formulario. Si el usuario solo cambió el estado,
   * el servicio crea una solicitud pendiente para administración.
   */
  actualizarReporte(reporte: ReporteObjeto): void {
    this.reportesService.actualizarReporte(reporte, this.modoAdministrador() ? 'administrador' : 'usuario');
    this.reporteEditar.set(null);
  }

  /**
   * Actualiza los filtros activos del listado.
   */
  aplicarFiltros(filtros: FiltrosReporte): void {
    this.filtros.set(filtros);
  }

  aplicarFiltrosAdmin(filtros: FiltrosReporte): void {
    this.filtrosAdmin.set(filtros);
  }

  /**
   * Lleva al usuario al formulario cuando decide crear un nuevo reporte desde
   * la portada o desde la consulta previa.
   */
  irARegistro(): void {
    document.getElementById('registro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Activa el modo administrador simulado. Queda aislado para reemplazarlo luego
   * por autenticación real sin reescribir toda la vista.
   */
  ingresarComoAdministrador(): void {
    this.modoAdministrador.set(true);
    setTimeout(() => document.getElementById('admin-reportes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  salirDeAdministracion(): void {
    this.modoAdministrador.set(false);
    document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  editarReporte(reporte: ReporteObjeto): void {
    this.reporteEditar.set(reporte);
  }

  limpiarEdicion(): void {
    this.reporteEditar.set(null);
  }

  async cambiarEstado(reporte: ReporteObjeto, estado: EstadoReporte, esAdmin = false, observacion = ''): Promise<void> {
    if (reporte.estado === estado) {
      return;
    }

    const mensaje = esAdmin
      ? `¿Confirmas cambiar el estado de "${reporte.nombre}" a "${estado}"?`
      : `El cambio de estado a "${estado}" quedará pendiente de confirmación del administrador. ¿Deseas continuar?`;

    const confirmado = await this.modalService.showConfirmModal(
      esAdmin ? 'Cambiar estado' : 'Enviar cambio de estado',
      mensaje,
      esAdmin ? 'Cambiar estado' : 'Enviar solicitud'
    );

    if (!confirmado) {
      return;
    }

    this.reportesService.solicitarCambioEstado(reporte.id, estado, esAdmin ? 'administrador' : 'usuario', observacion);
    if (!esAdmin) {
      await this.modalService.showInfoModal('Solicitud enviada', 'El cambio de estado quedó pendiente para revisión del administrador.');
    }
  }

  async eliminarReporte(reporte: ReporteObjeto): Promise<void> {
    if (this.modoAdministrador() && reporte.eliminadoVistaPublica) {
      if (await this.modalService.showConfirmModal('Eliminar definitivamente', 'Este reporte ya está oculto. ¿Deseas eliminarlo definitivamente de administración?', 'Eliminar')) {
        this.reportesService.eliminarDefinitivamente(reporte.id, 'administrador');
      }
      return;
    }

    const mensaje =
      reporte.estado === 'entregado'
        ? 'Este reporte entregado se ocultará de la vista pública, pero seguirá visible para administración. ¿Confirmas la acción?'
        : 'El reporte se ocultará de la vista pública sin borrarse definitivamente. ¿Confirmas la acción?';

    if (!(await this.modalService.showConfirmModal('Ocultar reporte', mensaje, 'Ocultar'))) {
      return;
    }

    this.reportesService.eliminarDeVistaPublica(reporte.id, this.modoAdministrador() ? 'administrador' : 'usuario');
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
