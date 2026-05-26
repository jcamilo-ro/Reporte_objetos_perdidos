from django.contrib import admin
from .models import CambioEstadoPendiente, CoincidenciaReporte, HistorialCambio, ReporteObjeto
from .services import (
    detectar_y_notificar_coincidencias,
    enviar_correo_actualizacion,
    enviar_correo_creacion,
    registrar_historial,
)


# Este archivo configura el panel administrativo de Django.
# Permite revisar reportes, cambios pendientes e historial técnico sin depender
# todavía de una interfaz administrativa externa.
class HistorialCambioInline(admin.TabularInline):
    model = HistorialCambio
    extra = 0
    readonly_fields = (
        'tipo_cambio',
        'rol',
        'usuario_admin',
        'campo',
        'valor_anterior',
        'valor_nuevo',
        'descripcion',
        'aprobacion',
        'creado_en',
    )
    can_delete = False


class CambioEstadoPendienteInline(admin.TabularInline):
    model = CambioEstadoPendiente
    extra = 0
    readonly_fields = (
        'estado_anterior',
        'estado_solicitado',
        'solicitado_por',
        'aprobacion',
        'creado_en',
        'resuelto_en',
    )
    can_delete = False


@admin.register(ReporteObjeto)
class ReporteObjetoAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'nombre_objeto',
        'tipo_reporte',
        'categoria',
        'estado',
        'validado_por_admin',
        'eliminado_vista_publica',
        'creado_en',
    )
    list_filter = (
        'tipo_reporte',
        'categoria',
        'estado',
        'validado_por_admin',
        'eliminado_vista_publica',
        'creado_en',
    )
    search_fields = (
        'nombre_objeto',
        'descripcion',
        'codigo',
        'lugar',
        'reportante_nombre',
        'reportante_correo',
        'perdido_nombre',
        'encontrado_nombre',
    )
    readonly_fields = (
        'creado_en',
        'actualizado_en',
        'fecha_entrega',
        'fecha_validacion_admin',
        'fecha_eliminacion_publica',
        'codigo',
    )
    inlines = [CambioEstadoPendienteInline, HistorialCambioInline]
    ordering = ('-creado_en',)

    def save_model(self, request, obj, form, change):
        cambios = []
        if change:
            anterior = ReporteObjeto.objects.get(pk=obj.pk)
            for campo in form.changed_data:
                cambios.append((campo, getattr(anterior, campo, ''), getattr(obj, campo, '')))
            if 'validado_por_admin' in form.changed_data and obj.validado_por_admin and not obj.fecha_validacion_admin:
                from django.utils import timezone

                obj.fecha_validacion_admin = timezone.now()

        super().save_model(request, obj, form, change)

        if change:
            for campo, valor_anterior, valor_nuevo in cambios:
                registrar_historial(
                    reporte=obj,
                    tipo_cambio='Edición de reporte',
                    rol='administrador',
                    usuario_admin=request.user.get_username(),
                    campo=campo,
                    valor_anterior=valor_anterior,
                    valor_nuevo=valor_nuevo,
                    descripcion='Cambio registrado desde el panel admin de Django.',
                )
            if cambios:
                enviar_correo_actualizacion(obj, cambios)
                detectar_y_notificar_coincidencias(obj)
        else:
            registrar_historial(
                reporte=obj,
                tipo_cambio='Creación de reporte',
                rol='administrador',
                usuario_admin=request.user.get_username(),
                campo='sistema',
                valor_nuevo=obj.codigo,
                descripcion='Reporte creado desde el panel admin de Django.',
            )
            enviar_correo_creacion(obj)
            detectar_y_notificar_coincidencias(obj)


@admin.register(CambioEstadoPendiente)
class CambioEstadoPendienteAdmin(admin.ModelAdmin):
    list_display = (
        'reporte',
        'estado_anterior',
        'estado_solicitado',
        'solicitado_por',
        'aprobacion',
        'creado_en',
    )
    list_filter = ('aprobacion', 'estado_anterior', 'estado_solicitado', 'creado_en')
    search_fields = ('reporte__nombre_objeto', 'solicitado_por')
    readonly_fields = ('creado_en', 'resuelto_en')


@admin.register(HistorialCambio)
class HistorialCambioAdmin(admin.ModelAdmin):
    list_display = ('reporte', 'tipo_cambio', 'rol', 'usuario_admin', 'campo', 'aprobacion', 'creado_en')
    list_filter = ('rol', 'tipo_cambio', 'aprobacion', 'creado_en')
    search_fields = ('reporte__nombre_objeto', 'campo', 'valor_anterior', 'valor_nuevo')
    readonly_fields = ('creado_en',)


@admin.register(CoincidenciaReporte)
class CoincidenciaReporteAdmin(admin.ModelAdmin):
    list_display = ('reporte_origen', 'reporte_relacionado', 'puntaje', 'notificada', 'creado_en')
    list_filter = ('notificada', 'creado_en')
    search_fields = ('reporte_origen__codigo', 'reporte_relacionado__codigo', 'motivos')
    readonly_fields = ('creado_en',)
