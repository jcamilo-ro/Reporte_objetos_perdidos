import { Routes } from '@angular/router';
import { adminGuard } from './core/services/admin.guard';
import { AdminPageComponent } from './features/admin/admin-page/admin-page.component';
import { LoginPageComponent } from './features/auth/login-page/login-page.component';
import { InicioPageComponent } from './features/inicio/inicio-page/inicio-page.component';
import { ReporteFormPageComponent } from './features/reportes/reporte-form-page/reporte-form-page.component';
import { ReportesPageComponent } from './features/reportes/reportes-page/reportes-page.component';

/**
 * Rutas principales del frontend.
 * Separan la navegación en vistas claras: inicio, consulta, reporte y
 * administración, cumpliendo la arquitectura solicitada para una app Angular.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    component: InicioPageComponent,
    title: 'Inicio | Gestión de Objetos Perdidos y Encontrados'
  },
  {
    path: 'reportes',
    component: ReportesPageComponent,
    title: 'Consultar reportes | Universidad de Nariño'
  },
  {
    path: 'reportar',
    component: ReporteFormPageComponent,
    title: 'Reportar objeto | Universidad de Nariño'
  },
  {
    path: 'admin',
    component: AdminPageComponent,
    canActivate: [adminGuard],
    title: 'Administración | Universidad de Nariño'
  },
  {
    path: 'login',
    component: LoginPageComponent,
    title: 'Ingreso administrador | Universidad de Nariño'
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
