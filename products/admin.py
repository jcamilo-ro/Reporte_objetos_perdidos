from django.contrib import admin
from .models import ReporteObjeto


@admin.register(ReporteObjeto)
class ReporteObjetoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre_objeto',
        'categoria',
        'lugar',
        'estado',
        'fecha_reporte',
    )
    list_filter = ('categoria', 'estado', 'lugar', 'fecha_reporte')
    search_fields = ('nombre_objeto', 'descripcion')
    ordering = ('-fecha_reporte',)
    readonly_fields = ('fecha_reporte',)
