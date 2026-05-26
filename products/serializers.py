from rest_framework import serializers
from .models import CambioEstadoPendiente, HistorialCambio, ReporteObjeto


# Este serializer expone el historial de cambios en formato JSON.
# Se conecta con ReporteObjetoSerializer para mostrar trazabilidad dentro de
# cada reporte cuando la API se consuma desde Angular o desde herramientas REST.
class HistorialCambioSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialCambio
        fields = [
            'id',
            'tipo_cambio',
            'rol',
            'campo',
            'valor_anterior',
            'valor_nuevo',
            'aprobacion',
            'creado_en',
        ]
        read_only_fields = fields


# Este serializer representa solicitudes de cambio de estado pendientes.
# Permite que el administrador vea estado anterior, estado solicitado y estado
# de aprobación sin mezclar esos datos con los campos principales del reporte.
class CambioEstadoPendienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CambioEstadoPendiente
        fields = [
            'id',
            'estado_anterior',
            'estado_solicitado',
            'solicitado_por',
            'aprobacion',
            'creado_en',
            'resuelto_en',
        ]
        read_only_fields = fields


# Este serializer convierte ReporteObjeto a JSON y valida los datos que llegan
# desde la API. Incluye campos legibles, historial y cambios pendientes para que
# el frontend pueda construir vistas públicas y administrativas.
class ReporteObjetoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='get_categoria_display', read_only=True)
    estado_nombre = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_reporte_nombre = serializers.CharField(source='get_tipo_reporte_display', read_only=True)
    historial = HistorialCambioSerializer(many=True, read_only=True)
    cambios_pendientes = CambioEstadoPendienteSerializer(many=True, read_only=True)

    class Meta:
        model = ReporteObjeto
        fields = [
            'id',
            'codigo',
            'nombre_objeto',
            'descripcion',
            'categoria',
            'categoria_nombre',
            'lugar',
            'fecha_evento',
            'tipo_reporte',
            'tipo_reporte_nombre',
            'estado',
            'estado_nombre',
            'observaciones',
            'imagen',
            'reportante_nombre',
            'reportante_correo',
            'reportante_celular',
            'encontrado_nombre',
            'encontrado_tipo_persona',
            'encontrado_contacto',
            'perdido_nombre',
            'perdido_tipo_persona',
            'perdido_contacto',
            'accion_objeto',
            'lugar_entrega',
            'validado_por_admin',
            'fecha_validacion_admin',
            'eliminado_vista_publica',
            'fecha_entrega',
            'validado_por_admin',
            'fecha_validacion_admin',
            'fecha_eliminacion_publica',
            'creado_en',
            'actualizado_en',
            'historial',
            'cambios_pendientes',
        ]
        read_only_fields = [
            'id',
            'codigo',
            'fecha_entrega',
            'fecha_eliminacion_publica',
            'creado_en',
            'actualizado_en',
            'historial',
            'cambios_pendientes',
        ]
        extra_kwargs = {
            'reportante_nombre': {'required': True, 'allow_blank': False},
            'reportante_correo': {'required': True, 'allow_blank': False},
            'reportante_celular': {'required': False, 'allow_blank': True},
            'perdido_nombre': {'required': False, 'allow_blank': True},
            'perdido_contacto': {'required': False, 'allow_blank': True},
            'encontrado_nombre': {'required': False, 'allow_blank': True},
            'encontrado_contacto': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        instance = self.instance
        tipo_reporte = attrs.get('tipo_reporte', getattr(instance, 'tipo_reporte', 'perdido'))
        reportante_nombre = attrs.get('reportante_nombre', getattr(instance, 'reportante_nombre', ''))
        reportante_correo = attrs.get('reportante_correo', getattr(instance, 'reportante_correo', ''))

        if not str(reportante_nombre).strip():
            raise serializers.ValidationError({
                'reportante_nombre': 'El nombre de la persona que reporta es obligatorio.'
            })

        if not str(reportante_correo).strip():
            raise serializers.ValidationError({
                'reportante_correo': 'El correo es obligatorio porque es el contacto principal.'
            })

        if tipo_reporte == 'perdido':
            perdido_nombre = attrs.get('perdido_nombre', getattr(instance, 'perdido_nombre', ''))
            perdido_contacto = attrs.get('perdido_contacto', getattr(instance, 'perdido_contacto', ''))
            if not str(perdido_nombre).strip():
                raise serializers.ValidationError({'perdido_nombre': 'El nombre de quien perdió el objeto es obligatorio.'})
            if not str(perdido_contacto).strip():
                raise serializers.ValidationError({'perdido_contacto': 'El correo de contacto es obligatorio.'})

        if tipo_reporte == 'encontrado':
            encontrado_nombre = attrs.get('encontrado_nombre', getattr(instance, 'encontrado_nombre', ''))
            encontrado_contacto = attrs.get('encontrado_contacto', getattr(instance, 'encontrado_contacto', ''))
            if not str(encontrado_nombre).strip():
                raise serializers.ValidationError({'encontrado_nombre': 'El nombre de quien encontró el objeto es obligatorio.'})
            if not str(encontrado_contacto).strip():
                raise serializers.ValidationError({'encontrado_contacto': 'El correo de contacto es obligatorio.'})

            if not str(attrs.get('perdido_nombre', getattr(instance, 'perdido_nombre', ''))).strip():
                attrs['perdido_nombre'] = 'Sin identificar'
            if not str(attrs.get('perdido_contacto', getattr(instance, 'perdido_contacto', ''))).strip():
                attrs['perdido_contacto'] = 'Pendiente por confirmar'

        return attrs
