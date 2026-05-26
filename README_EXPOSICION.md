# Guia de exposicion - Objetos perdidos Universidad de Narino

Duracion sugerida: 5 a 10 minutos.

Objetivo del guion: explicar la pagina sin llenar la exposicion de informacion. La idea es decir que el proyecto permite consultar, registrar y administrar objetos perdidos o encontrados dentro de la universidad, dejando trazabilidad de cada caso.

## Parte 1: Explicacion de la pagina

### 1. Inicio

Que mostrar:
- La pantalla inicial.
- Los botones `Reportar objeto`, `Consultar reportes` e `Ingresar como administrador`.
- Las metricas: visibles, pendientes, entregados y por confirmar.

Donde dar clic:
- Primero en `Inicio`.

Que decir:
> Esta es la entrada del sistema. Desde aqui el usuario puede consultar si un objeto ya fue reportado, registrar un objeto perdido o encontrado, y el administrador puede revisar los casos. Las metricas resumen el estado general de los reportes.

Codigo para mencionar rapido:
- `frontend/src/app/app.routes.ts`: define las rutas principales de la pagina.
- `frontend/src/app/features/inicio/inicio-page/`: contiene la pantalla de inicio.

### 2. Consultar reportes

Que mostrar:
- La tabla de reportes.
- El buscador simple.
- Los filtros por estado, categoria y tipo.
- La columna de foto, lugar, fecha, personas y acciones.

Donde dar clic:
- Clic en `Consultar reportes`.
- En el buscador escribir `Celular Samsung negro`.
- Probar algun filtro, por ejemplo categoria `Tecnologia`.

Que decir:
> Antes de crear un reporte, el usuario puede buscar si el objeto ya esta registrado. El buscador compara palabras clave con los datos del reporte, como nombre, descripcion, categoria, lugar, estado y personas relacionadas. Esto ayuda a evitar duplicados.

Codigo para mencionar rapido:
- `frontend/src/app/features/reportes-list/reportes-list.component.html`: arma la tabla, filtros, botones y detalle.
- `frontend/src/app/core/services/reportes.service.ts`: guarda la logica de busqueda, filtros y reportes visibles.

Bloque importante para explicar:
```ts
private coincideBusquedaNatural(reporte: ReporteObjeto, busqueda: string): boolean {
  const tokens = this.tokenizar(texto).filter(...);
  const textoReporte = this.tokenizar([...].join(' '));
  return tokens.length === 0 || tokens.some((token) => textoReporte.includes(token));
}
```

Que decir del bloque:
> Este metodo convierte la busqueda en palabras clave y las compara contra un texto armado con los campos principales del reporte. No es una busqueda complicada; es simple, rapida y facil de defender.

### 3. Ver foto y detalle

Que mostrar:
- En la tabla, un reporte que tenga boton `Ver` en la columna `Foto`.
- El modal o vista de fotografia.
- El boton de lupa para ver el detalle del caso.

Donde dar clic:
- Clic en `Ver`.
- Clic en la lupa del reporte.

Que decir:
> La foto ayuda a identificar visualmente el objeto. El detalle permite revisar observaciones, manejo del objeto e historial cuando estamos en administracion, sin salir de la tabla.

Codigo para mencionar rapido:
- `frontend/src/app/features/reportes-list/reportes-list.component.ts`: contiene metodos como `abrirFotografia`, `rutaFotografia` y `alternarDetalle`.
- `frontend/public/reportes/`: guarda imagenes de ejemplo usadas por la aplicacion.

### 4. Reportar objeto perdido

Que mostrar:
- El formulario por pasos.
- La opcion `Perdi un objeto`.
- Los datos del objeto.
- Los datos de quien lo perdio.
- El resumen final.

Donde dar clic:
- Clic en `Reportar objeto`.
- Clic en `Perdi un objeto`.
- Completar datos basicos.
- Clic en `Continuar` hasta el resumen.
- Clic en `Guardar reporte`.

Que decir:
> Cuando el usuario reporta un objeto perdido, el sistema pide los datos del objeto y los datos de quien lo perdio, porque esa persona es el contacto principal del caso. El formulario esta dividido por pasos para que sea mas facil de llenar.

