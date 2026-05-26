import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

/**
 * Punto de entrada del frontend Angular.
 * Inicia el componente raíz `AppComponent` usando la configuración declarada en
 * `app.config.ts`, donde se conectan rutas y proveedores globales.
 */
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
