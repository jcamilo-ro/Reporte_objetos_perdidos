# Sistema de reporte de objetos perdidos

Backend en Django y Django REST Framework para registrar reportes de objetos perdidos o encontrados dentro de la Universidad de Narino.

## Funcionalidades

- Crear, consultar, actualizar y eliminar reportes de objetos.
- Clasificar reportes por categoria: celular, cuaderno, llaves, documentos u otros.
- Registrar lugar: bloque, salon, biblioteca, cafeteria u otros espacios.
- Manejar estados: perdido, encontrado y entregado.
- Administrar los reportes desde el panel de administracion de Django.
- Consultar la API REST desde `/api/reportes/`.

## Instalacion local

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Endpoints principales

- `GET /api/reportes/`: lista reportes.
- `POST /api/reportes/`: crea un reporte.
- `GET /api/reportes/{id}/`: consulta un reporte.
- `PUT /api/reportes/{id}/`: actualiza un reporte completo.
- `PATCH /api/reportes/{id}/`: actualiza parcialmente un reporte.
- `DELETE /api/reportes/{id}/`: elimina un reporte.

Tambien se pueden filtrar reportes con parametros:

- `/api/reportes/?estado=perdido`
- `/api/reportes/?categoria=documentos`
- `/api/reportes/?lugar=biblioteca`
- `/api/reportes/?q=carnet`

## Administracion

Para crear un usuario administrador:

```bash
python manage.py createsuperuser
```

Luego ingresa a `/admin/`.

Apuntes

28/04/2026


