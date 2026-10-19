# PedigrAPP

**Versión 1.0.0** · Editor web de árboles genealógicos para genética clínica.

PedigrAPP representa pedigrees utilizando las recomendaciones de nomenclatura de Bennett/NSGC (1995, 2008, 2022 y corrección de 2025). Permite registrar relaciones familiares complejas, adopciones, gemelaridad, reproducción asistida, información clínica y condiciones genéticas, generar exportaciones y detectar posibles incoherencias mediante un QC orientativo.

## Instalación

Necesita un servidor web con **PHP** para guardar y recuperar familias mediante `api.php`. La interfaz es HTML/CSS/JavaScript sin proceso de compilación y no requiere MySQL. Para una prueba local, desde la carpeta del proyecto:

```bash
php -S 127.0.0.1:8080
```

Abra `http://127.0.0.1:8080/`. La aplicación permite editar y exportar en el navegador. La carpeta `data/` debe ser escribible por el proceso PHP si desea usar el guardado de familias.

Las imágenes opcionales `images/PedigrAPP_logo.png` y `images/PedigrAPP_icono_small.png` **no se distribuyen**: si no hay logotipo propio, la cabecera utiliza automáticamente el nombre en texto. La exportación PDF usa una cabecera textual sin logos.

## Principales funcionalidades

- Editor de pedigrees con familias multigeneracionales, uniones múltiples, medios hermanos, consanguinidad, adopción, pérdidas gestacionales y gestaciones múltiples.
- Representación de donación de gametos, gestantes, surrogates y progenitores intencionales, distinguiendo los tipos de relación documentados.
- Fichas de individuos, condiciones clínicas/genéticas, comentarios y leyenda dinámica.
- Distribución automática del árbol, ajustes horizontales con ratón, reordenación gráfica dentro de la misma generación y Deshacer/Rehacer.
- Control de calidad orientativo en directo, separado de la revisión profesional.
- Guardado por familias mediante API PHP; importación/exportación de JSON y PED; exportación SVG, PNG y PDF desde el navegador.
- Ayuda integrada con las convenciones y la bibliografía de referencia.

## Exportación PDF

Use **Exportar PDF** en la aplicación y, en el diálogo de impresión, **Guardar como PDF**. Conviene desactivar la opción del navegador «Encabezados y pies de página» para evitar los encabezados añadidos por el propio navegador. El PDF de PedigrAPP contiene el árbol, la leyenda, los campos del caso y los apartados clínicos pertinentes, sin membretes institucionales.

## Privacidad y seguridad

**No publique historias familiares reales ni datos identificables en un repositorio.** El directorio `data/` se distribuye vacío y está excluido del control de versiones mediante `.gitignore`. Se incluye un archivo `data/.htaccess` para impedir su descarga directa en servidores Apache que permitan su aplicación, pero **no sustituye la protección del servidor**.

`api.php` **no incluye autenticación propia ni permisos por usuario**. Antes de utilizarlo en un servidor accesible por Internet, configure autenticación, control de acceso y protección efectiva de `data/` en el servidor web, y revise la normativa aplicable a los datos tratados. No considere segura una instalación pública de este ZIP por sí sola.

## Nomenclatura

- Bennett RL et al. *Recommendations for Standardized Human Pedigree Nomenclature*. Am J Hum Genet. 1995;56:745–752.
- Bennett RL et al. *Standardized Human Pedigree Nomenclature*. J Genet Couns. 2008;17:424–433.
- Bennett RL et al. *Practice resource-focused revision*. J Genet Couns. 2022;31:1238–1248.
- Steinhaus French K et al. *Correction to: Practice resource-focused revision*. J Genet Couns. 2025;34:e2020.

Estas publicaciones son las referencias de nomenclatura; PedigrAPP no está avalada ni certificada por sus autores ni por la NSGC. Algunas soluciones de layout o anotación se identifican en la ayuda como convenciones propias del programa.

## Alcance de la versión pública

PedigrAPP 1.0.0 deriva de la línea 0.8.75. Esta versión únicamente retira elementos institucionales y actualiza la identidad visual y documentación para distribución pública. No modifica el esquema de familias JSON (4.16), las funciones de edición, el motor gráfico ni las reglas del QC.

Consulte `help.html` para instrucciones de uso, símbolos y convenciones.
