# PedigrAPP

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23498335.svg)](https://doi.org/10.5281/zenodo.23498335)

**Version 1.3** · A bilingual (Español / English) web application to create, edit, review and export pedigrees in clinical genetics.

PedigrAPP implements pedigree symbols and conventions informed by the standardized nomenclature publications of Bennett and colleagues (1995, 2008, 2022) and the 2025 correction. It supports complex family relationships, adoption, multiple gestation, assisted reproduction, clinical and genetic annotations, advisory quality checks and structured exports. These publications do not imply endorsement of PedigrAPP.

## Features

- Pedigree editor with automatic layout and protected horizontal or unrestricted X/Y manual adjustment. Manual positions can be undone or reset, and are persisted separately from clinical relationships.
- Sex assigned at birth and gender identity represented independently; adoption, donors, gestational carriers and other nonstandard parentage relationships.
- Multiple unions, siblings, twins and other multiple gestations; family documentation and condition-specific phenotype records.
- JSON import/export, PED import/export (with explicit limitations), SVG/PNG export, clinical PDF and publication-oriented figures.
- Bilingual user interface, help, nomenclature guidance and clinical PDF (Spanish/English).
- Autosave with status feedback, conflict detection and protected case creation. **For a new family, autosave starts only after the user enters a Family ID**; previously saved families autosave when loaded. Manual Save is always available.

**Native JSON format:** 4.23. Older family JSON files remain supported by the application; always retain a backup of the original case files before upgrading.

## GitHub Pages edition

This branch runs the v1.3 editor as a static application. It stores cases in this browser's localStorage, using the existing storage key format. There is no PHP endpoint and no server-side case storage. Use HTTPS and a browser with Web Locks support for saving and conflict detection between tabs.

For a new case, autosave starts only after an explicit Family ID. An existing ID cannot be silently overwritten when creating a case. Concurrent edits require reloading after preserving your changes.

Browser storage is not an encrypted clinical database: other users of the same browser profile and scripts on the same origin may access it. Clearing site data can erase saved families. Export JSON backups and do not enter identifiable clinical data into the public demonstration. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

For the PHP server edition, use the main branch or the official release ZIP.

## PDF and report use

The clinical PDF includes a subdued bilingual notice that reports are user-generated and require independent review. Generated reports may be used, including for professional and commercial purposes, subject to applicable law, confidentiality and third-party rights. See [Terms of Use](TERMS_OF_USE.md). The application's PDF links to this document in the public repository.

Publication-oriented figures omit certain text fields by default, but **must not be assumed anonymous**: pedigree geometry and clinical annotations can still identify families. Review every figure before disclosure.

## PED interoperability

A conventional six-column PED file cannot encode all pedigree concepts (gender identity, nuanced reproduction, gestational relationships or clinical provenance). Import and export must be interpreted and verified by a qualified professional. PED sex fields do not establish gender identity.

## Languages and maintenance

Editable language sources are `locales/es.json` and `locales/en.json`; `locales/catalog.js` is generated for the browser. For string changes:

```bash
python3 scripts/build_locale_bundle.py
```

See [I18N.md](I18N.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for maintenance guidance. The locale-bundle generator is included for contributors. Internal validation tools and registries are not part of the public distribution.

## Licence, rights and credits

- **Software licence:** [European Union Public Licence, EUPL-1.2](LICENSE).
- **Holder of exploitation rights:** Fundación Investigación Biomédica Hospital 12 de Octubre, as recorded in the Safe Creative registration.
- **Registered title:** *PedigrAPP – Aplicación web para la creación y edición de árboles genealógicos en genética clínica*.
- **Safe Creative registration:** `2610197365707` (deposited version v1.0.0).
- **Concept DOI:** [10.5281/zenodo.23498335](https://doi.org/10.5281/zenodo.23498335). The DOI points to deposited Zenodo versions and does not mean this release has been deposited there.
- See [AUTHORS.md](AUTHORS.md), [CITATION.cff](CITATION.cff), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CHANGELOG.md](CHANGELOG.md).

Use of the software and its generated reports does not imply independent clinical certification, verification or endorsement by the project or its contributors.
