# Seguridad de PedigrAPP

## Alcance y estado

PedigrAPP v1.0.1 no incorpora autenticación de usuarios, roles ni autorización granular en `api.php`. **No debe instalarse directamente en Internet con datos clínicos reales sin una capa de seguridad externa y controles adecuados.**

El archivo `data/.htaccess` está pensado para instalaciones Apache configuradas para respetarlo, y no protege por sí mismo instalaciones en otros servidores ni rutas alternativas.

## Recomendaciones de despliegue

- Proteger el acceso a la aplicación y a `api.php` mediante autenticación y autorización adecuadas.
- Mantener `data/` fuera del directorio público siempre que la arquitectura lo permita o bloquearlo eficazmente a nivel de servidor.
- Configurar cifrado en tránsito (HTTPS), permisos mínimos, copias de seguridad seguras y actualizaciones de servidor/PHP.
- Probar expresamente que las operaciones de lectura, guardado y borrado no están accesibles sin los permisos correspondientes.
- No alojar datos clínicos reales en GitHub, incidencias, trazas públicas ni ejemplos de demostración.
- Evitar desplegar `php -S` como servidor público de producción.

## Comunicación responsable de vulnerabilidades

Si GitHub permite **Private vulnerability reporting / Security Advisories** para este repositorio, utiliza ese mecanismo para comunicar vulnerabilidades de forma privada. Si no estuviera disponible, contacta con los mantenedores por un canal privado acordado antes de divulgar detalles explotables.

No se designa en este documento una dirección de correo de seguridad que no haya sido confirmada. Los procedimientos de respuesta y los tiempos de resolución se definirán cuando el proyecto abra públicamente sus canales de comunicación.

## Aviso legal

La distribución se realiza conforme a **EUPL-1.2**, incluido su régimen de ausencia de garantías. Consulta [`LICENSE`](LICENSE) y [`PRIVACY.md`](PRIVACY.md).