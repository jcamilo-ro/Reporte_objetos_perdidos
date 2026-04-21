from django.db import models


class ReporteObjeto(models.Model):
    ESTADOS = [
        ('perdido', 'Perdido'),
        ('encontrado', 'Encontrado'),
        ('entregado', 'Entregado'),
    ]

    CATEGORIAS = [
        ('celular', 'Celular'),
        ('cuaderno', 'Cuaderno'),
        ('llaves', 'Llaves'),
        ('documentos', 'Documentos'),
        ('otros', 'Otros'),
    ]

    LUGARES = [
        ('bloque', 'Bloque'),
        ('salon', 'Salon'),
        ('biblioteca', 'Biblioteca'),
        ('cafeteria', 'Cafeteria'),
        ('otros', 'Otros espacios'),
    ]

    nombre_objeto = models.CharField(max_length=100)
    descripcion = models.TextField()
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    lugar = models.CharField(max_length=100, choices=LUGARES)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='perdido')
    fecha_reporte = models.DateTimeField(auto_now_add=True)
    imagen = models.ImageField(upload_to='reportes/', null=True, blank=True)

    class Meta:
        ordering = ['-fecha_reporte']
        verbose_name = 'reporte de objeto'
        verbose_name_plural = 'reportes de objetos'

    def __str__(self):
        return f'{self.nombre_objeto} - {self.get_estado_display()}'
