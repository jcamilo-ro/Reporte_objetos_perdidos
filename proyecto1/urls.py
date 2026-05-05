"""
URL configuration for proyecto1 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# Este archivo define las rutas principales del proyecto.
# Desde aqui se conecta el panel admin y la API de la app products.

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# urlpatterns es la tabla principal de rutas del proyecto.
urlpatterns = [
    # Ruta del panel administrativo de Django.
    path('admin/', admin.site.urls),
    # Ruta base de la API REST.
    path('api/', include('products.urls')),
]

# En modo DEBUG se habilita el acceso a archivos de media durante desarrollo.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
