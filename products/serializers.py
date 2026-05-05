from rest_framework import serializers
from .models import ReporteObjeto


# Este archivo convierte los modelos de Django en datos JSON
# y tambien valida lo que llega desde la API antes de guardarlo.
class ReporteObjetoSerializer(serializers.ModelSerializer):
    # Estos campos adicionales muestran el nombre legible de las opciones,
    # no solo el valor tecnico guardado en base de datos.
    categoria_nombre = serializers.CharField(source='get_categoria_display', read_only=True)
    estado_nombre = serializers.CharField(source='get_estado_display', read_only=True)
    lugar_nombre = serializers.CharField(source='get_lugar_display', read_only=True)

    # Meta indica sobre que modelo trabaja el serializer y que campos expone.
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
        # Estos campos se devuelven en la API, pero no deben enviarse al crear el registro.
        read_only_fields = ['id', 'fecha_reporte']
