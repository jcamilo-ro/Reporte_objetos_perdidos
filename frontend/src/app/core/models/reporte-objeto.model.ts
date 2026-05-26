/**
 * Modelo central del dominio de objetos perdidos.
 * Define tipos, interfaces y opciones reutilizables para formulario, consulta,
 * administración, trazabilidad y servicio de estado local.
 */
export type TipoReporte = 'perdido' | 'encontrado';

/**
 * Estados operativos del caso. "por_confirmar" representa cambios sensibles
 * que esperan validación del administrador.
 */
export type EstadoReporte = 'perdido' | 'encontrado' | 'entregado' | 'pendiente' | 'por_confirmar';

/**
 * Tipo de persona vinculada al caso dentro de la comunidad universitaria.
 */
export type TipoPersona = 'estudiante' | 'docente' | 'administrativo';

/**
 * Acción física definida para un objeto encontrado.
 */
export type AccionObjeto = 'entrega_directa' | 'otro_lugar';

/**
 * Rol que ejecuta una acción. Permite simular seguridad mientras se conecta
 * posteriormente con autenticación real en Django.
 */
export type RolAccion = 'usuario' | 'administrador' | 'sistema';

/**
 * Resultado de aprobación para cambios sensibles.
 */
export type EstadoAprobacion = 'pendiente' | 'aprobado' | 'rechazado' | 'expirado' | 'no_aplica';

/**
 * Categorías disponibles para clasificar objetos reportados.
 */
export type CategoriaReporte =
  | 'documentos'
  | 'tecnologia'
  | 'llaves'
  | 'ropa'
  | 'cuadernos_libros'
  | 'otros';

/**
 * Datos mínimos de una persona relacionada con el reporte.
 */
export interface PersonaRelacionada {
  nombreCompleto: string;
  tipoPersona: TipoPersona;
  contacto: string;
  celular?: string;
}

/**
 * Entrada de auditoría para explicar qué cambió, quién lo hizo y cuándo.
 */
export interface HistorialCambio {
  id: number;
  fecha: string;
  tipoCambio: string;
  rol: RolAccion;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  aprobacion: EstadoAprobacion;
}

/**
 * Solicitud pendiente para cambios de estado hechos desde la vista pública.
 * Si no se aprueba en 24 horas, el sistema la marca como expirada y conserva
 * el estado anterior.
 */
export interface CambioPendienteEstado {
  id: number;
  campo: 'estado';
  tipoSolicitud?: 'estado' | 'edicion';
  estadoAnterior: EstadoReporte;
  estadoSolicitado: EstadoReporte;
  solicitadoPor: RolAccion;
  fechaSolicitud: string;
  expiraEn: string;
  observacion?: string;
  aprobacion: 'pendiente';
}

/**
 * Caso completo del sistema. Incluye datos visibles, fotografía simulada,
 * validación administrativa, eliminación lógica y trazabilidad.
 */
export interface ReporteObjeto {
  id: number;
  codigo?: string;
  tipo: TipoReporte;
  estado: EstadoReporte;
  categoria: CategoriaReporte;
  nombre: string;
  descripcion: string;
  lugar: string;
  fecha: string;
  imagenNombre?: string;
  imagenUrl?: string;
  observaciones: string;
  encontradoPor: PersonaRelacionada;
  perdidoPor: PersonaRelacionada;
  accionObjeto: AccionObjeto;
  lugarEntrega: string;
  creadoEn: string;
  actualizadoEn: string;
  entregadoEn?: string;
  validadoAdministrador: boolean;
  validadoEn?: string;
  eliminadoVistaPublica: boolean;
  eliminadoEn?: string;
  cambioPendiente?: CambioPendienteEstado;
  historial: HistorialCambio[];
}

/**
 * Filtros compartidos por consulta pública y administración.
 */
export interface FiltrosReporte {
  estado: EstadoReporte | '';
  categoria: CategoriaReporte | '';
  tipo: TipoReporte | '';
  busqueda: string;
}

export const CATEGORIAS_REPORTE: Array<{ valor: CategoriaReporte; etiqueta: string }> = [
  { valor: 'documentos', etiqueta: 'Documentos' },
  { valor: 'tecnologia', etiqueta: 'Tecnología' },
  { valor: 'llaves', etiqueta: 'Llaves' },
  { valor: 'ropa', etiqueta: 'Ropa' },
  { valor: 'cuadernos_libros', etiqueta: 'Cuadernos o libros' },
  { valor: 'otros', etiqueta: 'Otros' }
];

export const ESTADOS_REPORTE: Array<{ valor: EstadoReporte; etiqueta: string }> = [
  { valor: 'perdido', etiqueta: 'Perdido' },
  { valor: 'encontrado', etiqueta: 'Encontrado' },
  { valor: 'entregado', etiqueta: 'Entregado' },
  { valor: 'pendiente', etiqueta: 'Pendiente' },
  { valor: 'por_confirmar', etiqueta: 'Pendiente por confirmar' }
];

export const TIPOS_REPORTE: Array<{ valor: TipoReporte; etiqueta: string }> = [
  { valor: 'perdido', etiqueta: 'Objeto perdido' },
  { valor: 'encontrado', etiqueta: 'Objeto encontrado' }
];

export const TIPOS_PERSONA: Array<{ valor: TipoPersona; etiqueta: string }> = [
  { valor: 'estudiante', etiqueta: 'Estudiante' },
  { valor: 'docente', etiqueta: 'Docente' },
  { valor: 'administrativo', etiqueta: 'Administrativo' }
];

export const ACCIONES_OBJETO: Array<{ valor: AccionObjeto; etiqueta: string }> = [
  {
    valor: 'entrega_directa',
    etiqueta: 'Lo entregaré directamente al dueño'
  },
  {
    valor: 'otro_lugar',
    etiqueta: 'Lo dejaré en otro lugar'
  }
];
