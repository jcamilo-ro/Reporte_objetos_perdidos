from rest_framework import serializers
from .models import ReporteObjeto


class ReporteObjetoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='get_categoria_display', read_only=True)
    estado_nombre = serializers.CharField(source='get_estado_display', read_only=True)
    lugar_nombre = serializers.CharField(source='get_lugar_display', read_only=True)

    class Meta:
        model = ReporteObjeto
        fields = [
            'id',
            'nombre_objeto',
            'descripcion',
            'categoria',
            'categoria_nombre',
            'lugar',
            'lugar_nombre',
            'estado',
            'estado_nombre',
            'fecha_reporte',
            'imagen',
        ]
        read_only_fields = ['id', 'fecha_reporte']
