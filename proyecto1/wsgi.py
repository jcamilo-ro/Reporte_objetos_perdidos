"""
WSGI config for proyecto1 project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

# Este archivo prepara el proyecto para servidores WSGI.
# Es el punto de entrada clasico cuando Django se publica en produccion.

import os

from django.core.wsgi import get_wsgi_application

# Indica cual configuracion de Django debe cargarse.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proyecto1.settings')

# application es la variable que el servidor WSGI utiliza para levantar Django.
application = get_wsgi_application()
