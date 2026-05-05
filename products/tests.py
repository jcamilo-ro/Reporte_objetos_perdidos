from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ReporteObjeto


# Este archivo contiene pruebas automaticas de la API.
# Sirve para verificar que el proyecto siga funcionando despues de cambios.
class ReporteObjetoAPITests(APITestCase):
    # Esta prueba verifica que la API pueda crear un reporte correctamente.
    def test_crea_reporte_de_objeto(self):
        datos = {
            'nombre_objeto': 'Carnet estudiantil',
            'descripcion': 'Carnet encontrado cerca de la biblioteca.',
            'categoria': 'documentos',
            'lugar': 'biblioteca',
            'estado': 'encontrado',
        }

        respuesta = self.client.post(reverse('reporte-list'), datos, format='json')

        # Se valida que la API responda con codigo 201 y guarde un registro.
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ReporteObjeto.objects.count(), 1)
        self.assertEqual(ReporteObjeto.objects.first().nombre_objeto, 'Carnet estudiantil')

    # Esta prueba verifica el filtro por estado en la lista de reportes.
    def test_filtra_reportes_por_estado(self):
        ReporteObjeto.objects.create(
            nombre_objeto='Llaves',
            descripcion='Llaves perdidas en el bloque 1.',
            categoria='llaves',
            lugar='bloque',
            estado='perdido',
        )
        ReporteObjeto.objects.create(
            nombre_objeto='Cuaderno',
            descripcion='Cuaderno entregado en cafeteria.',
            categoria='cuaderno',
            lugar='cafeteria',
            estado='entregado',
        )

        respuesta = self.client.get(reverse('reporte-list'), {'estado': 'perdido'})

        # Se comprueba que solo llegue el reporte con el estado solicitado.
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 1)
        self.assertEqual(respuesta.data[0]['estado'], 'perdido')
