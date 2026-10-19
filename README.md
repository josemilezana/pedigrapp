# PedigrAPP online

**Versión 1.0.0** · Editor web de árboles genealógicos para genética clínica.

PedigrAPP online es la edición estática de PedigrAPP. Se ejecuta íntegramente en el navegador del usuario y no necesita PHP, base de datos ni un backend propio. Los casos guardados mediante la aplicación se almacenan en `localStorage` del navegador.

## Estado

- **Versión:** 1.0.0
- **Rama:** `online`
- **Repositorio:** https://github.com/josemilezana/pedigrapp
- **Interfaz:** español
- **Licencia:** pendiente de resolución/autorización institucional

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

## Autor

**José Miguel Lezana Rosales**  
Servicio de Genética, Hospital Universitario 12 de Octubre, Madrid, Spain  
ORCID: https://orcid.org/0000-0003-3510-2077  
Contacto: josemiguel.lezana@salud.madrid.org

La afiliación identifica al autor y no implica por sí sola aprobación, patrocinio o titularidad institucional del software.

## Licencia

**Pendiente de resolución/autorización institucional.** Hasta que se incorpore un archivo `LICENSE`, no debe asumirse una licencia open source concreta.
