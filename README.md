# PedigrAPP

**Versión 1.0.1** · Aplicación web para la creación y edición de árboles genealógicos en genética clínica.

PedigrAPP representa pedigrees utilizando las recomendaciones de nomenclatura de Bennett/NSGC (1995, 2008, 2022 y corrección de 2025). Permite registrar relaciones familiares complejas, adopciones, gemelaridad, reproducción asistida, información clínica y condiciones genéticas, generar exportaciones y detectar posibles incoherencias mediante un QC orientativo.

> **v1.0.1 es exclusivamente una actualización legal, documental y de metadatos. No incorpora cambios funcionales respecto a v1.0.0.** El esquema de familias sigue siendo JSON 4.16.

## Licencia, titularidad y registro

**Licencia:** [European Union Public Licence v1.2 (EUPL-1.2)](LICENSE), aprobada para su uso en PedigrAPP por la entidad titular. El texto íntegro y sin modificaciones de la licencia figura en `LICENSE`. Identificador SPDX: `EUPL-1.2`.

**Titular de todos los derechos de explotación:** **Fundación Investigación Biomédica Hospital 12 de Octubre**. Ámbito territorial mundial, según registro Safe Creative.

**Título registrado:** *PedigrAPP – Aplicación web para la creación y edición de árboles genealógicos en genética clínica*.

- **Registro Safe Creative:** `2610197365707`.
- **Certificado:** `2610197365707-29DQUR`.
- **Inscripción:** 20/10/2026, 08:01 UTC.
- **Archivo depositado:** `pedigrapp-main-online.zip`, que contiene los ZIP de GitHub de `main` y `online` depositados para v1.0.0.
- **Snapshots registrados:** tags históricos `v1.0.0` y `online-v1.0.0`, que se conservan sin modificaciones.

### Autores registrados de v1.0.0

- **José Miguel Lezana Rosales**
- **Carmen Palma Milla**
- **Rubén Pérez de la Fuente**

La relación completa del equipo clínico/científico, incluida **Raquel Castro del Álamo**, se recoge en [`AUTHORS.md`](AUTHORS.md). La participación en el proyecto no confiere automáticamente autoría de futuras versiones ni publicaciones científicas; esta se determinará según las contribuciones realizadas.

Si vas a citar el programa, consulta [`CITATION.cff`](CITATION.cff). No se ha asignado DOI a esta versión.

## Instalación

Necesita un servidor web con **PHP** para guardar y recuperar familias mediante `api.php`. La interfaz es HTML/CSS/JavaScript sin proceso de compilación y no requiere MySQL. Para una **prueba local no pública**, desde la carpeta del proyecto:

```bash
php -S 127.0.0.1:8080
```

Abre `http://127.0.0.1:8080/`. La aplicación permite editar y exportar en el navegador. La carpeta `data/` debe ser escribible por el proceso PHP si deseas usar el guardado de familias.

El repositorio incluye recursos gráficos opcionales de identidad visual (`images/PedigrAPP_logo.png` y `images/PedigrAPP_icono_small.png`). Cuando el logotipo no está disponible, la interfaz utiliza un título textual alternativo. La exportación PDF utiliza una cabecera textual y no emplea membretes institucionales.

## Principales funcionalidades

- Editor de pedigrees con familias multigeneracionales, uniones múltiples, medios hermanos, consanguinidad, adopción, pérdidas gestacionales y gestaciones múltiples.
- Representación de donación de gametos, gestantes, surrogates y progenitores intencionales, distinguiendo los tipos de relación documentados.
- Fichas de individuos, condiciones clínicas/genéticas, comentarios y leyenda dinámica.
- Distribución automática del árbol, ajustes horizontales con ratón, reordenación gráfica dentro de la misma generación y Deshacer/Rehacer.
- Control de calidad orientativo en directo, separado de la revisión profesional.
- Guardado por familias mediante API PHP; importación/exportación de JSON y PED; exportación SVG, PNG y PDF desde el navegador.
- Ayuda integrada con las convenciones y la bibliografía de referencia.

## Exportación PDF

Usa **Exportar PDF** en la aplicación y, en el diálogo de impresión, **Guardar como PDF**. Conviene desactivar «Encabezados y pies de página» del navegador. El PDF de PedigrAPP contiene el árbol, la leyenda, los campos del caso y los apartados clínicos pertinentes, sin membretes institucionales.

## Privacidad y seguridad

**No publiques datos personales, historias familiares ni información genética identificable en el repositorio.** Los archivos reales de `data/` deben permanecer fuera del control de versiones. El `.gitignore` de la versión registrada se conserva sin modificaciones.

`data/.htaccess` intenta impedir la descarga directa por HTTP en Apache cuando esas reglas se aplican. **No sustituye autenticación ni autorización**. `api.php` no incorpora control de acceso propio. Antes de usar datos reales, configura protección del servidor y comprueba los requisitos normativos aplicables.

Consulta [`PRIVACY.md`](PRIVACY.md) y [`SECURITY.md`](SECURITY.md) antes de desplegar el software en un entorno accesible por red.

## Nomenclatura y avisos de terceros

- Bennett RL et al. *Recommendations for Standardized Human Pedigree Nomenclature*. Am J Hum Genet. 1995;56:745–752.
- Bennett RL et al. *Standardized Human Pedigree Nomenclature*. J Genet Couns. 2008;17:424–433.
- Bennett RL et al. *Practice resource-focused revision*. J Genet Couns. 2022;31:1238–1248.
- French KS et al. *Correction to: Practice resource-focused revision*. J Genet Couns. 2025;34:e2020.

Estas publicaciones son referencias científicas de nomenclatura. PedigrAPP no está avalada ni certificada por sus autores ni por la NSGC. Algunas soluciones gráficas se identifican expresamente en la ayuda como convenciones propias del programa.

Consulta [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) para información sobre componentes y recursos ajenos.

## Colaboración y versiones

- [`CONTRIBUTING.md`](CONTRIBUTING.md): propuestas de cambio y reconocimiento de contribuciones.
- [`CHANGELOG.md`](CHANGELOG.md): historial de versiones.
- [`AUTHORS.md`](AUTHORS.md): autores registrados y equipo del proyecto.
- [`help.html`](help.html): instrucciones y nomenclatura.

**Historial:** PedigrAPP 1.0.0 deriva de la línea 0.8.75; retiró la identidad institucional de la interfaz/PDF sin modificar el modelo clínico. PedigrAPP 1.0.1 solo añade el marco legal y documental definitivo y actualiza metadatos de versión.