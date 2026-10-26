# Changelog

## v1.0.5 — October 26, 2026

- Introduces one integrated English/Spanish application, with a 🇪🇸 ES / 🇬🇧 EN selector, immediate switching, and the selected language stored locally in the browser.
- Centralizes localized interface text in `locales/es.json` and `locales/en.json` and builds the synchronous `locales/catalog.js` for reliable initialization.
- Localizes the editor, clinical condition forms, tooltips, QC messages and contextual parameters, saved-case controls, legends, help, and automatically generated PDF text.
- Preserves user-entered content, family JSON schema **4.16**, identifiers, pedigree geometry, relationship rules, PHP API, and Undo/Redo behavior.
- Adds strict locale parity, parameter, reference, and literal-audit checks, plus regression tests to guard future bilingual changes.
- Translates the project's Markdown documentation into English for international repository visibility, without changing registered legal information or the EUPL-1.2 license.
- The release was prepared from the internally reviewed **v1.0.5-rc8** candidate. Automated checks were performed with synthetic data; deployment-specific verification on the target Apache server and a physical mobile device was not part of the automated release validation.

### Earlier i18n release candidates (development history)

#### v1.0.5-rc8 — Global internationalization review

- Fixed contextual terms inserted into English QC warnings: *Union*, *Parentage*, *Parents*, *Sibship*, and *Multiple gestation*.
- Localized default clinical-report values (*Not specified*) and additional PNG-export failure messages.
- Individually reviewed 58 candidate literal occurrences (56 unique values); strict auditing now permits only documented exceptions.
- Restored older browser regression tests that did not load the i18n layer; added contextual QC and synthetic clinical PDF regressions.
- No changes to family data, the API, layout geometry, relationship rules, or QC logic.

#### v1.0.5-rc7 — Tooltip and contextual QC

- Localized clinical summaries and the tooltip's "⋯" relationship menu, including its instructions.
- Localized automatically generated fetal, gestational-carrier, and donor labels in QC while leaving user-entered aliases unchanged.
- Added focused dictionaries and regression tests.

#### v1.0.5-rc6 — Viewer, legends, and lists

- Localized clinical legends, empty-viewer messages, search controls, and main-menu help.
- Translated reset confirmations, saved-case filters and metadata, and people/relationship lists.
- Preserved dynamic counters when switching ES/EN, without modifying the clinical data model.

#### v1.0.5-rc5 — Condition terminology and clinical cards

- Localized toolbar hover labels and accessible names using stable ES/EN keys.
- Translated condition editor headings, inheritance modes, colors, patterns, and actions without changing internal values.
- Updated sex descriptions, field labels, and documented evaluation in clinical cards without rebuilding unsaved form data.

#### v1.0.5-rc4 — Reliable localization initialization

- Generated a synchronous locale catalog from the two JSON files to avoid untranslated Spanish text during initial load when English had been selected.
- Added consistency checks between generated assets and editable dictionaries.
- Corrected a QC label-overlap diagnostic.

#### v1.0.5-rc3 — Expanded dynamic text and migration guard

- Moved more creation, editing, validation, assisted reproduction, parentage, and editor-notice messages to semantic keys.
- Localized the complete help version history and symbol-source references using stable identifiers.
- Fixed switching ES ↔ EN with a stillbirth form open, preserving selected record type and unsaved values.
- Introduced `scripts/check_i18n.py --gate` to detect new unreviewed JavaScript strings and provisional keys.

#### v1.0.5-rc2 — Flags and expanded help/QC

- Added flag-labelled ES/EN selectors and extended centralized translations for QC and help.
- No changes to the data model, layout, or persistence.

#### v1.0.5-rc1 — Initial i18n prototype (October 22, 2026)

- Introduced the ES/EN selector, central dictionaries, localization infrastructure, and translations for primary controls and part of the PDF.
- Left clinical schema and drawing engine unchanged.
- Was incomplete in dynamic messages, QC, help, and complex PDF paths; subsequent release candidates addressed these gaps.

## Previous application releases

### v1.0.4 — October 21, 2026 (local development)

- Restored the PedigrAPP logo to the PDF report header, with the version at the right; the logo is embedded in the print view without external assets.
- Preserved the SVG icon of the **Export PDF** button during and after export, rather than leaving its expanded text visible.
- No changes to clinical report content, SVG/PNG export, or JSON schema 4.16.
- Distributed for local testing; not published to GitHub or Zenodo at that time.

### v1.0.3 — October 21, 2026 (local development)

- Added the **Stillbirth (SB)** shortcut under **Add relative** in the tooltip.
- New stillbirth records default to unknown sex and render as a diamond with a diagonal slash and SB label.
- Links offspring to both members of an unambiguous parental couple; with multiple unions, links only to the selected parent.
- Preserved fetal sex editing, Undo/Redo, and JSON schema 4.16.
- Distributed for local testing; no publication to GitHub or Zenodo implied.

### v1.0.2 — October 20, 2026

- Added the PedigrAPP Zenodo concept DOI: `10.5281/zenodo.23498335`.
- Documented the archived v1.0.1 DOI: `10.5281/zenodo.23498336`.
- Updated `CITATION.cff` and citation/publication metadata.
- Added the public PedigrAPP GitHub Pages URL.
- Simplified project-team references in `README.md`, retaining full credits in `AUTHORS.md`.
- **No functional changes compared with 1.0.1**; JSON schema 4.16 and all features retained.

### v1.0.1 — October 20, 2026

- Adopted **EUPL-1.2** in the project documentation, including full license text and SPDX metadata.
- Documented rights ownership, Safe Creative registration, registered authors, and project collaborators.
- Added contribution, privacy, security, and third-party notices.
- Updated citation metadata and in-app help credits.
- **No functional changes compared with 1.0.0**; retained JSON schema 4.16, drawing engine, QC, exports, and local data.
- Preserved historical tags `v1.0.0` and `online-v1.0.0` unchanged.

### v1.0.0 — October 19, 2026

- First publicly distributed PedigrAPP version without institutional visual branding.
- Removed the institutional header image.
- Used a neutral, self-contained PDF header without external institutional letterhead or logos.
- Prepared help, credits, and documentation for independent distribution.
- Added basic deployment and privacy guidance.
- Retained the functionality of 0.8.75 and JSON schema 4.16.

### v0.8.75

- Shortcuts for individual reproductive status: no offspring and infertility.

### v0.8.74

- Editing reproductive status from a union's contextual menu.

### v0.8.73

- Free horizontal reordering of individuals within their generation.

### v0.8.72

- Manual sibling reordering.

### v0.8.70–v0.8.71

- Father/mother/fetus template and contextual fetal-offspring shortcuts.

### v0.8.60–v0.8.69

- Live QC, review indicators, assisted reproduction, and layout adjustments.
