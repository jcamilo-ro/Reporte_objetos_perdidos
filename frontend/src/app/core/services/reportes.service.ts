import { Injectable, computed, inject, signal } from '@angular/core';
import {
  CambioPendienteEstado,
  EstadoReporte,
  FiltrosReporte,
  HistorialCambio,
  ReporteObjeto,
  RolAccion
} from '../models/reporte-objeto.model';
import { StorageService } from './storage.service';

/**
 * Servicio central de reportes.
 * Maneja datos de ejemplo, CRUD local, eliminación lógica, cambios pendientes,
 * expiración automática de solicitudes y trazabilidad. Está separado de la UI
 * para poder sustituir localStorage por Django REST Framework más adelante.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private readonly storageService = inject(StorageService);
  private readonly storageKey = 'udenar-reportes-objetos-v2';
  private readonly diasParaOcultarEntregados = 7;
  private readonly horasParaConfirmarEstado = 24;

  private readonly reportesSignal = signal<ReporteObjeto[]>(this.obtenerReportesIniciales());

  readonly reportes = this.reportesSignal.asReadonly();

  /**
   * Reportes visibles para usuarios normales. No incluye eliminados lógicamente
   * ni entregados con más de una semana.
   */
  readonly reportesPublicos = computed(() =>
    this.reportesSignal().filter((reporte) => this.esVisiblePublicamente(reporte))
  );

  /**
   * Reportes completos para administración.
   */
  readonly reportesAdministracion = computed(() => this.reportesSignal());

  /**
   * Métricas compactas usadas en inicio y administración.
   */
  readonly resumen = computed(() => {
    const reportes = this.reportesSignal();

    return {
      total: reportes.length,
      visibles: this.reportesPublicos().length,
      eliminados: reportes.filter((reporte) => reporte.eliminadoVistaPublica).length,
      pendientesRevision: reportes.filter((reporte) => reporte.cambioPendiente || !reporte.validadoAdministrador).length,
      perdidos: reportes.filter((reporte) => reporte.estado === 'perdido').length,
      encontrados: reportes.filter((reporte) => reporte.estado === 'encontrado').length,
      entregados: reportes.filter((reporte) => reporte.estado === 'entregado').length,
      pendientes: reportes.filter((reporte) => reporte.estado === 'pendiente').length
    };
  });

  agregarReporte(reporte: Omit<ReporteObjeto, 'id' | 'creadoEn' | 'actualizadoEn' | 'entregadoEn' | 'validadoAdministrador' | 'validadoEn' | 'eliminadoVistaPublica' | 'eliminadoEn' | 'cambioPendiente' | 'ultimoCambioEstado' | 'historial'>): ReporteObjeto {
    const fecha = this.fechaActual();
    const id = Date.now();
    const nuevoReporte: ReporteObjeto = {
      ...reporte,
      id,
      codigo: this.generarCodigo(id),
      creadoEn: fecha,
      actualizadoEn: fecha,
      entregadoEn: reporte.estado === 'entregado' ? fecha : undefined,
      validadoAdministrador: false,
      eliminadoVistaPublica: false,
      historial: [
        this.crearHistorial('Creación de reporte', 'sistema', 'Sin registro', reporte.nombre, 'usuario', 'no_aplica')
      ]
    };

    this.actualizarColeccion((reportes) => [nuevoReporte, ...reportes]);
    return nuevoReporte;
  }

  actualizarReporte(reporteEditado: ReporteObjeto, rol: RolAccion): void {
    const reporteActual = this.buscarReporte(reporteEditado.id);

    if (!reporteActual) {
      return;
    }

    const soloCambioEstado =
      reporteActual.estado !== reporteEditado.estado &&
      this.normalizarParaComparar({ ...reporteActual, estado: reporteEditado.estado }) ===
        this.normalizarParaComparar(reporteEditado);

    if (rol === 'usuario' && soloCambioEstado) {
      this.solicitarCambioEstado(reporteEditado.id, reporteEditado.estado, 'usuario');
      return;
    }

    if (rol === 'usuario') {
      this.solicitarEdicionUsuario(reporteActual, reporteEditado);
      return;
    }

    const historial = this.construirHistorialEdicion(reporteActual, reporteEditado, rol);

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === reporteEditado.id
          ? {
              ...reporteEditado,
              actualizadoEn: this.fechaActual(),
              entregadoEn: reporteEditado.estado === 'entregado' ? reporteEditado.entregadoEn ?? this.fechaActual() : undefined,
              historial: [...reporteActual.historial, ...historial]
            }
          : reporte
      )
    );
  }

  /**
   * Solicita o aplica un cambio de estado. Si el rol es usuario queda pendiente
   * por 24 horas; si el rol es administrador se aplica directamente.
   */
  solicitarCambioEstado(id: number, estadoSolicitado: EstadoReporte, rol: RolAccion, observacion = ''): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual || reporteActual.estado === estadoSolicitado) {
      return;
    }

    if (rol === 'administrador') {
      this.aplicarEstadoAdministrador(id, estadoSolicitado, 'Cambio de estado administrativo');
      return;
    }

    const fechaSolicitud = this.fechaActual();
    const expiraEn = new Date(Date.now() + this.horasParaConfirmarEstado * 60 * 60 * 1000).toISOString();
    const cambioPendiente: CambioPendienteEstado = {
      id: Date.now(),
      campo: 'estado',
      tipoSolicitud: 'estado',
      estadoAnterior: reporteActual.estado,
      estadoSolicitado,
      solicitadoPor: rol,
      fechaSolicitud,
      expiraEn,
      observacion: observacion.trim(),
      aprobacion: 'pendiente'
    };

    const historial = this.crearHistorial(
      'Solicitud de cambio de estado',
      'estado',
      reporteActual.estado,
      observacion.trim() ? `${estadoSolicitado}. Observacion: ${observacion.trim()}` : estadoSolicitado,
      rol,
      'pendiente'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              cambioPendiente,
              actualizadoEn: fechaSolicitud,
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  /**
   * Las ediciones hechas desde la vista publica no pisan los datos oficiales.
   * Quedan como solicitud pendiente para que administracion las revise.
   */
  private solicitarEdicionUsuario(reporteActual: ReporteObjeto, reporteEditado: ReporteObjeto): void {
    const fechaSolicitud = this.fechaActual();
    const expiraEn = new Date(Date.now() + this.horasParaConfirmarEstado * 60 * 60 * 1000).toISOString();
    const camposSolicitados = this.construirHistorialEdicion(reporteActual, reporteEditado, 'usuario');

    const cambioPendiente: CambioPendienteEstado = {
      id: Date.now(),
      campo: 'estado',
      tipoSolicitud: 'edicion',
      estadoAnterior: reporteActual.estado,
      estadoSolicitado: reporteEditado.estado,
      solicitadoPor: 'usuario',
      fechaSolicitud,
      expiraEn,
      observacion: 'Solicitud de edicion de datos del reporte.',
      aprobacion: 'pendiente'
    };

    const historial = this.crearHistorial(
      'Solicitud de edicion de reporte',
      camposSolicitados.map((cambio) => cambio.campo).join(', ') || 'general',
      'Datos oficiales actuales',
      'Cambios pendientes de aprobacion',
      'usuario',
      'pendiente'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === reporteActual.id
          ? {
              ...reporte,
              cambioPendiente,
              actualizadoEn: fechaSolicitud,
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  aprobarCambioEstado(id: number): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual?.cambioPendiente) {
      return;
    }

    const cambio = reporteActual.cambioPendiente;
    const fechaAprobacion = this.fechaActual();
    const historial = this.crearHistorial(
      'Aprobación de cambio de estado',
      'estado',
      cambio.estadoAnterior,
      cambio.observacion ? `${cambio.estadoSolicitado}. Observacion: ${cambio.observacion}` : cambio.estadoSolicitado,
      'administrador',
      'aprobado'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              estado: cambio.estadoSolicitado,
              entregadoEn: cambio.estadoSolicitado === 'entregado' ? fechaAprobacion : undefined,
              cambioPendiente: undefined,
              ultimoCambioEstado: {
                id: cambio.id,
                estadoAnterior: cambio.estadoAnterior,
                estadoNuevo: cambio.estadoSolicitado,
                observacion: cambio.observacion,
                fechaAprobacion,
                comentario: 'Acción aprobada por el administrador.'
              },
              actualizadoEn: fechaAprobacion,
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  rechazarCambioEstado(id: number): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual?.cambioPendiente) {
      return;
    }

    const cambio = reporteActual.cambioPendiente;
    const historial = this.crearHistorial(
      'Rechazo de cambio de estado',
      'estado',
      cambio.estadoAnterior,
      cambio.estadoSolicitado,
      'administrador',
      'rechazado'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              cambioPendiente: undefined,
              actualizadoEn: this.fechaActual(),
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  eliminarDeVistaPublica(id: number, rol: RolAccion): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual || reporteActual.eliminadoVistaPublica) {
      return;
    }

    const historial = this.crearHistorial(
      'Eliminación lógica de vista pública',
      'eliminadoVistaPublica',
      String(reporteActual.eliminadoVistaPublica),
      'true',
      rol,
      'no_aplica'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              eliminadoVistaPublica: true,
              eliminadoEn: this.fechaActual(),
              actualizadoEn: this.fechaActual(),
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  eliminarDefinitivamente(id: number, rol: RolAccion): void {
    if (rol !== 'administrador') {
      return;
    }

    const reporteActual = this.buscarReporte(id);

    if (!reporteActual?.eliminadoVistaPublica) {
      return;
    }

    this.actualizarColeccion((reportes) => reportes.filter((reporte) => reporte.id !== id));
  }

  restaurarVistaPublica(id: number): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual) {
      return;
    }

    const historial = this.crearHistorial(
      'Restauración en vista pública',
      'eliminadoVistaPublica',
      'true',
      'false',
      'administrador',
      'no_aplica'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              eliminadoVistaPublica: false,
              eliminadoEn: undefined,
              actualizadoEn: this.fechaActual(),
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  /**
   * Marca un reporte como revisado por administración. Ese dato habilita la
   * eliminación protegida de objetos encontrados y queda en historial.
   */
  validarReporte(id: number): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual || reporteActual.validadoAdministrador) {
      return;
    }

    const fecha = this.fechaActual();
    const historial = this.crearHistorial(
      'Validación administrativa',
      'validadoAdministrador',
      'false',
      'true',
      'administrador',
      'aprobado'
    );

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              validadoAdministrador: true,
              validadoEn: fecha,
              actualizadoEn: fecha,
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  filtrarReportes(filtros: FiltrosReporte, modoAdministrador = false): ReporteObjeto[] {
    this.expirarCambiosPendientes();
    const base = modoAdministrador ? this.reportesAdministracion() : this.reportesPublicos();

    return base.filter((reporte) => {
      const coincideEstado = !filtros.estado || reporte.estado === filtros.estado;
      const coincideCategoria = !filtros.categoria || reporte.categoria === filtros.categoria;
      const coincideTipo = !filtros.tipo || reporte.tipo === filtros.tipo;
      const coincideBusqueda = this.coincideBusquedaNatural(reporte, filtros.busqueda);

      return coincideEstado && coincideCategoria && coincideTipo && coincideBusqueda;
    });
  }

  puedeEliminarReporte(reporte: ReporteObjeto): boolean {
    return !reporte.eliminadoVistaPublica;
  }

  /**
   * Buscador simple. Extrae palabras útiles de frases cortas como
   * "Celular Samsung negro" y filtra por texto.
   */
  private coincideBusquedaNatural(reporte: ReporteObjeto, busqueda: string): boolean {
    const texto = busqueda.trim();
    if (!texto) {
      return true;
    }

    const tokens = this.tokenizar(texto).filter(
      (token) => !['perdi', 'perdio', 'encontre', 'encontro', 'objeto', 'reporte', 'una', 'uno', 'con', 'los', 'las'].includes(token)
    );
    const textoReporte = this.tokenizar(
      [
        reporte.nombre,
        reporte.descripcion,
        reporte.categoria,
        reporte.lugar,
        reporte.estado,
        reporte.tipo,
        reporte.perdidoPor.nombreCompleto,
        reporte.encontradoPor.nombreCompleto,
        reporte.perdidoPor.contacto,
        reporte.encontradoPor.contacto
      ].join(' ')
    );

    const buscaPerdido = this.tokenizar(texto).includes('perdi');
    const buscaEncontrado = this.tokenizar(texto).includes('encontre');
    if (buscaPerdido && reporte.tipo !== 'encontrado') {
      return false;
    }
    if (buscaEncontrado && reporte.tipo !== 'perdido') {
      return false;
    }

    return tokens.length === 0 || tokens.some((token) => textoReporte.includes(token));
  }

  private expirarCambiosPendientes(): void {
    const vencidos = this.reportesSignal().filter(
      (reporte) => reporte.cambioPendiente && new Date(reporte.cambioPendiente.expiraEn).getTime() < Date.now()
    );

    if (!vencidos.length) {
      return;
    }

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) => {
        if (!reporte.cambioPendiente || new Date(reporte.cambioPendiente.expiraEn).getTime() >= Date.now()) {
          return reporte;
        }

        const cambio = reporte.cambioPendiente;
        const historial = this.crearHistorial(
          'Expiración automática de cambio de estado',
          'estado',
          cambio.estadoAnterior,
          cambio.estadoSolicitado,
          'sistema',
          'expirado'
        );

        return {
          ...reporte,
          estado: cambio.estadoAnterior,
          cambioPendiente: undefined,
          actualizadoEn: this.fechaActual(),
          historial: [...reporte.historial, historial]
        };
      })
    );
  }

  private aplicarEstadoAdministrador(id: number, estadoNuevo: EstadoReporte, tipoCambio: string): void {
    const reporteActual = this.buscarReporte(id);

    if (!reporteActual) {
      return;
    }

    const historial = this.crearHistorial(tipoCambio, 'estado', reporteActual.estado, estadoNuevo, 'administrador', 'aprobado');

    this.actualizarColeccion((reportes) =>
      reportes.map((reporte) =>
        reporte.id === id
          ? {
              ...reporte,
              estado: estadoNuevo,
              entregadoEn: estadoNuevo === 'entregado' ? this.fechaActual() : undefined,
              cambioPendiente: undefined,
              actualizadoEn: this.fechaActual(),
              historial: [...reporte.historial, historial]
            }
          : reporte
      )
    );
  }

  private construirHistorialEdicion(anterior: ReporteObjeto, nuevo: ReporteObjeto, rol: RolAccion): HistorialCambio[] {
    const campos: Array<keyof ReporteObjeto> = [
      'nombre',
      'descripcion',
      'categoria',
      'lugar',
      'fecha',
      'tipo',
      'estado',
      'observaciones',
      'accionObjeto',
      'lugarEntrega',
      'imagenNombre'
    ];

    const historialSimple = campos
      .filter((campo) => anterior[campo] !== nuevo[campo])
      .map((campo) =>
        this.crearHistorial(
          campo === 'estado' ? 'Cambio de estado' : 'Edición de reporte',
          String(campo),
          String(anterior[campo] ?? ''),
          String(nuevo[campo] ?? ''),
          rol,
          campo === 'estado' && rol === 'administrador' ? 'aprobado' : 'no_aplica'
        )
      );

    return [
      ...historialSimple,
      ...this.compararPersona('perdidoPor', anterior, nuevo, rol),
      ...this.compararPersona('encontradoPor', anterior, nuevo, rol)
    ];
  }

  private compararPersona(
    grupo: 'perdidoPor' | 'encontradoPor',
    anterior: ReporteObjeto,
    nuevo: ReporteObjeto,
    rol: RolAccion
  ): HistorialCambio[] {
    return (['nombreCompleto', 'tipoPersona', 'contacto'] as const)
      .filter((campo) => anterior[grupo][campo] !== nuevo[grupo][campo])
      .map((campo) =>
        this.crearHistorial(
          'Edición de datos de persona',
          `${grupo}.${campo}`,
          anterior[grupo][campo],
          nuevo[grupo][campo],
          rol,
          'no_aplica'
        )
      );
  }

  private crearHistorial(
    tipoCambio: string,
    campo: string,
    valorAnterior: string,
    valorNuevo: string,
    rol: RolAccion,
    aprobacion: HistorialCambio['aprobacion']
  ): HistorialCambio {
    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      fecha: this.fechaActual(),
      tipoCambio,
      rol,
      campo,
      valorAnterior,
      valorNuevo,
      aprobacion
    };
  }

  private buscarReporte(id: number): ReporteObjeto | undefined {
    return this.reportesSignal().find((reporte) => reporte.id === id);
  }

  private actualizarColeccion(mutacion: (reportes: ReporteObjeto[]) => ReporteObjeto[]): void {
    this.reportesSignal.update((reportes) => {
      const actualizados = mutacion(reportes);
      this.storageService.guardar(this.storageKey, actualizados);
      return actualizados;
    });
  }

  private esVisiblePublicamente(reporte: ReporteObjeto): boolean {
    if (reporte.eliminadoVistaPublica) {
      return false;
    }

    if (reporte.estado !== 'entregado' || !reporte.entregadoEn) {
      return true;
    }

    const entregado = new Date(reporte.entregadoEn).getTime();
    const unaSemana = this.diasParaOcultarEntregados * 24 * 60 * 60 * 1000;

    return Date.now() - entregado <= unaSemana;
  }

  private normalizarParaComparar(reporte: ReporteObjeto): string {
    return JSON.stringify({
      ...reporte,
      actualizadoEn: '',
      entregadoEn: '',
      cambioPendiente: undefined,
      ultimoCambioEstado: reporte.ultimoCambioEstado,
      historial: []
    });
  }

  private obtenerReportesIniciales(): ReporteObjeto[] {
    const reportesGuardados = this.storageService.obtener<ReporteObjeto[]>(this.storageKey);

    if (!reportesGuardados) {
      return this.reportesIniciales();
    }

    return reportesGuardados.map((reporte) => this.normalizarReporte(reporte));
  }

  private normalizarReporte(reporte: ReporteObjeto): ReporteObjeto {
    const fecha = reporte.creadoEn ?? this.fechaActual();

    return {
      ...reporte,
      creadoEn: fecha,
      actualizadoEn: reporte.actualizadoEn ?? fecha,
      imagenUrl: reporte.imagenUrl ?? this.imagenSugerida(reporte),
      validadoAdministrador: reporte.validadoAdministrador ?? false,
      eliminadoVistaPublica: reporte.eliminadoVistaPublica ?? false,
      ultimoCambioEstado: reporte.ultimoCambioEstado,
      historial: reporte.historial ?? [
        this.crearHistorial('Migración local', 'sistema', 'Sin historial', 'Historial creado', 'administrador', 'no_aplica')
      ]
    };
  }

  private fechaActual(): string {
    return new Date().toISOString();
  }

  private tokenizar(texto: string): string[] {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/\W+/)
      .filter((token) => token.length >= 3);
  }

  private generarCodigo(id: number): string {
    return `REP-${new Date().getFullYear()}-${String(id).slice(-6).padStart(6, '0')}`;
  }

  private imagenSugerida(reporte: ReporteObjeto): string {
    const texto = `${reporte.nombre} ${reporte.descripcion} ${reporte.imagenNombre ?? ''}`.toLowerCase();
    if (texto.includes('samsung') || texto.includes('celular')) return '/reportes/celular-samsung-negro.svg';
    if (texto.includes('carnet')) return '/reportes/carnet-estudiantil.svg';
    if (texto.includes('llav')) return '/reportes/llavero-rojo.svg';
    if (texto.includes('aud')) return '/reportes/audifonos-negros.svg';
    if (texto.includes('chaqueta')) return '/reportes/chaqueta-azul.svg';
    if (texto.includes('usb')) return '/reportes/usb-plateada.svg';
    if (texto.includes('libro')) return '/reportes/libro-typescript.svg';
    return '';
  }

  private reportesIniciales(): ReporteObjeto[] {
    const ahora = this.fechaActual();
    const haceOchoDias = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const crear = (reporte: Omit<ReporteObjeto, 'creadoEn' | 'actualizadoEn' | 'validadoAdministrador' | 'validadoEn' | 'eliminadoVistaPublica' | 'ultimoCambioEstado' | 'historial'>): ReporteObjeto => ({
      ...reporte,
      creadoEn: reporte.entregadoEn ?? ahora,
      actualizadoEn: reporte.entregadoEn ?? ahora,
      validadoAdministrador: reporte.estado === 'entregado',
      validadoEn: reporte.estado === 'entregado' ? reporte.entregadoEn ?? ahora : undefined,
      eliminadoVistaPublica: false,
      historial: [this.crearHistorial('Creación de reporte', 'sistema', 'Sin registro', reporte.nombre, 'usuario', 'no_aplica')]
    });

    return [
      crear({
        id: 1,
        tipo: 'perdido',
        estado: 'perdido',
        categoria: 'documentos',
        nombre: 'Carnet estudiantil',
        descripcion: 'Carnet de pregrado con funda transparente.',
        lugar: 'Biblioteca Alberto Quijano Guerrero',
        fecha: '2026-05-17',
        imagenNombre: 'carnet-estudiantil.jpg',
        imagenUrl: '/reportes/carnet-estudiantil.svg',
        observaciones: 'Documento requerido para ingreso a laboratorios.',
        encontradoPor: { nombreCompleto: 'Pendiente por reportar', tipoPersona: 'estudiante', contacto: 'Sin contacto registrado' },
        perdidoPor: { nombreCompleto: 'Carlos Benavides', tipoPersona: 'estudiante', contacto: 'carlos.benavides@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: ''
      }),
      crear({
        id: 2,
        tipo: 'encontrado',
        estado: 'encontrado',
        categoria: 'llaves',
        nombre: 'Llavero metálico',
        descripcion: 'Tres llaves con argolla roja.',
        lugar: 'Bloque Tecnológico',
        fecha: '2026-05-18',
        imagenNombre: 'llavero-rojo.jpg',
        imagenUrl: '/reportes/llavero-rojo.svg',
        observaciones: 'Se recibió al finalizar la jornada de la tarde.',
        encontradoPor: { nombreCompleto: 'Andrés Cárdenas', tipoPersona: 'docente', contacto: 'andres.cardenas@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Sin identificar', tipoPersona: 'estudiante', contacto: 'Pendiente por confirmar' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: 'Oficina de Ingeniería de Sistemas, bloque 6, Universidad de Nariño'
      }),
      crear({
        id: 3,
        tipo: 'encontrado',
        estado: 'entregado',
        categoria: 'cuadernos_libros',
        nombre: 'Cuaderno de cálculo',
        descripcion: 'Cuaderno argollado con apuntes de matemáticas.',
        lugar: 'Cafetería central',
        fecha: '2026-05-05',
        observaciones: 'Entregado después de validar datos del propietario.',
        encontradoPor: { nombreCompleto: 'Martha López', tipoPersona: 'administrativo', contacto: 'martha.lopez@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Sofía Guerrero', tipoPersona: 'estudiante', contacto: 'sofia.guerrero@udenar.edu.co' },
        accionObjeto: 'entrega_directa',
        lugarEntrega: '',
        entregadoEn: haceOchoDias
      }),
      crear({
        id: 4,
        tipo: 'perdido',
        estado: 'perdido',
        categoria: 'tecnologia',
        nombre: 'Audífonos inalámbricos',
        descripcion: 'Estuche negro con audífonos pequeños.',
        lugar: 'Sala de sistemas',
        fecha: '2026-05-20',
        imagenNombre: 'audifonos-negros.jpg',
        imagenUrl: '/reportes/audifonos-negros.svg',
        observaciones: 'Posiblemente quedaron junto a un computador.',
        encontradoPor: { nombreCompleto: 'Pendiente por reportar', tipoPersona: 'estudiante', contacto: 'Sin contacto registrado' },
        perdidoPor: { nombreCompleto: 'Natalia Mora', tipoPersona: 'estudiante', contacto: 'natalia.mora@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: ''
      }),
      crear({
        id: 5,
        tipo: 'encontrado',
        estado: 'entregado',
        categoria: 'ropa',
        nombre: 'Chaqueta azul',
        descripcion: 'Chaqueta impermeable azul oscuro.',
        lugar: 'Cancha múltiple',
        fecha: '2026-05-12',
        imagenNombre: 'chaqueta-azul.jpg',
        imagenUrl: '/reportes/chaqueta-azul.svg',
        observaciones: 'Entregada al dueño con validación de color y marca.',
        encontradoPor: { nombreCompleto: 'Luis Pantoja', tipoPersona: 'estudiante', contacto: 'luis.pantoja@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Camila Torres', tipoPersona: 'estudiante', contacto: 'camila.torres@udenar.edu.co' },
        accionObjeto: 'entrega_directa',
        lugarEntrega: '',
        entregadoEn: haceOchoDias
      }),
      crear({
        id: 6,
        tipo: 'encontrado',
        estado: 'entregado',
        categoria: 'documentos',
        nombre: 'Cédula de ciudadanía',
        descripcion: 'Documento encontrado cerca de admisiones.',
        lugar: 'Bloque administrativo',
        fecha: '2026-05-10',
        observaciones: 'Entregada en oficina de Ingeniería de Sistemas.',
        encontradoPor: { nombreCompleto: 'Patricia Gómez', tipoPersona: 'administrativo', contacto: 'patricia.gomez@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Diego Rosero', tipoPersona: 'estudiante', contacto: 'diego.rosero@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: 'Oficina de Ingeniería de Sistemas, bloque 6, Universidad de Nariño',
        entregadoEn: haceOchoDias
      }),
      crear({
        id: 7,
        tipo: 'perdido',
        estado: 'pendiente',
        categoria: 'otros',
        nombre: 'Termo gris',
        descripcion: 'Termo metálico gris con tapa negra.',
        lugar: 'Biblioteca',
        fecha: '2026-05-21',
        observaciones: 'Tiene una pequeña abolladura en la base.',
        encontradoPor: { nombreCompleto: 'Pendiente por reportar', tipoPersona: 'estudiante', contacto: 'Sin contacto registrado' },
        perdidoPor: { nombreCompleto: 'Juan Ruales', tipoPersona: 'estudiante', contacto: 'juan.ruales@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: ''
      }),
      crear({
        id: 8,
        tipo: 'encontrado',
        estado: 'entregado',
        categoria: 'tecnologia',
        nombre: 'Memoria USB',
        descripcion: 'USB de 32 GB color plateado.',
        lugar: 'Laboratorio 3',
        fecha: '2026-05-11',
        imagenNombre: 'usb-plateada.jpg',
        imagenUrl: '/reportes/usb-plateada.svg',
        observaciones: 'Entregada tras verificar archivos académicos.',
        encontradoPor: { nombreCompleto: 'Oscar Mejía', tipoPersona: 'docente', contacto: 'oscar.mejia@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Laura Ortega', tipoPersona: 'estudiante', contacto: 'laura.ortega@udenar.edu.co' },
        accionObjeto: 'entrega_directa',
        lugarEntrega: '',
        entregadoEn: haceOchoDias
      }),
      crear({
        id: 9,
        tipo: 'encontrado',
        estado: 'entregado',
        categoria: 'llaves',
        nombre: 'Llaves con cinta amarilla',
        descripcion: 'Dos llaves pequeñas sujetas a una cinta amarilla.',
        lugar: 'Entrada principal',
        fecha: '2026-05-09',
        observaciones: 'Retiradas por el propietario.',
        encontradoPor: { nombreCompleto: 'Ana Jurado', tipoPersona: 'administrativo', contacto: 'ana.jurado@udenar.edu.co' },
        perdidoPor: { nombreCompleto: 'Miguel Erazo', tipoPersona: 'docente', contacto: 'miguel.erazo@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: 'Oficina de Ingeniería de Sistemas, bloque 6, Universidad de Nariño',
        entregadoEn: haceOchoDias
      }),
      crear({
        id: 10,
        tipo: 'perdido',
        estado: 'perdido',
        categoria: 'cuadernos_libros',
        nombre: 'Libro de programación',
        descripcion: 'Libro de TypeScript con separadores de colores.',
        lugar: 'Aula 204',
        fecha: '2026-05-22',
        imagenNombre: 'libro-typescript.jpg',
        imagenUrl: '/reportes/libro-typescript.svg',
        observaciones: 'Tiene el nombre del estudiante en la primera página.',
        encontradoPor: { nombreCompleto: 'Pendiente por reportar', tipoPersona: 'estudiante', contacto: 'Sin contacto registrado' },
        perdidoPor: { nombreCompleto: 'Valentina Ruiz', tipoPersona: 'estudiante', contacto: 'valentina.ruiz@udenar.edu.co' },
        accionObjeto: 'otro_lugar',
        lugarEntrega: ''
      })
    ];
  }
}
