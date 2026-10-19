# PedigrAPP online 1.0.0

Edición estática derivada de PedigrAPP 1.0.0.

## Cambios respecto a `main`

- Se elimina `api.php` y cualquier persistencia en servidor.
- El guardado, carga y borrado de casos se realiza mediante `localStorage`.
- No se incluye el directorio `data/`.
- No se incluyen componentes PHP ni dependencias de servidor.
- La exportación PDF se realiza mediante el navegador.
- Se conserva únicamente la identidad gráfica propia de PedigrAPP.
- La aplicación puede desplegarse como contenido estático, por ejemplo mediante GitHub Pages.

## Privacidad

Los casos guardados permanecen en el navegador del usuario. Los ficheros importados y exportados se procesan localmente. La aplicación no proporciona un servicio remoto de almacenamiento de pedigrees.
