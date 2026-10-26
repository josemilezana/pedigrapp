# PedigrAPP

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23498335.svg)](https://doi.org/10.5281/zenodo.23498335)

**Version 1.0.5** · **A bilingual (English/Spanish) web application for creating and editing clinical genetics pedigrees.**

PedigrAPP draws pedigrees in accordance with the standardized nomenclature recommendations of Bennett/NSGC (1995, 2008, 2022, and the 2025 correction). It supports complex family relationships, adoption, twins and other multiple births, assisted reproduction, clinical and genetic information, exports, and advisory quality-control (QC) checks.

Version **1.0.5** introduces an integrated ES/EN interface, localized QC, interactive help, clinical cards, and PDF reports. Users can switch languages without reloading or altering the family record. The pedigree JSON schema remains **4.16**. Version 1.0.4 restored the PedigrAPP logo in PDF reports and preserved the PDF button icon; 1.0.3 introduced the stillbirth (SB) quick-add shortcut.

> **Release validation:** Automated checks use synthetic data. Deployment-specific access controls, historical clinical cases, and physical-phone testing remain the responsibility of the deploying organization. See [Internationalization](I18N.md) and [Security](SECURITY.md).

## License, ownership, and registration

**License:** [European Union Public Licence v1.2 (EUPL-1.2)](LICENSE), approved for PedigrAPP by the rights holder. The full, unmodified license is included in `LICENSE`. SPDX identifier: `EUPL-1.2`.

**Holder of all exploitation rights:** **Fundación Investigación Biomédica Hospital 12 de Octubre** (worldwide territorial scope, as stated in the Safe Creative registration).

**Registered title:** *PedigrAPP – Aplicación web para la creación y edición de árboles genealógicos en genética clínica* (official Spanish title; retained verbatim).

- **Safe Creative registration:** `2610197365707`.
- **Certificate:** `2610197365707-29DQUR`.
- **Registration date:** October 20, 2026, 08:01 UTC.
- **Deposited archive:** `pedigrapp-main-online.zip`, containing GitHub snapshots of `main` and `online` deposited for v1.0.0.
- **Registered historical snapshots:** tags `v1.0.0` and `online-v1.0.0`, preserved unchanged.

### Registered authors of v1.0.0

- **José Miguel Lezana Rosales**
- **Carmen Palma Milla**
- **Rubén Pérez de la Fuente**

The complete clinical and scientific project team is listed in [AUTHORS.md](AUTHORS.md). Participation does not automatically imply authorship of later versions or scientific publications; credits depend on actual contributions and applicable criteria.

For software citation information, see [CITATION.cff](CITATION.cff).

### DOI and citation

- **Concept DOI covering the PedigrAPP version series:** [`10.5281/zenodo.23498335`](https://doi.org/10.5281/zenodo.23498335).
- **Archived DOI for PedigrAPP v1.0.1:** [`10.5281/zenodo.23498336`](https://doi.org/10.5281/zenodo.23498336).
- **Archived DOI for PedigrAPP v1.0.2:** [`10.5281/zenodo.23499180`](https://doi.org/10.5281/zenodo.23499180).

The concept DOI represents the PedigrAPP version series and resolves to the latest version available on Zenodo. For citation of a specific archived release, use its version-specific DOI when available.

## Languages and internationalization

Use the **🇪🇸 ES / 🇬🇧 EN** selector in the header. Spanish is the default; your choice is stored in your browser (`localStorage`). You can change the language immediately while editing a pedigree. User-entered names, case details, variants, and clinical notes are never translated.

All interface translations live in `locales/es.json` and `locales/en.json`. A generated `locales/catalog.js` supplies both languages to the browser. New features must include **both Spanish and English** UI strings. See [I18N.md](I18N.md) for translation keys, validation, and testing.

## Installation

PedigrAPP needs a web server with **PHP** for the `api.php` save/load operations. The interface uses HTML, CSS, and JavaScript; it has no build framework and does not require MySQL.

For a **private local demonstration** only, from the application directory:

```bash
php -S 127.0.0.1:8080
```

Open `http://127.0.0.1:8080/`. Editing and browser-side export work locally. The PHP process must be able to write to `data/` if you wish to save families.

**For upgrades, preserve your existing `data/` directory and back it up first.** Release ZIPs contain only `data/.htaccess` and `data/.gitkeep`, not stored family records. Do not expose the application or the PHP API to untrusted networks without additional access controls.

The optional brand assets are `images/PedigrAPP_logo.png` and `images/PedigrAPP_icono_small.png`. A text fallback is used if the logo is unavailable. PDF reports embed the application's own logo and do not contain institutional letterhead.

## Key features

- Multigenerational pedigree editor with multiple partnerships, half-siblings, consanguinity, adoption, pregnancy losses, and multiple gestations.
- Representation of gamete donation, gestational carriers, surrogates, and intended parents, with distinct documented relationship types.
- Individual and clinical/genetic-condition records, annotations, and a dynamic pedigree legend.
- Automatic layout; mouse-driven horizontal adjustments, same-generation reordering, Undo/Redo.
- Live advisory QC, separate from professional review.
- PHP-based family save/load; JSON and PED import/export; browser-side SVG, PNG, and PDF export.
- Interactive help covering notation conventions and the scientific references.
- English/Spanish switching across the interface, help, QC, and reports.

## Exporting PDF reports

Choose **Export PDF** and then **Save as PDF** in the browser's print dialog. Disabling the browser's default *Headers and footers* is recommended. The report contains the pedigree, legend, case metadata, relevant clinical sections, and the embedded PedigrAPP logo. Automatically generated headings and labels follow the selected language; user-entered content remains unchanged.

## Privacy and security

**Never commit identifiable patient information, family histories, or genetic data to the repository.** Real `data/` records must stay outside version control; the original `.gitignore` rules are retained.

`data/.htaccess` is intended to block direct HTTP downloads when Apache honors the directive, but **is not a substitute for authentication or authorization**. `api.php` has no built-in access-control system. Protect the server and verify applicable legal and organizational requirements before handling real patient data.

Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) before making the application accessible over a network.

## Nomenclature and third-party acknowledgments

- Bennett RL et al. *Recommendations for Standardized Human Pedigree Nomenclature*. **Am J Hum Genet**. 1995;56:745–752.
- Bennett RL et al. *Standardized Human Pedigree Nomenclature*. **J Genet Couns**. 2008;17:424–433.
- Bennett RL et al. *Practice resource-focused revision*. **J Genet Couns**. 2022;31:1238–1248.
- French KS et al. *Correction to: Practice resource-focused revision*. **J Genet Couns**. 2025;34:e2020.

These are scientific nomenclature references, not statements of endorsement or certification by their authors or the NSGC. PedigrAPP-specific display conventions are explicitly identified in the in-app help. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Contributing and release history

- [CONTRIBUTING.md](CONTRIBUTING.md) — proposing improvements and acknowledging contributions.
- [CHANGELOG.md](CHANGELOG.md) — version history.
- [AUTHORS.md](AUTHORS.md) — registered authors and project team.
- [I18N.md](I18N.md) — maintaining both languages.
- [help.html](help.html) — interactive help and nomenclature.

**History:** PedigrAPP 1.0.0 followed the 0.8.75 development line and removed institutional branding without changing the clinical model. Version 1.0.1 established its legal and documentary framework. Version 1.0.2 added DOI/Zenodo and citation metadata without functional changes. Versions 1.0.3 and 1.0.4 were local functional refinements. Version 1.0.5 adds internationalization. For details and release/publication distinctions, see the changelog.
