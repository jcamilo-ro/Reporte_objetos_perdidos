from django.apps import AppConfig


# Este archivo define la configuracion general de la app products.
class ProductsConfig(AppConfig):
    # Tipo de llave primaria que usaran los modelos nuevos de esta app.
    default_auto_field = 'django.db.models.BigAutoField'
    # Nombre tecnico de la app dentro del proyecto.
    name = 'products'
    # Nombre legible que aparece en el panel de administracion.
    verbose_name = 'Reportes de objetos'
