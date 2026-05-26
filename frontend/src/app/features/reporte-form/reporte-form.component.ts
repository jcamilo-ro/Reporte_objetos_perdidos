import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ACCIONES_OBJETO,
  AccionObjeto,
  CATEGORIAS_REPORTE,
  CategoriaReporte,
  EstadoReporte,
  ReporteObjeto,
  TIPOS_PERSONA,
  TipoPersona,
  TipoReporte
} from '../../core/models/reporte-objeto.model';
import { ReportesService } from '../../core/services/reportes.service';
import { ModalService } from '../../core/services/modal.service';

type ReporteFormulario = Omit<
  ReporteObjeto,
  'id' | 'codigo' | 'creadoEn' | 'actualizadoEn' | 'entregadoEn' | 'validadoAdministrador' | 'validadoEn' | 'eliminadoVistaPublica' | 'eliminadoEn' | 'cambioPendiente' | 'historial'
>;

/**
 * Formulario por pasos para crear o editar reportes.
 * El primer paso define si el usuario perdió o encontró el objeto; desde esa
 * decisión se asignan automáticamente tipo y estado inicial, evitando preguntas
 * repetidas y mejorando la experiencia.
 */
@Component({
  selector: 'app-reporte-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reporte-form.component.html',
  styleUrl: './reporte-form.component.scss'
})
export class ReporteFormComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reportesService = inject(ReportesService);
  private readonly modalService = inject(ModalService);
  @Input() reporteEditar: ReporteObjeto | null = null;
  @Input() modoAdministrador = false;
  @Output() reporteCreado = new EventEmitter<ReporteFormulario>();
  @Output() reporteActualizado = new EventEmitter<ReporteObjeto>();
  @Output() edicionCancelada = new EventEmitter<void>();
  @Output() consultarReportes = new EventEmitter<void>();
  @Output() salir = new EventEmitter<void>();

  readonly paso = signal(1);
  readonly mensajeExito = signal('');
  readonly reporteConfirmado = signal<{ nombre: string; tipo: TipoReporte } | null>(null);
  readonly edicionConfirmada = signal<{ titulo: string; mensaje: string } | null>(null);
  readonly categorias = CATEGORIAS_REPORTE;
  readonly tiposPersona = TIPOS_PERSONA;
  readonly accionesObjeto = ACCIONES_OBJETO;

  readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    categoria: ['documentos' as CategoriaReporte, Validators.required],
    lugar: ['', Validators.required],
    fecha: [new Date().toISOString().slice(0, 10), Validators.required],
    tipo: ['perdido' as TipoReporte, Validators.required],
    estado: ['perdido' as EstadoReporte, Validators.required],
    imagenNombre: [''],
    imagenUrl: [''],
    observaciones: [''],
    encontradoPor: this.formBuilder.nonNullable.group({
      nombreCompleto: ['Pendiente por reportar'],
      tipoPersona: ['estudiante' as TipoPersona],
      contacto: ['Sin correo registrado'],
      celular: ['']
    }),
    accionObjeto: ['otro_lugar' as AccionObjeto],
    lugarEntrega: [''],
    perdidoPor: this.formBuilder.nonNullable.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(5)]],
      tipoPersona: ['estudiante' as TipoPersona, Validators.required],
      contacto: ['', [Validators.required, Validators.email]],
      celular: ['']
    })
  });
  private instantaneaEdicion = '';

  constructor() {
    this.formulario.controls.tipo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tipo) => this.sincronizarTipo(tipo));

    this.formulario.controls.accionObjeto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((accion) => this.sincronizarLugarEntrega(accion));

    this.sincronizarTipo(this.formulario.controls.tipo.value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reporteEditar'] && this.reporteEditar) {
      this.cargarReporteParaEditar(this.reporteEditar);
      this.paso.set(this.modoAdministrador ? 2 : 2);
      this.instantaneaEdicion = this.normalizarFormulario();
      this.edicionConfirmada.set(null);
      this.reporteConfirmado.set(null);
    }
  }

  seleccionarTipo(tipo: TipoReporte): void {
    this.formulario.patchValue({ tipo });
    this.sincronizarTipo(tipo);
    this.paso.set(2);
    this.mensajeExito.set('');
    this.edicionConfirmada.set(null);
  }

  seleccionarPaso(paso: number): void {
    if (this.modoAdministrador) {
      this.paso.set(paso);
    }
  }

  seleccionarImagen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) {
      this.formulario.patchValue({ imagenNombre: '', imagenUrl: '' });
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.formulario.patchValue({
        imagenNombre: archivo.name,
        imagenUrl: String(lector.result ?? '')
      });
    };
    lector.readAsDataURL(archivo);
  }

  avanzar(): void {
    if (!this.pasoValido()) {
      this.marcarPasoActual();
      return;
    }

    this.paso.update((paso) => Math.min(paso + 1, 4));
  }

  retroceder(): void {
    this.paso.update((paso) => Math.max(paso - 1, 1));
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.reporteEditar) {
      if (!this.tieneCambios()) {
        await this.modalService.showInfoModal('Sin modificaciones', 'No se detectaron cambios para guardar.');
        return;
      }

      if (this.modoAdministrador) {
        const confirmado = await this.modalService.showConfirmModal(
          'Guardar cambios',
          'Se detectaron cambios en el reporte. ¿Deseas guardarlos?',
          'Guardar',
          'Cancelar'
        );

        if (!confirmado) {
          return;
        }
      }

      this.reporteActualizado.emit({ ...this.reporteEditar, ...this.formulario.getRawValue() });
      this.instantaneaEdicion = this.normalizarFormulario();
      this.mensajeExito.set('');
      this.edicionConfirmada.set(
        this.modoAdministrador
          ? {
              titulo: 'Reporte actualizado correctamente',
              mensaje: 'Los cambios del administrador fueron guardados con exito.'
            }
          : {
              titulo: 'Cambios enviados para aprobacion',
              mensaje: 'Tus cambios quedaron guardados como solicitud pendiente y deben ser aprobados por el administrador.'
            }
      );
      await this.modalService.showInfoModal(
        this.modoAdministrador ? 'Reporte actualizado' : 'Cambios enviados',
        this.modoAdministrador
          ? 'El reporte fue actualizado correctamente.'
          : 'Tus cambios quedaron como solicitud pendiente para aprobación del administrador.'
      );
    } else {
      const reporte = this.formulario.getRawValue();
      this.reporteCreado.emit(reporte);
      this.reporteConfirmado.set({ nombre: reporte.nombre, tipo: reporte.tipo });
      this.edicionConfirmada.set(null);
      this.mensajeExito.set('Reporte guardado correctamente.');
      this.reiniciarFormulario();
    }
  }

  irAConsultarReportes(): void {
    this.consultarReportes.emit();
  }

  salirDelFormulario(): void {
    this.salir.emit();
  }

  cancelarEdicion(): void {
    this.reiniciarFormulario();
    this.edicionCancelada.emit();
  }

  /**
   * Busca coincidencias locales cuando se reporta un objeto perdido.
   * Compara categoría, nombre, lugar y descripción contra reportes encontrados.
   * Es una lógica transparente por palabras clave, pensada para explicar la
   * búsqueda de coincidencias durante la exposición.
   */
  coincidenciasSugeridas(): Array<{ reporte: ReporteObjeto; puntaje: number; motivos: string[] }> {
    const valor = this.formulario.getRawValue();

    if (valor.tipo !== 'perdido' || !valor.nombre.trim()) {
      return [];
    }

    return this.reportesService
      .reportes()
      .filter((reporte) => reporte.tipo === 'encontrado' && !reporte.eliminadoVistaPublica)
      .map((reporte) => {
        const motivos: string[] = [];
        let puntaje = 0;

        if (reporte.categoria === valor.categoria) {
          puntaje += 35;
          motivos.push('misma categoría');
        }

        if (this.coincidenTextos(reporte.nombre, valor.nombre)) {
          puntaje += 30;
          motivos.push('nombre parecido');
        }

        if (this.coincidenTextos(reporte.lugar, valor.lugar)) {
          puntaje += 20;
          motivos.push('lugar relacionado');
        }

        if (this.coincidenTextos(reporte.descripcion, valor.descripcion)) {
          puntaje += 15;
          motivos.push('descripción similar');
        }

        return { reporte, puntaje, motivos };
      })
      .filter((coincidencia) => coincidencia.puntaje >= 35)
      .sort((a, b) => b.puntaje - a.puntaje)
      .slice(0, 3);
  }

  campoInvalido(ruta: string): boolean {
    const control = this.obtenerControl(ruta);
    return Boolean(control?.invalid && (control.dirty || control.touched));
  }

  mensajeError(ruta: string, etiqueta: string): string {
    const control = this.obtenerControl(ruta);

    if (control?.hasError('required')) {
      return `${etiqueta} es obligatorio.`;
    }

    if (control?.hasError('minlength')) {
      return `${etiqueta} necesita más detalle.`;
    }

    if (control?.hasError('email')) {
      return `${etiqueta} debe tener formato de correo.`;
    }

    return `${etiqueta} no es válido.`;
  }

  private pasoValido(): boolean {
    if (this.paso() === 2) {
      return ['nombre', 'descripcion', 'categoria', 'lugar', 'fecha'].every((campo) => this.obtenerControl(campo)?.valid);
    }

    if (this.paso() === 3) {
      return this.formulario.controls.tipo.value === 'perdido' ? this.formulario.controls.perdidoPor.valid : true;
    }

    if (this.paso() === 3 && this.formulario.controls.tipo.value === 'encontrado') {
      return this.formulario.controls.encontradoPor.valid && this.formulario.controls.lugarEntrega.valid;
    }

    return true;
  }

  private marcarPasoActual(): void {
    if (this.paso() === 2) {
      ['nombre', 'descripcion', 'categoria', 'lugar', 'fecha'].forEach((campo) => this.obtenerControl(campo)?.markAsTouched());
    }

    if (this.paso() === 3) {
      this.formulario.controls.perdidoPor.markAllAsTouched();
    }

    if (this.paso() === 3 && this.formulario.controls.tipo.value === 'encontrado') {
      this.formulario.controls.encontradoPor.markAllAsTouched();
      this.formulario.controls.lugarEntrega.markAsTouched();
    }
  }

  private sincronizarTipo(tipo: TipoReporte): void {
    this.formulario.patchValue({ estado: tipo === 'perdido' ? 'perdido' : 'encontrado' }, { emitEvent: false });
    const encontradoPor = this.formulario.controls.encontradoPor.controls;
    const perdidoPor = this.formulario.controls.perdidoPor.controls;

    if (tipo === 'encontrado') {
      encontradoPor.nombreCompleto.setValidators([Validators.required, Validators.minLength(5)]);
      encontradoPor.contacto.setValidators([Validators.required, Validators.email]);
      perdidoPor.nombreCompleto.clearValidators();
      perdidoPor.contacto.clearValidators();

      if (encontradoPor.nombreCompleto.value === 'Pendiente por reportar') {
        this.formulario.patchValue({
          encontradoPor: { nombreCompleto: '', tipoPersona: 'estudiante', contacto: '', celular: '' },
          perdidoPor: { nombreCompleto: 'Sin identificar', tipoPersona: 'estudiante', contacto: 'Pendiente por confirmar', celular: '' },
          lugarEntrega: ''
        });
      }
    } else {
      encontradoPor.nombreCompleto.clearValidators();
      encontradoPor.contacto.clearValidators();
      perdidoPor.nombreCompleto.setValidators([Validators.required, Validators.minLength(5)]);
      perdidoPor.contacto.setValidators([Validators.required, Validators.email]);
      this.formulario.patchValue({
        encontradoPor: {
          nombreCompleto: 'Pendiente por reportar',
          tipoPersona: 'estudiante',
          contacto: 'Sin correo registrado',
          celular: ''
        },
        accionObjeto: 'otro_lugar',
        lugarEntrega: ''
      });
    }

    encontradoPor.nombreCompleto.updateValueAndValidity();
    encontradoPor.contacto.updateValueAndValidity();
    perdidoPor.nombreCompleto.updateValueAndValidity();
    perdidoPor.contacto.updateValueAndValidity();
    this.sincronizarLugarEntrega(this.formulario.controls.accionObjeto.value);
  }

  private sincronizarLugarEntrega(accion: AccionObjeto): void {
    const control = this.formulario.controls.lugarEntrega;

    if (this.formulario.controls.tipo.value === 'encontrado' && accion === 'otro_lugar') {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
      if (accion === 'entrega_directa') {
        control.setValue('');
      }
    }

    control.updateValueAndValidity();
  }

  private obtenerControl(ruta: string): AbstractControl | null {
    return this.formulario.get(ruta);
  }

  private coincidenTextos(textoA: string, textoB: string): boolean {
    const tokensA = this.tokenizar(textoA);
    const tokensB = this.tokenizar(textoB);

    return tokensA.some((token) => tokensB.includes(token));
  }

  private tokenizar(texto: string): string[] {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/\W+/)
      .filter((token) => token.length >= 4);
  }

  private cargarReporteParaEditar(reporte: ReporteObjeto): void {
    this.formulario.patchValue({
      nombre: reporte.nombre,
      descripcion: reporte.descripcion,
      categoria: reporte.categoria,
      lugar: reporte.lugar,
      fecha: reporte.fecha,
      tipo: reporte.tipo,
      estado: reporte.estado,
      imagenNombre: reporte.imagenNombre ?? '',
      imagenUrl: reporte.imagenUrl ?? '',
      observaciones: reporte.observaciones,
      encontradoPor: reporte.encontradoPor,
      accionObjeto: reporte.accionObjeto,
      lugarEntrega: reporte.lugarEntrega,
      perdidoPor: reporte.perdidoPor
    });
  }

  private tieneCambios(): boolean {
    return this.normalizarFormulario() !== this.instantaneaEdicion;
  }

  private normalizarFormulario(): string {
    return JSON.stringify(this.formulario.getRawValue());
  }

  private reiniciarFormulario(): void {
    this.formulario.reset({
      nombre: '',
      descripcion: '',
      categoria: 'documentos',
      lugar: '',
      fecha: new Date().toISOString().slice(0, 10),
      tipo: 'perdido',
      estado: 'perdido',
      imagenNombre: '',
      imagenUrl: '',
      observaciones: '',
      encontradoPor: {
        nombreCompleto: 'Pendiente por reportar',
        tipoPersona: 'estudiante',
        contacto: 'Sin correo registrado',
        celular: ''
      },
      accionObjeto: 'otro_lugar',
      lugarEntrega: '',
      perdidoPor: {
        nombreCompleto: '',
        tipoPersona: 'estudiante',
        contacto: '',
        celular: ''
      }
    });

    this.paso.set(1);
    this.edicionConfirmada.set(null);
  }
}
