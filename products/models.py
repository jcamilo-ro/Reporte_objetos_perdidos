from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


# Este archivo define el dominio persistente de reportes. Aquí viven las reglas
# que deben cumplirse incluso si el reporte llega desde API, admin o pruebas:
# código único, datos obligatorios, validación administrativa e historial.
class ReporteObjeto(models.Model):
    # Estados del ciclo de vida del caso. "por_confirmar" permite representar
    # solicitudes sensibles que todavía requieren revisión administrativa.
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('perdido', 'Perdido'),
        ('encontrado', 'Encontrado'),
        ('entregado', 'Entregado'),
        ('por_confirmar', 'Por confirmar'),
    ]

    TIPOS_REPORTE = [
        ('perdido', 'Objeto perdido'),
        ('encontrado', 'Objeto encontrado'),
    ]

    CATEGORIAS = [
        ('documentos', 'Documentos'),
        ('tecnologia', 'Tecnología'),
        ('llaves', 'Llaves'),
        ('ropa', 'Ropa'),
        ('cuadernos_libros', 'Cuadernos o libros'),
        ('otros', 'Otros'),
    ]

    TIPOS_PERSONA = [
        ('estudiante', 'Estudiante'),
        ('docente', 'Docente'),
        ('administrativo', 'Administrativo'),
    ]

    ACCIONES_OBJETO = [
        ('entrega_directa', 'Lo entregará directamente al dueño'),
        ('otro_lugar', 'Lo dejará en otro lugar'),
    ]

    # Datos principales del objeto.
    codigo = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)
    nombre_objeto = models.CharField(max_length=120)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=30, choices=CATEGORIAS)
    lugar = models.CharField(max_length=160)
    fecha_evento = models.DateField(default=timezone.localdate)
    tipo_reporte = models.CharField(max_length=20, choices=TIPOS_REPORTE, default='perdido')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    observaciones = models.TextField(blank=True)
    imagen = models.ImageField(upload_to='reportes/', null=True, blank=True)

    # Contacto principal para notificaciones por correo.
    reportante_nombre = models.CharField(max_length=140)
    reportante_correo = models.EmailField()
    reportante_celular = models.CharField(max_length=40, blank=True)

    # Datos de quien encontró el objeto.
    encontrado_nombre = models.CharField(max_length=140, blank=True)
    encontrado_tipo_persona = models.CharField(max_length=20, choices=TIPOS_PERSONA, default='estudiante')
    encontrado_contacto = models.CharField(max_length=140, blank=True)

    # Datos de quien perdió el objeto.
    perdido_nombre = models.CharField(max_length=140, default='Sin identificar')
    perdido_tipo_persona = models.CharField(max_length=20, choices=TIPOS_PERSONA, default='estudiante')
    perdido_contacto = models.CharField(max_length=140, default='Pendiente por confirmar')

    # Manejo físico del objeto encontrado.
    accion_objeto = models.CharField(max_length=20, choices=ACCIONES_OBJETO, default='otro_lugar')
    lugar_entrega = models.CharField(max_length=180, blank=True)

    # Campos de administración, visibilidad pública y auditoría.
    validado_por_admin = models.BooleanField(default=False)
    fecha_validacion_admin = models.DateTimeField(null=True, blank=True)
    eliminado_vista_publica = models.BooleanField(default=False)
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    fecha_eliminacion_publica = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(default=timezone.now)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'reporte de objeto'
        verbose_name_plural = 'reportes de objetos'

    def __str__(self):
        return f'{self.codigo or "Sin codigo"} - {self.nombre_objeto}'

    def clean(self):
        errores = {}

        if not self.reportante_nombre.strip():
            errores['reportante_nombre'] = 'El nombre de la persona que reporta es obligatorio.'
        if not self.reportante_correo.strip():
            errores['reportante_correo'] = 'El correo es obligatorio porque es el contacto principal.'

        if self.tipo_reporte == 'perdido':
            if not self.perdido_nombre.strip():
                errores['perdido_nombre'] = 'El nombre de quien perdió el objeto es obligatorio.'
            if not self.perdido_contacto.strip():
                errores['perdido_contacto'] = 'El correo de contacto es obligatorio.'

        if self.tipo_reporte == 'encontrado':
            if not self.encontrado_nombre.strip():
                errores['encontrado_nombre'] = 'El nombre de quien encontró el objeto es obligatorio.'
            if not self.encontrado_contacto.strip():
                errores['encontrado_contacto'] = 'El correo de contacto es obligatorio.'

        if errores:
            raise ValidationError(errores)

    def save(self, *args, **kwargs):
        es_nuevo = self.pk is None
        super().save(*args, **kwargs)

        # El código se genera después del primer guardado para poder usar el id
        # real de base de datos. Luego no se vuelve a tocar en ediciones.
        if es_nuevo and not self.codigo:
            self.codigo = f'REP-{self.creado_en.year}-{self.pk:06d}'
            super().save(update_fields=['codigo'])


