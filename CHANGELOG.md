# Changelog

This file summarizes public-facing releases. The in-app Help section includes a more detailed bilingual history of individual feature updates.

## v1.3 — 10 November 2026

- Improved layout stability for multiple partners and sibships: adding partners or ancestry preserves sibling order, and independent descendant branches are placed closer to their parental unions.
- Added persistent manual layout modes: protected horizontal movement and unrestricted X/Y movement, with adaptive connectors, Undo/Redo and automatic layout reset. Manual presentation changes do not alter clinical relationships or birth order.
- Added autosave for committed pedigree edits, including family documentation and layout. New families autosave only after the user explicitly enters a Family ID; previously saved cases autosave when loaded. Save status and server-side safeguards detect conflicting updates.
- Updated clinical PDF: adjusted legend spacing and a subdued bilingual user-generated-report disclosure with a link to the Terms of Use. Professional/commercial use of generated outputs is permitted, subject to applicable law and rights.
- Refreshed bilingual Help, release notes and terminology. Native JSON schema **4.23**; compatible with older family JSON files.

## v1.2 — 6 November 2026

- Improved PED import safety and phenotype export selection. Import does not infer gender identity from PED sex; classic symbols are optional.
- Added optional family-level clinical documentation, provenance, professional recording the family history, maternal/paternal ancestry, death year, and additional clinical/QC checks.
- Extended complex reproductive and partnership representations while protecting adoption and sibling relationships.
- Added publication-oriented SVG, PNG and PDF figure export; maintained separate clinical PDF output and discrete source-repository attribution. Native JSON schema **4.22**.

## v1.1 — 29 October 2026

- Consolidated bilingual ES/EN editor, help, clinical PDF and quality-check terminology.
- Refined sex assigned at birth, gender identity, assisted reproduction, gestation and shared-donor representations; retained compatibility with existing families.

## v1.0.1 — 20 October 2026

- Established the public legal and documentary framework, credits, licence and registration context.

## v1.0.0 — 19 October 2026

- Initial registered release of the PedigrAPP pedigree web application.

For scientific nomenclature references, see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). For registered authorship and rights ownership, see [AUTHORS.md](AUTHORS.md).
