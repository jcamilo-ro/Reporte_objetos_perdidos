from rest_framework import viewsets
from .models import ReporteObjeto
from .serializers import ReporteObjetoSerializer


class ReporteObjetoViewSet(viewsets.ModelViewSet):
    queryset = ReporteObjeto.objects.all()
    serializer_class = ReporteObjetoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get('estado')
        categoria = self.request.query_params.get('categoria')
        lugar = self.request.query_params.get('lugar')
        busqueda = self.request.query_params.get('q')

        if estado:
            queryset = queryset.filter(estado=estado)
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if lugar:
            queryset = queryset.filter(lugar=lugar)
        if busqueda:
            queryset = queryset.filter(nombre_objeto__icontains=busqueda)

        return queryset
