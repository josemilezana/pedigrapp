# PedigrAPP online

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23498335.svg)](https://doi.org/10.5281/zenodo.23498335)

**Version 1.0.5** · Static browser edition of PedigrAPP for creating, editing, reviewing, and exporting pedigrees for clinical genetics.

PedigrAPP online runs entirely in the browser and does **not** require PHP, a database, or a PedigrAPP backend. Saved cases are stored in the browser's `localStorage` for the current web origin.

Version **1.0.5** provides complete **English/Spanish internationalization** across the editor, clinical forms, QC, help, tooltips, legends, and generated PDF content. Existing PedigrAPP family files remain compatible; the family schema is still **JSON 4.16** and language switching never translates or alters user-entered clinical data.

**Public application:** https://josemilezana.github.io/pedigrapp/

## Privacy model

PedigrAPP online does not send pedigree content to a PedigrAPP application server. Save/load/delete operations use browser `localStorage`; JSON/PED import and JSON/PED/SVG/PNG/PDF export are processed in the browser.

`localStorage` is tied to the exact browser profile and origin. Clearing browser data, changing browser/profile/device, or using a different domain may make saved cases unavailable. Export important cases as JSON and protect exported clinical files according to applicable policies.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## License, ownership, and registration

**License:** [European Union Public Licence v1.2 (EUPL-1.2)](LICENSE). SPDX identifier: `EUPL-1.2`.

**Holder of all exploitation rights:** **Fundación Investigación Biomédica Hospital 12 de Octubre**, with worldwide territorial scope according to the Safe Creative registration.

**Registered title:** *PedigrAPP – Aplicación web para la creación y edición de árboles genealógicos en genética clínica*.

- **Safe Creative registration:** `2610197365707`.
- **Certificate:** `2610197365707-29DQUR`.
- **Registration date:** October 20, 2026, 08:01 UTC.
- **Registered historical snapshots:** `v1.0.0` and `online-v1.0.0`; these tags remain unchanged.

### Registered authors of v1.0.0

- **José Miguel Lezana Rosales**
- **Carmen Palma Milla**
- **Rubén Pérez de la Fuente**

The full clinical/scientific project team is listed in [AUTHORS.md](AUTHORS.md).

### DOI and citation

- **Concept DOI covering the PedigrAPP version series:** [`10.5281/zenodo.23498335`](https://doi.org/10.5281/zenodo.23498335).
- **Archived DOI for PedigrAPP v1.0.1:** [`10.5281/zenodo.23498336`](https://doi.org/10.5281/zenodo.23498336).
- **Archived DOI for PedigrAPP v1.0.2:** [`10.5281/zenodo.23499180`](https://doi.org/10.5281/zenodo.23499180).

For citation metadata, see [CITATION.cff](CITATION.cff).

## Languages and internationalization

Use the **🇪🇸 ES / 🇬🇧 EN** selector in the header. Spanish is the default and the selected language is stored locally in the browser. User-entered names, aliases, indications, variants, and clinical notes are never translated.

Translations are maintained in `locales/es.json` and `locales/en.json`, with the generated synchronous bundle `locales/catalog.js`. See [I18N.md](I18N.md).

## Key features

- Multigenerational pedigree editing with complex family relationships, multiple unions, half-siblings, consanguinity, adoption, pregnancy losses, twins and multiple gestations.
- Assisted reproduction, gamete donation, gestational carriers, surrogates, and intended parents.
- Multiple clinical/genetic conditions, comments, dynamic legends, and advisory QC.
- Automatic layout, manual horizontal adjustment, same-generation reordering, Undo/Redo.
- Browser-local save/load/delete using `localStorage`.
- JSON and PED import/export and browser-side SVG, PNG, and PDF export.
- Integrated bilingual help and nomenclature references.

## Running locally

Serve the directory over HTTP, for example:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080/`.

The saved-case store belongs to that exact origin. A case saved at `http://127.0.0.1:8080` is not automatically available at another domain or port.

## Scientific nomenclature

PedigrAPP is informed by the standardized pedigree nomenclature recommendations of Bennett/NSGC (1995, 2008, 2022, and the 2025 correction). These references do not imply endorsement or certification by their authors or the NSGC. PedigrAPP-specific display conventions are identified in the integrated help.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for scientific references and third-party notices.
