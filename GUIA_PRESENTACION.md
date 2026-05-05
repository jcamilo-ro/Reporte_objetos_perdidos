# Guia corta de presentacion

## 1. En que consiste el proyecto

Este proyecto es un sistema web para reportar objetos perdidos y encontrados dentro de la Universidad de Narino.

Permite:

- registrar objetos perdidos o encontrados
- clasificar los reportes por categoria
- indicar el lugar donde se perdio o se encontro
- manejar el estado del objeto
- administrar los reportes desde Django Admin
- consultar la informacion mediante una API REST

Frase de apertura:

> Nuestro proyecto es un backend desarrollado con Django y Django REST Framework para gestionar reportes de objetos perdidos y encontrados dentro de la Universidad de Narino.

## 2. Tenemos base de datos

Si. El proyecto usa **SQLite**, que es la base de datos por defecto de Django.

- se configura en `settings.py`
- guarda la informacion en el archivo `db.sqlite3`
- almacena los reportes creados desde la API o el panel admin

Frase:

> La base de datos usada es SQLite, elegida por ser simple, liviana y adecuada para un proyecto academico.

## 3. Que mostrar primero en Visual Studio Code

Muestra esta estructura:

- `proyecto1/`
- `products/`
- `manage.py`
- `requirements.txt`
- `.gitignore`

Explicacion rapida:

- `proyecto1/`: configuracion principal del proyecto Django
- `products/`: app donde esta la logica del sistema
- `manage.py`: archivo para ejecutar comandos de Django
- `requirements.txt`: librerias instaladas
- `.gitignore`: evita subir entorno virtual, base de datos y archivos temporales

## 4. Que decir archivo por archivo

### `settings.py`

Es la configuracion general del proyecto.

Lo mas importante aqui:

- se activa `rest_framework`
- se registra la app `products`
- se configura SQLite como base de datos
- se define idioma y zona horaria
- se configuran `MEDIA_URL` y `MEDIA_ROOT` para imagenes

Frase:

> En `settings.py` se activa Django REST Framework y se define la configuracion principal del proyecto, incluida la base de datos.

### `models.py`

Define la estructura de los datos.

Bloques importantes:

- `ESTADOS`: perdido, encontrado, entregado
- `CATEGORIAS`: celular, cuaderno, llaves, documentos, otros
- `LUGARES`: bloque, salon, biblioteca, cafeteria, otros
- campos del modelo: nombre, descripcion, categoria, lugar, estado, fecha, imagen

Frase:

> En `models.py` definimos el modelo `ReporteObjeto`, que representa cada reporte guardado en la base de datos.

### `serializers.py`

Convierte los datos del modelo a JSON y valida la informacion que entra por la API.

Bloques importantes:

- `ReporteObjetoSerializer`
- `fields`: define que campos vera la API
- `read_only_fields`: evita editar `id` y `fecha_reporte`

Frase:

> El serializer funciona como puente entre el modelo y la API.

### `views.py`

Contiene la logica de la API.

Bloques importantes:

- `ModelViewSet`: crea automaticamente el CRUD
- `queryset`: define los registros a consultar
- `serializer_class`: indica que serializer usar
- `get_queryset`: aplica filtros por estado, categoria, lugar o nombre

Frase:

> En `views.py` implementamos el CRUD y los filtros de la API.

### `products/urls.py`

Define las rutas de la API de la app.

Bloques importantes:

- `DefaultRouter()`
- `router.register('reportes', ...)`

Frase:

> Este archivo genera automaticamente las rutas REST para trabajar con reportes.

### `proyecto1/urls.py`

Conecta la app con el proyecto principal.

Bloques importantes:

- `admin/`
- `api/`
- `static(...)` para servir imagenes en desarrollo

Frase:

> Aqui conectamos el panel administrador y la API al proyecto principal.

## 5. Que mostrar ya corriendo la app

Primero corre:

```powershell
.\.venv\Scripts\activate
python manage.py runserver
```

Despues muestra:

- `http://127.0.0.1:8000/api/reportes/`
- `http://127.0.0.1:8000/admin/`

Orden sugerido:

1. mostrar la API en navegador
2. mostrar que responde en JSON
3. mostrar el panel admin
4. entrar y ensenar los reportes

## 6. Como usar Postman

Usa esta base URL:

`http://127.0.0.1:8000/api/reportes/`

### Listar reportes

- Metodo: `GET`
- URL: `http://127.0.0.1:8000/api/reportes/`

### Crear reporte

- Metodo: `POST`
- URL: `http://127.0.0.1:8000/api/reportes/`
- Body -> `raw` -> `JSON`

```json
{
  "nombre_objeto": "Carnet estudiantil",
  "descripcion": "Encontrado en la biblioteca central",
  "categoria": "documentos",
  "lugar": "biblioteca",
  "estado": "encontrado"
}
```

### Filtrar por estado

- Metodo: `GET`
- URL: `http://127.0.0.1:8000/api/reportes/?estado=perdido`

### Actualizar un reporte

- Metodo: `PATCH`
- URL: `http://127.0.0.1:8000/api/reportes/1/`
- Body -> `raw` -> `JSON`

```json
{
  "estado": "entregado"
}
```

### Eliminar un reporte

- Metodo: `DELETE`
- URL: `http://127.0.0.1:8000/api/reportes/1/`

## 7. Mini cierre de exposicion

> En conclusion, el proyecto usa Django para la estructura del backend, SQLite para almacenar la informacion y Django REST Framework para exponer una API CRUD que permite registrar, consultar, actualizar y eliminar reportes de objetos perdidos y encontrados.
