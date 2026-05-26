from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CoincidenciaReporte, HistorialCambio, ReporteObjeto


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class ReporteObjetoAPITests(APITestCase):
    def datos_base(self, **extra):
        datos = {
            'nombre_objeto': 'Carnet estudiantil',
            'descripcion': 'Carnet encontrado cerca de la biblioteca.',
            'categoria': 'documentos',
            'lugar': 'Biblioteca Alberto Quijano Guerrero',
            'estado': 'perdido',
            'fecha_evento': '2026-05-19',
            'tipo_reporte': 'perdido',
            'reportante_nombre': 'Carlos Benavides',
            'reportante_correo': 'carlos@example.com',
            'reportante_celular': '',
            'perdido_nombre': 'Carlos Benavides',
            'perdido_contacto': 'carlos@example.com',
        }
        datos.update(extra)
        return datos

    def crear_reporte(self, **extra):
        return ReporteObjeto.objects.create(**self.datos_base(**extra))

    def test_crea_reporte_de_objeto_con_codigo_y_correo(self):
        respuesta = self.client.post(reverse('reporte-list'), self.datos_base(), format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        reporte = ReporteObjeto.objects.get()
        self.assertEqual(reporte.nombre_objeto, 'Carnet estudiantil')
        self.assertRegex(reporte.codigo, r'^REP-2026-\d{6}$')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(reporte.codigo, mail.outbox[0].body)

    def test_no_se_puede_crear_reporte_sin_nombre(self):
        datos = self.datos_base(reportante_nombre='')

        respuesta = self.client.post(reverse('reporte-list'), datos, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reportante_nombre', respuesta.data)

    def test_no_se_puede_crear_reporte_sin_correo(self):
        datos = self.datos_base(reportante_correo='')

        respuesta = self.client.post(reverse('reporte-list'), datos, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reportante_correo', respuesta.data)

    def test_celular_es_opcional(self):
        respuesta = self.client.post(reverse('reporte-list'), self.datos_base(reportante_celular=''), format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)

    def test_codigo_no_cambia_al_editar(self):
        reporte = self.crear_reporte()
        codigo = reporte.codigo

        respuesta = self.client.patch(
            reverse('reporte-detail', args=[reporte.id]),
            {'observaciones': 'Actualizado por administracion.'},
            format='json',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        reporte.refresh_from_db()
        self.assertEqual(reporte.codigo, codigo)

    def test_editar_intenta_enviar_correo_y_guarda_historial(self):
        reporte = self.crear_reporte()
        mail.outbox = []

        respuesta = self.client.patch(
            reverse('reporte-detail', args=[reporte.id]),
            {'lugar': 'Bloque 6'},
            format='json',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue(HistorialCambio.objects.filter(reporte=reporte, campo='lugar').exists())

    def test_detecta_coincidencia_entre_perdido_y_encontrado(self):
        self.crear_reporte(
            tipo_reporte='encontrado',
            estado='encontrado',
            nombre_objeto='Carnet estudiantil',
            descripcion='Carnet con funda transparente encontrado en biblioteca',
            encontrado_nombre='Ana Jurado',
            encontrado_contacto='ana@example.com',
            reportante_nombre='Ana Jurado',
            reportante_correo='ana@example.com',
            perdido_nombre='Sin identificar',
            perdido_contacto='Pendiente por confirmar',
        )

        respuesta = self.client.post(reverse('reporte-list'), self.datos_base(), format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CoincidenciaReporte.objects.count(), 1)
        self.assertGreaterEqual(len(mail.outbox), 2)

    def test_reporte_encontrado_no_exige_quien_perdio(self):
        datos = self.datos_base(
            tipo_reporte='encontrado',
            estado='encontrado',
            encontrado_nombre='Ana Jurado',
            encontrado_contacto='ana@example.com',
            reportante_nombre='Ana Jurado',
            reportante_correo='ana@example.com',
            perdido_nombre='',
            perdido_contacto='',
        )

        respuesta = self.client.post(reverse('reporte-list'), datos, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        reporte = ReporteObjeto.objects.get()
        self.assertEqual(reporte.perdido_nombre, 'Sin identificar')

    def test_reporte_perdido_no_exige_quien_encontro(self):
        datos = self.datos_base(encontrado_nombre='', encontrado_contacto='')

        respuesta = self.client.post(reverse('reporte-list'), datos, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)

    def test_edicion_conserva_datos_y_permite_agregar_fotografia(self):
        reporte = self.crear_reporte()
        imagen = SimpleUploadedFile(
            'foto.gif',
            b'GIF87a\x01\x00\x01\x00\x80\x01\x00\x00\x00\x00ccc,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;',
            content_type='image/gif',
        )

        respuesta = self.client.patch(
            reverse('reporte-detail', args=[reporte.id]),
            {'imagen': imagen},
            format='multipart',
        )

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        reporte.refresh_from_db()
        self.assertEqual(reporte.nombre_objeto, 'Carnet estudiantil')
        self.assertTrue(reporte.imagen.name)

    def test_administrador_valida_reporte_y_registra_historial(self):
        reporte = self.crear_reporte(tipo_reporte='encontrado', estado='encontrado', encontrado_nombre='Ana', encontrado_contacto='ana@example.com')

        respuesta = self.client.post(reverse('reporte-validar-admin', args=[reporte.id]), {}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        reporte.refresh_from_db()
        self.assertTrue(reporte.validado_por_admin)
        self.assertTrue(HistorialCambio.objects.filter(reporte=reporte, campo='validado_por_admin').exists())

    def test_administracion_puede_ocultar_reporte_con_confirmacion(self):
        reporte = self.crear_reporte(tipo_reporte='encontrado', estado='encontrado', encontrado_nombre='Ana', encontrado_contacto='ana@example.com')

        respuesta = self.client.post(reverse('reporte-ocultar-publico', args=[reporte.id]), {}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        reporte.refresh_from_db()
        self.assertTrue(reporte.eliminado_vista_publica)

    def test_eliminacion_registra_historial(self):
        reporte = self.crear_reporte(
            tipo_reporte='encontrado',
            estado='encontrado',
            encontrado_nombre='Ana',
            encontrado_contacto='ana@example.com',
            validado_por_admin=True,
        )

        respuesta = self.client.post(reverse('reporte-ocultar-publico', args=[reporte.id]), {}, format='json')

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        reporte.refresh_from_db()
        self.assertTrue(reporte.eliminado_vista_publica)
        self.assertTrue(HistorialCambio.objects.filter(reporte=reporte, campo='eliminado_vista_publica').exists())
