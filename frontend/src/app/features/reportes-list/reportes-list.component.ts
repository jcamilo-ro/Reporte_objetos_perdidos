import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CATEGORIAS_REPORTE,
  EstadoReporte,
  ESTADOS_REPORTE,
  FiltrosReporte,
  ReporteObjeto,
  TIPOS_REPORTE
} from '../../core/models/reporte-objeto.model';
import { ModalService } from '../../core/services/modal.service';

/**
 * Tabla reutilizable de consulta y administracion.
 * Contiene filtros, visor de fotografia, acciones y detalle con historial.
 */
@Component({
  selector: 'app-reportes-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes-list.component.html',
  styleUrl: './reportes-list.component.scss'
})
export class ReportesListComponent {
  private readonly modalService = inject(ModalService);
  @Input({ required: true }) reportes: ReporteObjeto[] = [];
  @Input({ required: true }) filtros: FiltrosReporte = { estado: '', categoria: '', tipo: '', busqueda: '' };
  @Input() modoAdministrador = false;
  @Output() filtrosCambiados = new EventEmitter<FiltrosReporte>();
  @Output() crearNuevoReporte = new EventEmitter<void>();
  @Output() editarReporte = new EventEmitter<ReporteObjeto>();
  @Output() eliminarReporte = new EventEmitter<ReporteObjeto>();
  @Output() estadoCambiado = new EventEmitter<{ reporte: ReporteObjeto; estado: EstadoReporte; observacion?: string }>();
  @Output() aprobarCambio = new EventEmitter<ReporteObjeto>();
  @Output() rechazarCambio = new EventEmitter<ReporteObjeto>();
  @Output() restaurarReporte = new EventEmitter<ReporteObjeto>();
  @Output() validarReporte = new EventEmitter<ReporteObjeto>();

  reporteDetalleId: number | null = null;
  fotografiaActiva: ReporteObjeto | null = null;
  fotografiaConError = false;

  readonly estados = ESTADOS_REPORTE;
  readonly categorias = CATEGORIAS_REPORTE;
  readonly tipos = TIPOS_REPORTE;

  actualizarFiltros(): void {
    this.filtrosCambiados.emit({ ...this.filtros });
  }

  limpiarFiltros(): void {
    this.filtros = { estado: '', categoria: '', tipo: '', busqueda: '' };
    this.actualizarFiltros();
  }

  irACrearReporte(): void {
    this.crearNuevoReporte.emit();
  }

  alternarDetalle(reporte: ReporteObjeto): void {
    this.reporteDetalleId = this.reporteDetalleId === reporte.id ? null : reporte.id;
  }

  editar(reporte: ReporteObjeto): void {
    this.editarReporte.emit(reporte);
  }

  eliminar(reporte: ReporteObjeto): void {
    this.eliminarReporte.emit(reporte);
  }

  async cambiarEstado(reporte: ReporteObjeto, estado: string): Promise<void> {
    const estadoNuevo = estado as EstadoReporte;

    if (reporte.estado === estadoNuevo) {
      return;
    }

    if (!this.modoAdministrador) {
      const observacion = await this.modalService.showPromptModal({
        titulo: 'Solicitar cambio de estado',
        mensaje: `El cambio a "${estadoNuevo}" quedará pendiente hasta que administración lo apruebe.`,
        placeholder: 'Ej. Ya entregué el objeto en la oficina',
        confirmarTexto: 'Enviar solicitud',
        requerido: true
      });
      if (observacion === null) {
        return;
      }

      this.estadoCambiado.emit({ reporte, estado: estadoNuevo, observacion: observacion.trim() });
      return;
    }

    this.estadoCambiado.emit({ reporte, estado: estadoNuevo });
  }

  claseEstado(reporte: ReporteObjeto): string {
    return `status status--${reporte.estado}`;
  }

  etiquetaEstado(estado: EstadoReporte): string {
    return this.estados.find((opcion) => opcion.valor === estado)?.etiqueta ?? estado;
  }

  tieneCambioEstadoVisible(reporte: ReporteObjeto): boolean {
    return reporte.cambioPendiente?.tipoSolicitud === 'estado' || Boolean(reporte.ultimoCambioEstado);
  }

  cambioEstadoAnterior(reporte: ReporteObjeto): EstadoReporte | null {
    return reporte.cambioPendiente?.tipoSolicitud === 'estado'
      ? reporte.cambioPendiente.estadoAnterior
      : reporte.ultimoCambioEstado?.estadoAnterior ?? null;
  }

  cambioEstadoNuevo(reporte: ReporteObjeto): EstadoReporte | null {
    return reporte.cambioPendiente?.tipoSolicitud === 'estado'
      ? reporte.cambioPendiente.estadoSolicitado
      : reporte.ultimoCambioEstado?.estadoNuevo ?? null;
  }

  observacionCambioEstado(reporte: ReporteObjeto): string {
    return reporte.cambioPendiente?.tipoSolicitud === 'estado'
      ? reporte.cambioPendiente.observacion ?? ''
      : reporte.ultimoCambioEstado?.observacion ?? '';
  }

  comentarioCambioEstado(reporte: ReporteObjeto): string {
    return reporte.cambioPendiente?.tipoSolicitud === 'estado'
      ? 'Pendiente de aprobación administrativa.'
      : reporte.ultimoCambioEstado?.comentario ?? '';
  }

  abrirFotografia(reporte: ReporteObjeto): void {
    this.fotografiaActiva = reporte;
    this.fotografiaConError = false;
  }

  cerrarFotografia(): void {
    this.fotografiaActiva = null;
    this.fotografiaConError = false;
  }

  rutaFotografia(reporte: ReporteObjeto): string {
    if (reporte.imagenUrl) {
      return reporte.imagenUrl;
    }

    const nombre = reporte.imagenNombre ?? '';
    if (nombre.startsWith('http') || nombre.startsWith('data:') || nombre.startsWith('/')) {
      return nombre;
    }

    if (nombre.startsWith('reportes/')) {
      return `http://127.0.0.1:8000/media/${nombre}`;
    }

    return `/reportes/${nombre}`;
  }

  marcarFotoConError(): void {
    this.fotografiaConError = true;
  }

  puedeEliminar(reporte: ReporteObjeto): boolean {
    return this.modoAdministrador && !reporte.eliminadoVistaPublica;
  }
}