Codigo para mencionar rapido:
- `frontend/src/app/features/reporte-form/reporte-form.component.html`: estructura visual del formulario.
- `frontend/src/app/features/reporte-form/reporte-form.component.ts`: controla pasos, validaciones y guardado.

Bloque importante para explicar:
```ts
readonly formulario = this.formBuilder.nonNullable.group({
  nombre: ['', [Validators.required, Validators.minLength(3)]],
  descripcion: ['', [Validators.required, Validators.minLength(10)]],
  lugar: ['', Validators.required],
  perdidoPor: this.formBuilder.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(5)]],
    contacto: ['', [Validators.required, Validators.email]]
  })
});
```

Que decir del bloque:
> Aqui se ve que Angular valida los campos antes de guardar. Por ejemplo, nombre, descripcion, lugar, nombre de la persona y contacto son obligatorios.

### 5. Reportar objeto encontrado

Que mostrar:
- La opcion `Encontre un objeto`.
- Que el formulario cambia los datos que pide.
- El campo `Donde lo dejaras` cuando aplica.

Donde dar clic:
- Volver a `Reportar objeto`.
- Clic en `Encontre un objeto`.
- Mostrar que ahora se piden datos de quien encontro el objeto.

Que decir:
> El formulario se adapta al tipo de reporte. Si el objeto fue encontrado, no se obliga a saber quien lo perdio; el dueno puede quedar como sin identificar. Esto evita pedir datos que el usuario no tiene.

Codigo para mencionar rapido:
- `reporte-form.component.ts`, metodo `sincronizarTipo`.

Bloque importante para explicar:
```ts
private sincronizarTipo(tipo: TipoReporte): void {
  this.formulario.patchValue({ estado: tipo === 'perdido' ? 'perdido' : 'encontrado' });
  if (tipo === 'encontrado') {
    encontradoPor.nombreCompleto.setValidators([...]);
    perdidoPor.nombreCompleto.clearValidators();
  }
}
```

Que decir del bloque:
> Este metodo cambia las reglas del formulario segun el tipo de reporte. Por eso la pagina no muestra ni exige lo mismo para un objeto perdido que para uno encontrado.

### 6. Administracion

Que mostrar:
- El panel de administracion.
- Total de reportes, pendientes y ocultos.
- La tabla completa.
- Botones de editar, validar, aprobar, rechazar, restaurar u ocultar.

Donde dar clic:
- Clic en `Ingresar como administrador` o `Administracion`.
- Si aparece login, ingresar como administrador.
- En la tabla, mostrar los botones de acciones.

Que decir:
> Esta parte es para el administrador. Desde aqui se revisan todos los reportes, incluso los que no aparecen en la vista publica. El administrador puede validar reportes, aprobar cambios, editar datos y ocultar reportes de la vista publica.

Codigo para mencionar rapido:
- `frontend/src/app/features/admin/admin-page/`: pantalla administrativa.
- `frontend/src/app/core/services/admin.guard.ts`: protege la ruta de administracion.
- `frontend/src/app/core/services/auth.service.ts`: maneja el acceso local del administrador.

### 7. Validar, editar y ocultar

Que mostrar:
- Un reporte no validado.
- El boton de validar.
- El lapiz para editar.
- La papelera para ocultar de la vista publica.

Donde dar clic:
- Clic en el boton de validar.
- Clic en el lapiz y cambiar una observacion.
- Guardar cambios.
- Clic en la papelera y confirmar.

Que decir:
> Validar significa que el administrador ya reviso el reporte. Editar permite corregir informacion. Ocultar no es lo mismo que borrar inmediatamente; primero se quita de la vista publica para conservar trazabilidad.

Codigo para mencionar rapido:
- `frontend/src/app/features/admin/admin-page/admin-page.component.ts`: ejecuta acciones administrativas.
- `frontend/src/app/core/services/reportes.service.ts`: aplica cambios, historial, validacion y ocultamiento.
- `frontend/src/app/core/services/modal.service.ts`: muestra confirmaciones personalizadas.

