import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportesService } from '../../../core/services/reportes.service';

/**
 * Página de inicio del sistema.
 * Presenta la herramienta como una solución universitaria y se conecta con
 * ReportesService para mostrar estadísticas resumidas sin cargar la vista.
 */
@Component({
  selector: 'app-inicio-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inicio-page.component.html',
  styleUrl: './inicio-page.component.scss'
})
export class InicioPageComponent {
  private readonly reportesService = inject(ReportesService);

  readonly resumen = this.reportesService.resumen;
}
