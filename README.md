# PedigrAPP

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23498335.svg)](https://doi.org/10.5281/zenodo.23498335)

**Version 1.1** · **A bilingual (English/Spanish) web application for creating and editing clinical genetics pedigrees.**

PedigrAPP draws pedigrees in accordance with the standardized nomenclature recommendations of Bennett/NSGC (1995, 2008, 2022, and the 2025 correction). It supports complex relationships, adoption, multiple gestations, assisted reproduction, clinical/genetic annotations, exports, and advisory QC.

### Highlights of v1.1

- Mutually exclusive **age** or **birth year** per eligible record (`XX a` / `n. YYYY` in Spanish; `XX y` / `b. YYYY` in English).
- Donors and gestational-carrier records may have documented partnerships without automatically implying genetic parentage.
- **Explicit gestation assignment** to an individual assigned female at birth (AFAB), including transgender men, independent of recorded gender and of genetic parentage (Bennett/French 2025 correction, Fig. 5.1.d).
- **A single existing sperm or egg donor** can be associated with several offspring or pregnancy outcomes through Advanced relationships or **⋯ More**, preserving an already recorded sibling bar (2025 correction, Fig. 5.1.c); a gestational egg donor remains restricted to one pregnancy.
- Bilingual ES/EN editor, help, QC and clinical PDF. Existing family JSON files are supported; **native JSON schema 4.19**.

> **Release validation:** This public release is derived exclusively from the installed and user-accepted v1.1 server version. The public distribution excludes stored family records and non-public test/example material. Deployment-specific access controls remain the responsibility of the deploying organization. See [Internationalization](I18N.md) and [Security](SECURITY.md).

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

The concept DOI represents the PedigrAPP version series and resolves to the latest version available on Zenodo. A version-specific DOI for v1.1 will be reported only after it has been assigned and confirmed by Zenodo.

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

**For upgrades, preserve your existing `data/` directory and back it up first.** Release ZIPs contain only `data/.htaccess` under `data/`, not stored family records. Do not expose the application or the PHP API to untrusted networks without additional access controls.

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

**Never commit identifiable patient information, family histories, or genetic data to the repository.** Real `data/` records must stay outside version control; `.gitignore` explicitly excludes `data/`, `examples/`, `tests/`, and `test/` except for `data/.htaccess`.

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

**History:** PedigrAPP 1.0.0 followed the 0.8.75 development line and removed institutional branding without changing the clinical model. Version 1.0.1 established its legal and documentary framework. Version 1.0.2 added DOI/Zenodo and citation metadata without functional changes. Versions 1.0.3 and 1.0.4 were local functional refinements. Version 1.0.5 adds internationalization; v1.1 adds gestation and shared-donor workflows, an exclusive birth-year field, and partner support for donors and carriers. For details and release/publication distinctions, see the changelog.


### v1.0.6-rc3 — Shared gamete donors (local candidate)

- From **Advanced relationships** or the donor tooltip **⋯ More**, select a pre-existing gamete donor and multiple offspring, including pregnancy outcomes. A recipient’s **⋯ More** also offers **Link an existing gamete donor**.
- When offspring share a recorded sibling group, that group retains one continuous sibling bar. Donor linkage does not create parentage or a couple.
- Gestational egg donors remain restricted to one pregnancy; schema 4.19, ES/EN.

### v1.0.6-rc2 — Explicit gestation assignment (local candidate)

- From **Advanced relationships** or an eligible AFAB person's **More (…)** menu, select **“gestates the pregnancy / gave birth to”** and choose an outcome.
- Explicit gestation is independent of gender and does not create genetic parentage or a partnership. A transgender man recorded AFAB may be the gestator (Bennett et al., 2025 correction, Fig. 5.1.d).
- With a sperm donor, the pregnancy line starts at the explicitly assigned person rather than inferred from the female partner.
- A pregnancy can have only one explicitly recorded gestator; a surrogate or gestational carrier G cannot be assigned simultaneously.
- Clinical JSON schema 4.18 adds optional `{type:"gestation",carrier:uid,target:uid}`; pre-existing family data remain readable. This is *not* the discarded shared-donor v1.0.6-b.

### v1.0.6 local candidate

The pedigree editor supports either an age or a birth year for eligible records. Explicit couple relationships are now possible for donor and gestational-carrier records; they do not imply biological parentage or gamete donation. The native family JSON remains authoritative.
