from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

# ViewSet principal de la API. Centraliza filtros, buscador simple, edición,
# validación administrativa, eliminación protegida e historial de cambios.
from .models import CambioEstadoPendiente, HistorialCambio, ReporteObjeto
from .serializers import ReporteObjetoSerializer
from .services import (
    detectar_y_notificar_coincidencias,
    enviar_correo_actualizacion,
    enviar_correo_creacion,
    registrar_historial,
)


# Este ViewSet expone el CRUD REST del modelo ReporteObjeto.
# Además agrega acciones específicas para administración: solicitar cambio de
# estado, aprobar/rechazar cambios y ocultar/restaurar reportes públicos.
class ReporteObjetoViewSet(viewsets.ModelViewSet):
    serializer_class = ReporteObjetoSerializer

    def get_queryset(self):
        queryset = ReporteObjeto.objects.prefetch_related('historial', 'cambios_pendientes').all()

        # La vista pública oculta reportes eliminados y entregados con más de una
        # semana. El parámetro admin=true permite ver todo desde administración.
        es_admin = self.request.query_params.get('admin') == 'true'
        if not es_admin:
            limite_entregados = timezone.now() - timedelta(days=7)
            queryset = queryset.filter(eliminado_vista_publica=False).exclude(
                estado='entregado',
                fecha_entrega__lt=limite_entregados,
            )

        estado = self.request.query_params.get('estado')
        categoria = self.request.query_params.get('categoria')
        tipo = self.request.query_params.get('tipo')
        busqueda = self.request.query_params.get('q')

        if estado:
            queryset = queryset.filter(estado=estado)
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if tipo:
            queryset = queryset.filter(tipo_reporte=tipo)
        if busqueda:
            queryset = self._filtrar_por_busqueda_natural(queryset, busqueda)

        return queryset

    def perform_create(self, serializer):
        reporte = serializer.save()
        registrar_historial(
            reporte=reporte,
            tipo_cambio='Creación de reporte',
            rol='usuario',
            campo='sistema',
            valor_anterior='Sin registro',
            valor_nuevo=reporte.codigo,
            descripcion='Reporte creado desde el formulario público.',
        )
        if enviar_correo_creacion(reporte):
            registrar_historial(
                reporte=reporte,
                tipo_cambio='Notificación por correo',
                rol='sistema',
                campo='reportante_correo',
                valor_nuevo=reporte.reportante_correo,
                descripcion='Se envió la notificación inicial del reporte.',
            )
        detectar_y_notificar_coincidencias(reporte)

    def perform_update(self, serializer):
        anterior = ReporteObjeto.objects.get(pk=serializer.instance.pk)
        valores_anteriores = self._valores_auditoria(anterior)
        estado_anterior = anterior.estado
        reporte = serializer.save()

        if estado_anterior != reporte.estado and reporte.estado == 'entregado' and not reporte.fecha_entrega:
            reporte.fecha_entrega = timezone.now()
            reporte.save(update_fields=['fecha_entrega'])

        cambios = self._comparar_cambios(valores_anteriores, self._valores_auditoria(reporte))
        usuario_admin = self.request.user.get_username() if self.request.user.is_authenticated else ''

        for campo, valor_anterior, valor_nuevo in cambios:
            registrar_historial(
                reporte=reporte,
                tipo_cambio='Edición de reporte',
                rol='administrador',
                usuario_admin=usuario_admin,
                campo=campo,
                valor_anterior=valor_anterior,
                valor_nuevo=valor_nuevo,
                descripcion=f'Campo {campo} actualizado desde administración.',
            )

        if cambios:
            enviar_correo_actualizacion(reporte, cambios)
            detectar_y_notificar_coincidencias(reporte)

    def _valores_auditoria(self, reporte):
        campos = [
            'nombre_objeto',
            'descripcion',
            'categoria',
            'lugar',
            'fecha_evento',
            'tipo_reporte',
            'estado',
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
        ]
        return {campo: str(getattr(reporte, campo) or '') for campo in campos}

    def _comparar_cambios(self, anterior, nuevo):
        return [
            (campo, anterior[campo], nuevo[campo])
            for campo in anterior
            if anterior[campo] != nuevo[campo]
        ]

    def _filtrar_por_busqueda_natural(self, queryset, busqueda):
        palabras = [palabra for palabra in busqueda.lower().split() if len(palabra) >= 3]
        if 'perdí' in busqueda.lower() or 'perdi' in busqueda.lower():
            queryset = queryset.filter(tipo_reporte='encontrado')
        if 'encontré' in busqueda.lower() or 'encontre' in busqueda.lower():
            queryset = queryset.filter(tipo_reporte='perdido')

        consulta = Q()
        for palabra in palabras:
            consulta |= (
                Q(nombre_objeto__icontains=palabra)
                | Q(descripcion__icontains=palabra)
                | Q(categoria__icontains=palabra)
                | Q(lugar__icontains=palabra)
                | Q(estado__icontains=palabra)
                | Q(tipo_reporte__icontains=palabra)
                | Q(perdido_nombre__icontains=palabra)
                | Q(encontrado_nombre__icontains=palabra)
            )
        return queryset.filter(consulta) if consulta else queryset

    @action(detail=True, methods=['post'], url_path='solicitar-cambio-estado')
    def solicitar_cambio_estado(self, request, pk=None):
        reporte = self.get_object()
        estado_solicitado = request.data.get('estado')

        if estado_solicitado not in dict(ReporteObjeto.ESTADOS):
            return Response({'detalle': 'Estado no válido.'}, status=status.HTTP_400_BAD_REQUEST)

        cambio = CambioEstadoPendiente.objects.create(
            reporte=reporte,
            estado_anterior=reporte.estado,
            estado_solicitado=estado_solicitado,
            solicitado_por=request.data.get('solicitado_por', 'usuario'),
        )
        HistorialCambio.objects.create(
            reporte=reporte,
            tipo_cambio='Solicitud de cambio de estado',
            rol='usuario',
            campo='estado',
            valor_anterior=reporte.estado,
            valor_nuevo=estado_solicitado,
            aprobacion='pendiente',
        )

        return Response({'detalle': 'Cambio solicitado.', 'cambio_id': cambio.id})

    @action(detail=True, methods=['post'], url_path='aprobar-cambio-estado')
    def aprobar_cambio_estado(self, request, pk=None):
        reporte = self.get_object()
        cambio = reporte.cambios_pendientes.filter(aprobacion='pendiente').first()

        if not cambio:
            return Response({'detalle': 'No hay cambios pendientes.'}, status=status.HTTP_400_BAD_REQUEST)

        reporte.estado = cambio.estado_solicitado
        if reporte.estado == 'entregado':
            reporte.fecha_entrega = timezone.now()
        reporte.save()

        cambio.aprobacion = 'aprobado'
        cambio.resuelto_en = timezone.now()
        cambio.save()

        HistorialCambio.objects.create(
            reporte=reporte,
            tipo_cambio='Aprobación de cambio de estado',
            rol='administrador',
            campo='estado',
            valor_anterior=cambio.estado_anterior,
            valor_nuevo=cambio.estado_solicitado,
            aprobacion='aprobado',
        )

        return Response(self.get_serializer(reporte).data)

    @action(detail=True, methods=['post'], url_path='rechazar-cambio-estado')
    def rechazar_cambio_estado(self, request, pk=None):
        reporte = self.get_object()
        cambio = reporte.cambios_pendientes.filter(aprobacion='pendiente').first()

        if not cambio:
            return Response({'detalle': 'No hay cambios pendientes.'}, status=status.HTTP_400_BAD_REQUEST)

        cambio.aprobacion = 'rechazado'
        cambio.resuelto_en = timezone.now()
        cambio.save()

        HistorialCambio.objects.create(
            reporte=reporte,
            tipo_cambio='Rechazo de cambio de estado',
            rol='administrador',
            campo='estado',
            valor_anterior=cambio.estado_anterior,
            valor_nuevo=cambio.estado_solicitado,
            aprobacion='rechazado',
        )

        return Response(self.get_serializer(reporte).data)

    @action(detail=True, methods=['post'], url_path='ocultar-publico')
    def ocultar_publico(self, request, pk=None):
        reporte = self.get_object()

        reporte.eliminado_vista_publica = True
        reporte.fecha_eliminacion_publica = timezone.now()
        reporte.save(update_fields=['eliminado_vista_publica', 'fecha_eliminacion_publica', 'actualizado_en'])

        HistorialCambio.objects.create(
            reporte=reporte,
            tipo_cambio='Eliminación lógica de vista pública',
            rol=request.data.get('rol', 'usuario'),
            campo='eliminado_vista_publica',
            valor_anterior='false',
            valor_nuevo='true',
        )

        return Response(self.get_serializer(reporte).data)

    @action(detail=True, methods=['post'], url_path='validar-admin')
    def validar_admin(self, request, pk=None):
        reporte = self.get_object()

        if reporte.validado_por_admin:
            return Response(self.get_serializer(reporte).data)

        reporte.validado_por_admin = True
        reporte.fecha_validacion_admin = timezone.now()
        reporte.save(update_fields=['validado_por_admin', 'fecha_validacion_admin', 'actualizado_en'])

        registrar_historial(
            reporte=reporte,
            tipo_cambio='Validación administrativa',
            rol='administrador',
            usuario_admin=request.user.get_username() if request.user.is_authenticated else '',
            campo='validado_por_admin',
            valor_anterior='false',
            valor_nuevo='true',
            descripcion='El administrador confirmó que el reporte fue revisado.',
        )

        return Response(self.get_serializer(reporte).data)

    @action(detail=True, methods=['post'], url_path='restaurar-publico')
    def restaurar_publico(self, request, pk=None):
        reporte = self.get_object()
        reporte.eliminado_vista_publica = False
        reporte.fecha_eliminacion_publica = None
        reporte.save(update_fields=['eliminado_vista_publica', 'fecha_eliminacion_publica', 'actualizado_en'])

        HistorialCambio.objects.create(
            reporte=reporte,
            tipo_cambio='Restauración en vista pública',
            rol='administrador',
            campo='eliminado_vista_publica',
            valor_anterior='true',
            valor_nuevo='false',
        )

        return Response(self.get_serializer(reporte).data)