class CambioEstadoPendiente(models.Model):
    # Solicitud administrativa para cambios sensibles de estado. Se conecta con
    # ReporteObjeto mediante ForeignKey y puede aprobarse o rechazarse después.
    ESTADOS_APROBACION = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    reporte = models.ForeignKey(ReporteObjeto, related_name='cambios_pendientes', on_delete=models.CASCADE)
    estado_anterior = models.CharField(max_length=20, choices=ReporteObjeto.ESTADOS)
    estado_solicitado = models.CharField(max_length=20, choices=ReporteObjeto.ESTADOS)
    solicitado_por = models.CharField(max_length=80, default='usuario')
    aprobacion = models.CharField(max_length=20, choices=ESTADOS_APROBACION, default='pendiente')
    creado_en = models.DateTimeField(auto_now_add=True)
    resuelto_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'cambio de estado pendiente'
        verbose_name_plural = 'cambios de estado pendientes'

    def __str__(self):
        return f'{self.reporte.nombre_objeto}: {self.estado_anterior} -> {self.estado_solicitado}'


class HistorialCambio(models.Model):
    # Historial de auditoría. Guarda cambios relevantes para que el administrador
    # pueda explicar qué ocurrió con cada caso durante la trazabilidad.
    ESTADOS_APROBACION = [
        ('no_aplica', 'No aplica'),
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    reporte = models.ForeignKey(ReporteObjeto, related_name='historial', on_delete=models.CASCADE)
    tipo_cambio = models.CharField(max_length=100)
    rol = models.CharField(max_length=40, default='usuario')
    usuario_admin = models.CharField(max_length=150, blank=True)
    campo = models.CharField(max_length=80)
    valor_anterior = models.TextField(blank=True)
    valor_nuevo = models.TextField(blank=True)
    descripcion = models.TextField(blank=True)
    aprobacion = models.CharField(max_length=20, choices=ESTADOS_APROBACION, default='no_aplica')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'historial de cambio'
        verbose_name_plural = 'historial de cambios'

    def __str__(self):
        return f'{self.tipo_cambio} - {self.reporte.nombre_objeto}'


class CoincidenciaReporte(models.Model):
    reporte_origen = models.ForeignKey(
        ReporteObjeto,
        related_name='coincidencias_generadas',
        on_delete=models.CASCADE,
    )
    reporte_relacionado = models.ForeignKey(
        ReporteObjeto,
        related_name='coincidencias_recibidas',
        on_delete=models.CASCADE,
    )
    puntaje = models.PositiveSmallIntegerField(default=0)
    motivos = models.CharField(max_length=255, blank=True)
    notificada = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        unique_together = ('reporte_origen', 'reporte_relacionado')
        verbose_name = 'coincidencia de reporte'
        verbose_name_plural = 'coincidencias de reportes'

    def __str__(self):
        return f'{self.reporte_origen.codigo} -> {self.reporte_relacionado.codigo}'
