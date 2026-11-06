# PedigrAPP online

**Version 1.2** · Bilingual English/Spanish pedigree editor for clinical genetics.

## What is new in v1.2

- Safer PED import/export: explicit handling of SEX codes, optional classic symbols, condition-specific phenotype selection, missing values and confirmed unaffected status. Complex relationships are not silently converted into genetic parent roles.
- Optional clinical documentation: history collection/update dates, geneticist or physician recording the history, informant and maternal/paternal ancestry. Entered values appear in the clinical PDF.
- Optional year of death, compact chronology and improved handling of deceased individuals.
- Improved partnership and adoption shortcuts and assisted-reproduction QC.
- Separate publication-figure export to SVG, PNG and print-to-PDF. Explicit identifiers and free text are omitted by default; chronology is opt-in. Family structure can still identify people, so manual confidentiality review is required.
- Native JSON schema **4.22**, with backward compatibility and no database migration. Existing v1.1 functionality, bilingual help and clinical exports are retained.

Technical checks do not constitute independent clinical validation or endorsement by Bennett's authors or NSGC.

## Static browser edition

No PHP backend or data directory. Save/load/delete use browser localStorage with the existing `pedigrees.family.` prefix, preserving earlier saved cases. Storage belongs to the browser profile and origin. Protect exports and shared devices; clearing browser data removes local cases.

Public application: https://josemilezana.github.io/pedigrapp/

For a private demonstration with synthetic data:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

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

The concept DOI refers to the PedigrAPP version series and resolves to the latest version **available on Zenodo**. It does not imply that v1.2 has already been deposited there.

## Languages

Switch ES/EN in the header. User-entered clinical data are not translated or sent to a translation service. The dictionaries in `locales/es.json` and `locales/en.json` feed `locales/catalog.js`; see [I18N.md](I18N.md).

## Privacy and distribution

No saved family records, examples, test installations, internal validation reports or deployment-specific configuration are distributed. Protect clinical exports as well as the original records. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## References and credits

See [AUTHORS.md](AUTHORS.md), [CITATION.cff](CITATION.cff), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CHANGELOG.md](CHANGELOG.md). Scientific references include Bennett et al. 1995, 2008, 2022 and the French et al. 2025 correction.
