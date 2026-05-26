import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../../core/services/modal.service';

/**
 * Modal global de la aplicacion.
 * Centraliza avisos, confirmaciones y solicitudes de texto con el estilo visual
 * del sistema de Objetos Perdidos.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.scss'
})
export class AppModalComponent {
  readonly modalService = inject(ModalService);
  readonly texto = signal('');

  cancelar(): void {
    this.texto.set('');
    this.modalService.confirmar(null);
  }

  aceptar(): void {
    const modal = this.modalService.modal();

    if (!modal) {
      return;
    }

    if (modal.tipo === 'prompt') {
      const valor = this.texto().trim();
      if (modal.requerido && !valor) {
        this.modalService.mostrarError('Escribe una observación corta para continuar.');
        return;
      }

      this.texto.set('');
      this.modalService.confirmar(valor);
      return;
    }

    this.texto.set('');
    this.modalService.confirmar(true);
  }
}
