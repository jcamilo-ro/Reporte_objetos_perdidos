from rest_framework import viewsets
from .models import ReporteObjeto
from .serializers import ReporteObjetoSerializer


# Este archivo contiene la logica de la API.
# El ModelViewSet crea automaticamente las operaciones CRUD del modelo.
class ReporteObjetoViewSet(viewsets.ModelViewSet):
    # queryset define el conjunto base de registros sobre el que trabajara la vista.
    queryset = ReporteObjeto.objects.all()
    # serializer_class indica que serializer usara la API para convertir y validar datos.
    serializer_class = ReporteObjetoSerializer

    # get_queryset permite personalizar la consulta y aplicar filtros por URL.
    def get_queryset(self):
        queryset = super().get_queryset()

        # Se leen los parametros enviados en la URL.
        estado = self.request.query_params.get('estado')
        categoria = self.request.query_params.get('categoria')
        lugar = self.request.query_params.get('lugar')
        busqueda = self.request.query_params.get('q')

        # Cada bloque aplica un filtro solo si el usuario lo envio.
        if estado:
            queryset = queryset.filter(estado=estado)
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if lugar:
            queryset = queryset.filter(lugar=lugar)
        if busqueda:
            # icontains permite buscar por coincidencia parcial sin importar mayusculas.
            queryset = queryset.filter(nombre_objeto__icontains=busqueda)

        return queryset
