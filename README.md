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

## Installation

1. Deploy the application files on a web server with PHP support (PHP 8 is recommended). The editor itself is HTML/CSS/JavaScript; saving/loading families requires `api.php`.
2. Configure the server to allow the PHP process to read/write its own local `data/` directory. The public source package contains **only** `data/.htaccess` and `data/.gitkeep`, never saved cases.
3. Restrict access to the application and API before using real clinical data. `data/.htaccess` blocks direct downloads **only when Apache honors `.htaccess` directives**. It does not secure the API or replace authentication, authorization, network access controls, backups and legal safeguards.
4. Open `index.html` through the configured server. Select ES/EN in the top bar. Use **Help** for clinical notation, controls and the release history.

**Upgrading:** back up your installation and `data/` first. Replace the application code **without overwriting, deleting or copying your real `data/` records into a public repository**. Review [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

For trusted local development, `php -S 127.0.0.1:8080` can serve the application. This built-in PHP server does **not** enforce Apache `.htaccess` protections; do not expose it publicly with real case data.

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
