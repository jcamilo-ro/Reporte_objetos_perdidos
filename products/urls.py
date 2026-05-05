from rest_framework.routers import DefaultRouter
from .views import ReporteObjetoViewSet

# Este archivo define las rutas de la API para la app products.
# El router crea automaticamente endpoints REST a partir del ViewSet.
router = DefaultRouter()
router.register(r'reportes', ReporteObjetoViewSet, basename='reporte')

# urlpatterns expone las rutas generadas por el router.
urlpatterns = router.urls
