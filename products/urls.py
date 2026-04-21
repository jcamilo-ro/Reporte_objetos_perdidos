from rest_framework.routers import DefaultRouter
from .views import ReporteObjetoViewSet

router = DefaultRouter()
router.register(r'reportes', ReporteObjetoViewSet, basename='reporte')

urlpatterns = router.urls
