from django.db import models


# Este archivo define los modelos, es decir, la estructura de datos
# que Django convertira en tablas dentro de la base de datos.
class ReporteObjeto(models.Model):
    # Opciones posibles para el estado del objeto reportado.
    ESTADOS = [
        ('perdido', 'Perdido'),
        ('encontrado', 'Encontrado'),
        ('entregado', 'Entregado'),
    ]

    # Opciones posibles para clasificar el tipo de objeto.
    CATEGORIAS = [
        ('celular', 'Celular'),
        ('cuaderno', 'Cuaderno'),
        ('llaves', 'Llaves'),
        ('documentos', 'Documentos'),
        ('otros', 'Otros'),
    ]

    # Opciones de lugares donde se puede perder o encontrar un objeto.
    LUGARES = [
        ('bloque', 'Bloque'),
        ('salon', 'Salon'),
        ('biblioteca', 'Biblioteca'),
        ('cafeteria', 'Cafeteria'),
        ('otros', 'Otros espacios'),
    ]

    # Campos principales que se guardan por cada reporte.
    nombre_objeto = models.CharField(max_length=100)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    lugar = models.CharField(max_length=100, choices=LUGARES)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='perdido')
    fecha_reporte = models.DateTimeField(auto_now_add=True)
    imagen = models.ImageField(upload_to='reportes/', null=True, blank=True)

    # Meta permite ajustar el comportamiento del modelo dentro de Django.
    # Aqui se ordenan primero los reportes mas recientes y se personaliza el nombre.
    class Meta:
        ordering = ['-fecha_reporte']
        verbose_name = 'reporte de objeto'
        verbose_name_plural = 'reportes de objetos'

    # __str__ define como se muestra cada objeto en admin y en otras partes de Django.
    def __str__(self):
        return f'{self.nombre_objeto} - {self.get_estado_display()}'