### 8. Historial

Que mostrar:
- En administracion, abrir el detalle con la lupa.
- Mostrar `Historial de cambios`.

Donde dar clic:
- Clic en la lupa de un reporte desde administracion.

Que decir:
> El historial permite explicar que cambio, cuando cambio y si fue una accion de usuario, administrador o sistema. Esta parte es importante porque le da trazabilidad al proyecto.

Codigo para mencionar rapido:
- `frontend/src/app/features/reportes-list/reportes-list.component.html`: muestra el historial.
- `frontend/src/app/core/models/reporte-objeto.model.ts`: define la estructura del reporte y del historial en frontend.

## Parte 2: Explicacion del codigo

### 1. Estructura general

Que mostrar:
- La carpeta `frontend`.
- La carpeta `products`.
- La carpeta `proyecto1`.

Que decir:
> El proyecto esta dividido en frontend y backend. El frontend esta hecho con Angular y maneja la interfaz. El backend esta hecho con Django y define modelos, validaciones, API y administracion.

Archivos importantes:
- `frontend/src/app/app.routes.ts`: rutas de la aplicacion Angular.
- `frontend/src/app/features/`: pantallas principales.
- `frontend/src/app/core/services/`: logica compartida como reportes, autenticacion, modales y API.
- `products/models.py`: modelos de base de datos.
- `products/serializers.py`: convierte modelos a JSON y valida datos.
- `products/views.py`: endpoints de la API.
- `products/urls.py`: rutas de la API.
- `proyecto1/settings.py`: configuracion general de Django.
- `proyecto1/urls.py`: rutas principales del backend.

### 2. Modelo principal en Django

Que mostrar:
- Abrir `products/models.py`.
- Mostrar la clase `ReporteObjeto`.

Que decir:
> Este es el modelo principal. Representa cada objeto perdido o encontrado. Aqui estan los campos del objeto, los datos de personas, el estado, la imagen, la validacion administrativa y la visibilidad publica.

Bloque importante:
```py
class ReporteObjeto(models.Model):
    codigo = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)
    nombre_objeto = models.CharField(max_length=120)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=30, choices=CATEGORIAS)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    imagen = models.ImageField(upload_to='reportes/', null=True, blank=True)
```

Que decir del bloque:
> Estos son los datos base del reporte: codigo, nombre, descripcion, categoria, estado e imagen. Las opciones controladas evitan guardar valores desordenados.

### 3. Codigo unico del reporte

Que mostrar:
- En `products/models.py`, metodo `save`.

Que decir:
> Cada reporte tiene un codigo unico con formato `REP-ANO-ID`. Se genera despues del primer guardado porque necesita el id real de la base de datos. Luego no se vuelve a cambiar.

Bloque importante:
```py
def save(self, *args, **kwargs):
    es_nuevo = self.pk is None
    super().save(*args, **kwargs)

    if es_nuevo and not self.codigo:
        self.codigo = f'REP-{self.creado_en.year}-{self.pk:06d}'
        super().save(update_fields=['codigo'])
```

### 4. Validaciones del backend

Que mostrar:
- `products/serializers.py`.
- Metodo `validate`.

Que decir:
> Aunque el frontend valida, el backend tambien revisa los datos. Esto es importante porque la API no debe confiar solamente en la pagina.

Bloque importante:
```py
def validate(self, attrs):
    tipo_reporte = attrs.get('tipo_reporte', getattr(instance, 'tipo_reporte', 'perdido'))
    if tipo_reporte == 'perdido':
        ...
    if tipo_reporte == 'encontrado':
        ...
    return attrs
```

Que decir del bloque:
> La validacion cambia segun el tipo de reporte. Si es perdido pide datos de quien perdio; si es encontrado pide datos de quien encontro.

### 5. API y filtros

Que mostrar:
- `products/views.py`.
- Metodo `get_queryset`.

Que decir:
> Esta vista controla que reportes se devuelven. En la vista publica oculta reportes eliminados y entregados antiguos. En administracion permite ver todo. Tambien aplica filtros por estado, categoria, tipo y busqueda.

