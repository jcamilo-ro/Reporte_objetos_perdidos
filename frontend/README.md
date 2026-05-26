# Frontend de objetos perdidos

Aplicación Angular para gestionar reportes de objetos perdidos y encontrados en la Universidad de Nariño. El frontend usa componentes standalone, formularios reactivos, filtros y datos simulados persistidos temporalmente en `localStorage`.

## Servidor de desarrollo

Para iniciar el servidor local:

```bash
npm.cmd start
```

Luego abre `http://localhost:4200/`. La aplicación recarga automáticamente cuando se modifican archivos.

## Compilación

Para verificar que el proyecto compile:

```bash
npm.cmd run build
```

El resultado se genera en `dist/`.

## Estructura principal

- `src/app/core/models`: contratos TypeScript del dominio.
- `src/app/core/services`: estado y persistencia temporal de reportes.
- `src/app/features/dashboard`: panel principal.
- `src/app/features/reporte-form`: formulario reactivo de registro.
- `src/app/features/reportes-list`: consulta de reportes con tabla, filtros y acceso al formulario.
- `src/app/shared/components/app-header`: navegacion superior.

## Nota

El archivo `README_EXPOSICION.md` es una guia personal para practicar la sustentacion y esta ignorado por Git.
