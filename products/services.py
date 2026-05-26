import logging
import re
import unicodedata

from django.conf import settings
from django.core.mail import send_mail

from .models import CoincidenciaReporte, HistorialCambio, ReporteObjeto

logger = logging.getLogger(__name__)


def enviar_correo_seguro(destinatario, asunto, mensaje):
    if not destinatario:
        return False

    try:
        send_mail(
            subject=asunto,
            message=mensaje,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
            recipient_list=[destinatario],
            fail_silently=False,
        )
        return True
    except Exception:
        logger.exception('No se pudo enviar correo a %s', destinatario)
        return False


def enviar_correo_creacion(reporte):
    mensaje = (
        f'Hola {reporte.reportante_nombre},\n\n'
        f'Tu reporte fue registrado correctamente.\n\n'
        f'Codigo: {reporte.codigo}\n'
        f'Objeto: {reporte.nombre_objeto}\n'
        f'Tipo: {reporte.get_tipo_reporte_display()}\n'
        f'Categoria: {reporte.get_categoria_display()}\n'
        f'Lugar: {reporte.lugar}\n\n'
        'Conserva este codigo para consultar o dar seguimiento al caso.'
    )
    return enviar_correo_seguro(reporte.reportante_correo, f'Reporte registrado {reporte.codigo}', mensaje)


def enviar_correo_actualizacion(reporte, cambios):
    detalle = '\n'.join(f'- {campo}: {anterior} -> {nuevo}' for campo, anterior, nuevo in cambios)
    mensaje = (
        f'Hola {reporte.reportante_nombre},\n\n'
        f'Tu reporte {reporte.codigo} fue actualizado por administracion.\n\n'
        f'Objeto: {reporte.nombre_objeto}\n'
        f'Cambios:\n{detalle or "- Actualizacion general"}\n\n'
        'Si tienes dudas, comunicate con el administrador del sistema.'
    )
    return enviar_correo_seguro(reporte.reportante_correo, f'Reporte actualizado {reporte.codigo}', mensaje)


def enviar_correo_coincidencia(reporte, relacionado, motivos):
    mensaje = (
        f'Hola {reporte.reportante_nombre},\n\n'
        f'Encontramos una posible coincidencia para tu reporte {reporte.codigo}.\n\n'
        f'Tu objeto: {reporte.nombre_objeto}\n'
        f'Reporte relacionado: {relacionado.codigo} - {relacionado.nombre_objeto}\n'
        f'Motivos: {motivos}\n\n'
        'Esta es solo una posible coincidencia. El caso no se marca como resuelto automaticamente.'
    )
    return enviar_correo_seguro(reporte.reportante_correo, f'Posible coincidencia {reporte.codigo}', mensaje)


def registrar_historial(reporte, tipo_cambio, rol, campo, valor_anterior='', valor_nuevo='', descripcion='', usuario_admin=''):
    return HistorialCambio.objects.create(
        reporte=reporte,
        tipo_cambio=tipo_cambio,
        rol=rol,
        usuario_admin=usuario_admin,
        campo=campo,
        valor_anterior=str(valor_anterior or ''),
        valor_nuevo=str(valor_nuevo or ''),
        descripcion=descripcion,
    )


def detectar_y_notificar_coincidencias(reporte):
    tipo_opuesto = 'encontrado' if reporte.tipo_reporte == 'perdido' else 'perdido'
    candidatos = ReporteObjeto.objects.filter(tipo_reporte=tipo_opuesto).exclude(pk=reporte.pk)
    coincidencias = []

    for candidato in candidatos:
        puntaje, motivos = puntuar_coincidencia(reporte, candidato)
        if puntaje < 45:
            continue

        coincidencia, creada = CoincidenciaReporte.objects.get_or_create(
            reporte_origen=reporte,
            reporte_relacionado=candidato,
            defaults={'puntaje': puntaje, 'motivos': ', '.join(motivos)},
        )
        if not creada and coincidencia.notificada:
            continue

        motivos_texto = coincidencia.motivos or ', '.join(motivos)
        enviada_origen = enviar_correo_coincidencia(reporte, candidato, motivos_texto)
        enviada_relacionado = enviar_correo_coincidencia(candidato, reporte, motivos_texto)
        coincidencia.puntaje = puntaje
        coincidencia.motivos = motivos_texto
        coincidencia.notificada = enviada_origen or enviada_relacionado
        coincidencia.save(update_fields=['puntaje', 'motivos', 'notificada'])
        coincidencias.append(coincidencia)

    return coincidencias


def puntuar_coincidencia(reporte, candidato):
    puntaje = 0
    motivos = []

    if reporte.categoria == candidato.categoria:
        puntaje += 35
        motivos.append('misma categoria')

    if textos_relacionados(reporte.nombre_objeto, candidato.nombre_objeto):
        puntaje += 30
        motivos.append('nombre parecido')

    if textos_relacionados(reporte.descripcion, candidato.descripcion):
        puntaje += 20
        motivos.append('descripcion similar')

    if textos_relacionados(reporte.lugar, candidato.lugar):
        puntaje += 15
        motivos.append('lugar aproximado')

    return puntaje, motivos


def textos_relacionados(texto_a, texto_b):
    tokens_a = set(tokenizar(texto_a))
    tokens_b = set(tokenizar(texto_b))
    return bool(tokens_a & tokens_b)


def tokenizar(texto):
    normalizado = unicodedata.normalize('NFD', texto or '')
    sin_tildes = ''.join(caracter for caracter in normalizado if unicodedata.category(caracter) != 'Mn')
    return [token for token in re.split(r'\W+', sin_tildes.lower()) if len(token) >= 4]
