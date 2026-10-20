# PedigrAPP online

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23498335.svg)](https://doi.org/10.5281/zenodo.23498335)

**Versión 1.0.2** · Editor web de árboles genealógicos para genética clínica.

PedigrAPP online es la edición estática de PedigrAPP. Se ejecuta íntegramente en el navegador del usuario y no necesita PHP, base de datos ni un backend propio. Los casos guardados mediante la aplicación se almacenan en `localStorage` del navegador.

## Estado

- **Versión:** 1.0.2
- **Rama:** `online`
- **Repositorio:** https://github.com/josemilezana/pedigrapp
- **Interfaz:** español
- **Licencia:** European Union Public Licence v1.2 (**EUPL-1.2**)
- **Registro Safe Creative:** `2610197365707`
- **DOI general (todas las versiones):** [`10.5281/zenodo.23498335`](https://doi.org/10.5281/zenodo.23498335)
- **DOI de v1.0.1:** [`10.5281/zenodo.23498336`](https://doi.org/10.5281/zenodo.23498336)

## Privacidad

PedigrAPP online no envía a un servidor de PedigrAPP los datos introducidos en un pedigree. El guardado/carga de casos se realiza en el almacenamiento local del navegador y las importaciones/exportaciones se procesan localmente.

El usuario es responsable de la custodia de los ficheros exportados y del cumplimiento de las normas de protección de datos aplicables en su entorno.

Consulte [PRIVACY.md](PRIVACY.md).

## Funcionalidades principales

- Creación y edición de pedigrees multigeneracionales.
- Relaciones familiares complejas, múltiples uniones, consanguinidad y adopción.
- Gemelos y gestaciones múltiples.
- Representación de embarazo, SAB, TOP, ECT y mortinato.
- Infertilidad y ausencia de descendencia.
- Reproducción asistida, donación de gametos y portadora gestacional.
- Condiciones clínicas/genéticas múltiples y leyenda dinámica.
- Reordenación gráfica, Deshacer/Rehacer y controles de calidad orientativos.
- Guardado/carga/borrado local de casos mediante `localStorage`.
- Importación/exportación JSON y compatibilidad PED cuando procede.
- Exportación SVG, PNG y PDF desde el navegador.
- Ayuda integrada de uso y nomenclatura.

## Uso local

Sirva la carpeta mediante HTTP, por ejemplo:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Abra después `http://localhost:8080/` o la IP correspondiente del servidor.

El almacenamiento `localStorage` depende del origen exacto (protocolo, host y puerto). Un caso guardado en `localhost:8080` no aparece automáticamente en otro dominio o puerto.

## Nomenclatura

PedigrAPP toma como referencia las recomendaciones estandarizadas de pedigree de Bennett/NSGC (1995, 2008, 2022 y corrección de 2025). Consulte [docs/NOMENCLATURE.md](docs/NOMENCLATURE.md) y la ayuda integrada.

## Autoría y equipo

Los **autores registrados de la versión v1.0.0 depositada en Safe Creative** son:

- José Miguel Lezana Rosales
- Carmen Palma Milla
- Rubén Pérez de la Fuente

La composición del equipo clínico y científico del proyecto y la distinción entre autoría registrada, colaboración y futura autoría científica se detallan en [AUTHORS.md](AUTHORS.md).

## Titularidad y registro

La **Fundación Investigación Biomédica Hospital 12 de Octubre** figura como titular de todos los derechos de explotación del software registrado, con ámbito territorial mundial.

- **Título registrado:** PedigrAPP – Aplicación web para la creación y edición de árboles genealógicos en genética clínica.
- **Registro Safe Creative:** `2610197365707`
- **Certificado:** `2610197365707-29DQUR`
- **Fecha de inscripción:** 20/10/2026 08:01 UTC

Los tags históricos `v1.0.0` y `online-v1.0.0` corresponden a los snapshots depositados y se conservan inalterados.

## Licencia

PedigrAPP se distribuye bajo la **European Union Public Licence v1.2 (EUPL-1.2)**. Consulte el texto íntegro en [LICENSE](LICENSE).