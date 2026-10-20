# Privacidad y protección de datos

PedigrAPP es una aplicación web de representación de genealogías clínicas. Según su utilización, puede procesar información **especialmente sensible**, incluidos datos de salud y genéticos de varias personas de una familia. Esta documentación es informativa y no equivale a una evaluación de impacto ni certifica por sí misma el cumplimiento normativo de un despliegue.

## Datos y almacenamiento

- En la edición con guardado en servidor, `api.php` escribe y lee archivos JSON dentro del directorio local `data/` del servidor de la instalación.
- La aplicación permite importar/exportar JSON y PED y generar SVG, PNG y PDF; esas copias deben protegerse igual que los registros originales.
- El código fuente publicado no debe incluir datos reales de pacientes. Los archivos de prueba incluidos en `examples/` se destinan al desarrollo y validación.
- No existe una cuenta de usuario ni control de acceso propio de PedigrAPP en la versión v1.0.1. La seguridad depende de la configuración de la instalación.

## Responsabilidad de cada instalación

Antes de utilizar datos reales, la organización que instale PedigrAPP debe determinar las bases legales, medidas técnicas y organizativas, funciones y responsabilidades pertinentes, incluido, cuando proceda, el Reglamento (UE) 2016/679 (RGPD) y la normativa española aplicable.

Se recomienda, como mínimo, autenticar y autorizar el acceso; limitar permisos del directorio `data/`; impedir su exposición por HTTP; usar HTTPS cuando corresponda; realizar copias de seguridad protegidas; definir un periodo de conservación; y revisar los controles de acceso y el registro de operaciones según las necesidades clínicas.

El archivo `data/.htaccess` solo protege frente a accesos HTTP directos cuando el servidor Apache aplica realmente esas reglas. **No sustituye autenticación ni control de autorización.** En otros servidores (por ejemplo, Nginx o servidores de desarrollo) habrá que aportar una protección equivalente.

## Compartición y publicación

Un pedigree puede permitir identificar indirectamente a personas o familias incluso si se eliminan los nombres. Antes de compartir capturas, ejemplos o archivos exportados, verifica que existe base legítima y que no se expone información sensible o identificable.

La publicación abierta del **código fuente** bajo EUPL-1.2 no implica autorización para divulgar datos personales o historias familiares almacenadas por quienes utilicen el programa.

Para comunicar vulnerabilidades, consulta [`SECURITY.md`](SECURITY.md).