Bloque importante:
```py
def get_queryset(self):
    queryset = ReporteObjeto.objects.prefetch_related('historial', 'cambios_pendientes').all()
    es_admin = self.request.query_params.get('admin') == 'true'
    if not es_admin:
        queryset = queryset.filter(eliminado_vista_publica=False)
    ...
    return queryset
```

### 6. Acciones administrativas

Que mostrar:
- En `products/views.py`, acciones `validar_admin`, `ocultar_publico`, `aprobar_cambio_estado` y `rechazar_cambio_estado`.

Que decir:
> Estas acciones son endpoints especiales para administracion. No son solo crear y editar; tambien permiten validar, ocultar, restaurar y aprobar o rechazar cambios.

Archivos relacionados:
- `products/views.py`: acciones de la API.
- `products/models.py`: campos de validacion, historial y cambios pendientes.
- `products/services.py`: funciones reutilizables como historial y coincidencias.

### 7. Servicio de reportes en Angular

Que mostrar:
- `frontend/src/app/core/services/reportes.service.ts`.

Que decir:
> Este servicio concentra la logica del frontend: lista de reportes, filtros, busqueda, reportes publicos, reportes de administracion, historial, validacion y ocultamiento.

Bloque importante:
```ts
readonly reportesPublicos = computed(() =>
  this.reportesSignal().filter((reporte) => this.esVisiblePublicamente(reporte))
);
```

Que decir del bloque:
> Aqui se separa lo que ve un usuario normal de lo que ve administracion. Si un reporte esta oculto o ya no debe aparecer publicamente, no se muestra en la consulta normal.

### 8. Modales personalizados

Que mostrar:
- Una confirmacion al validar, editar u ocultar.
- Luego abrir `modal.service.ts` si se va a mostrar codigo.

Que decir:
> En vez de usar alertas nativas del navegador, el proyecto usa modales propios. Esto hace que las confirmaciones se vean integradas con el diseno de la aplicacion.

Archivos importantes:
- `frontend/src/app/core/services/modal.service.ts`: abre modales de informacion, confirmacion y entrada de texto.
- `frontend/src/app/shared/components/app-modal/`: componente visual del modal.
- `frontend/src/app/app.component.html`: monta el modal global.

## Cierre sugerido

Que decir:
> En resumen, el proyecto permite consultar, reportar y administrar objetos perdidos o encontrados. La parte publica esta pensada para que cualquier usuario busque y registre casos facilmente. La parte administrativa agrega validacion, edicion, aprobacion de cambios, ocultamiento e historial. En codigo, lo mas importante esta dividido entre Angular para la interfaz y Django para los modelos, validaciones y API.

## Orden recomendado para una exposicion de 5 a 10 minutos

1. Inicio: 30 segundos.
2. Consultar reportes, filtros y busqueda: 1 minuto.
3. Ver foto y detalle: 1 minuto.
4. Reportar objeto perdido o encontrado: 2 minutos.
5. Administracion: validar, editar, ocultar e historial: 2 minutos.
6. Codigo clave: modelos, rutas, formulario, servicio de reportes y API: 2 a 3 minutos.

## Lista corta de archivos para memorizar

- `frontend/src/app/app.routes.ts`: navegacion principal.
- `frontend/src/app/features/inicio/inicio-page/`: pantalla inicial.
- `frontend/src/app/features/reportes-list/`: tabla, filtros, foto, detalle e historial.
- `frontend/src/app/features/reporte-form/`: formulario para crear y editar reportes.
- `frontend/src/app/features/admin/admin-page/`: panel administrativo.
- `frontend/src/app/core/services/reportes.service.ts`: logica principal del frontend.
- `frontend/src/app/core/services/modal.service.ts`: confirmaciones personalizadas.
- `products/models.py`: modelos de datos, codigo unico e historial.
- `products/serializers.py`: validaciones y conversion a JSON.
- `products/views.py`: API, filtros y acciones administrativas.
- `products/services.py`: historial y coincidencias.
