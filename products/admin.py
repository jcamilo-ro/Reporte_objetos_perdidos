from django.contrib import admin
from .models import ReporteObjeto


# Este archivo registra los modelos en el panel administrativo de Django
# y personaliza como se veran al momento de gestionarlos.
@admin.register(ReporteObjeto)
class ReporteObjetoAdmin(admin.ModelAdmin):
    # Columnas visibles en la lista principal del admin.
    list_display = (
        'nombre_objeto',
        'categoria',
        'lugar',
        'estado',
        'fecha_reporte',
    )
    # Filtros laterales para buscar mas rapido en el admin.
    list_filter = ('categoria', 'estado', 'lugar', 'fecha_reporte')
    # Campos sobre los que el admin permitira hacer busquedas.
    search_fields = ('nombre_objeto', 'descripcion')
    # Orden por defecto: reportes mas recientes primero.
    ordering = ('-fecha_reporte',)
    # Campo solo de lectura para evitar editar manualmente la fecha automatica.
    readonly_fields = ('fecha_reporte',)
