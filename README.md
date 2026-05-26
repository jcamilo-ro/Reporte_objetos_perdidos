# Objetos Perdidos - Universidad de Narino

Sistema academico para reportar, consultar y administrar objetos perdidos o encontrados. Incluye codigo unico por reporte, notificaciones por correo de Django, historial de modificaciones, deteccion simple de coincidencias y validacion administrativa.

## Funcionalidades

- Reportar objeto perdido o encontrado con formulario por pasos.
- Consultar reportes con filtros y buscador por frase natural.
- Generar codigo unico tipo `REP-2026-000001`.
- Enviar correos por consola en desarrollo y por SMTP con variables de entorno.
- Administrar reportes, validar casos y ocultarlos de la vista publica con confirmacion.
- Guardar historial de creacion, edicion, validacion, cambios de estado y eliminacion.

## Instalacion

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
```

Frontend:

```bash
cd frontend
npm install
```

## Ejecucion

Backend:

```bash
.venv\Scripts\python.exe manage.py runserver
```

Frontend:

```bash
cd frontend
npm start -- --host 127.0.0.1 --port 4200
```

## Migraciones y pruebas

Crear migraciones despues de cambiar modelos:

```bash
.venv\Scripts\python.exe manage.py makemigrations
```

Aplicar migraciones:

```bash
.venv\Scripts\python.exe manage.py migrate
```

Ejecutar pruebas:

```bash
.venv\Scripts\python.exe manage.py test products
```

## Correo

En desarrollo los correos se imprimen en consola:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Sistema de reportes <admin@example.com>
```

Para SMTP real:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=usuario@example.com
EMAIL_HOST_PASSWORD=clave-segura
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=Sistema de reportes <admin@example.com>
```

No se usa WhatsApp, SMS ni plugins externos de Gmail.

## Endpoints principales

- `GET /api/reportes/`
- `GET /api/reportes/?q=Celular Samsung negro`
- `POST /api/reportes/`
- `PATCH /api/reportes/{id}/`
- `POST /api/reportes/{id}/validar-admin/`
- `POST /api/reportes/{id}/ocultar-publico/`

La guia completa para exposicion esta en `README_EXPOSICION.md`.
