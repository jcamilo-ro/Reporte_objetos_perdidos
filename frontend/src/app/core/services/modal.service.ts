import { Injectable, signal } from '@angular/core';

export type ModalTipo = 'info' | 'confirm' | 'prompt';

export interface ModalState {
  tipo: ModalTipo;
  titulo: string;
  mensaje: string;
  confirmarTexto: string;
  cancelarTexto?: string;
  placeholder?: string;
  requerido?: boolean;
  error?: string;
  resolver: (valor: boolean | string | null) => void;
}

/**
 * Servicio reutilizable para cuadros modales de la aplicacion.
 * Reemplaza alert, confirm y prompt nativos por dialogos integrados a la UI.
 */
@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private readonly modalSignal = signal<ModalState | null>(null);
  readonly modal = this.modalSignal.asReadonly();

  showInfoModal(titulo: string, mensaje: string, confirmarTexto = 'Entendido'): Promise<void> {
    return new Promise((resolve) => {
      this.modalSignal.set({
        tipo: 'info',
        titulo,
        mensaje,
        confirmarTexto,
        resolver: () => resolve()
      });
    });
  }

  showConfirmModal(titulo: string, mensaje: string, confirmarTexto = 'Confirmar', cancelarTexto = 'Cancelar'): Promise<boolean> {
    return new Promise((resolve) => {
      this.modalSignal.set({
        tipo: 'confirm',
        titulo,
        mensaje,
        confirmarTexto,
        cancelarTexto,
        resolver: (valor) => resolve(Boolean(valor))
      });
    });
  }

  showPromptModal(opciones: {
    titulo: string;
    mensaje: string;
    placeholder?: string;
    confirmarTexto?: string;
    cancelarTexto?: string;
    requerido?: boolean;
  }): Promise<string | null> {
    return new Promise((resolve) => {
      this.modalSignal.set({
        tipo: 'prompt',
        titulo: opciones.titulo,
        mensaje: opciones.mensaje,
        placeholder: opciones.placeholder,
        confirmarTexto: opciones.confirmarTexto ?? 'Enviar',
        cancelarTexto: opciones.cancelarTexto ?? 'Cancelar',
        requerido: opciones.requerido ?? false,
        resolver: (valor) => resolve(typeof valor === 'string' ? valor : null)
      });
    });
  }

  confirmar(valor: boolean | string | null): void {
    const modal = this.modalSignal();
    if (!modal) {
      return;
    }

    modal.resolver(valor);
    this.modalSignal.set(null);
  }

  mostrarError(error: string): void {
    const modal = this.modalSignal();
    if (!modal) {
      return;
    }

    this.modalSignal.set({ ...modal, error });
  }
}
