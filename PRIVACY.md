# Privacy and data protection

PedigrAPP is a web application for representing clinical family pedigrees. Depending on its use, it may process **particularly sensitive information**, including health and genetic data concerning several members of a family. This document is informational; it is not a data protection impact assessment and does not, by itself, certify compliance for a particular deployment.

## Data and storage

- When server-side saving is enabled, `api.php` reads and writes JSON files within the installation's local `data/` directory.
- Users can import/export JSON and PED and create SVG, PNG, and PDF files. These copies require protection equivalent to the original records.
- Published source code must not contain actual patient information. The fixtures in `examples/` are intended for development and validation.
- **PedigrAPP v1.0.5 does not include built-in user accounts or access authorization.** Security depends on deployment configuration.
- The selected interface language is stored in browser `localStorage` (`pedigrapp.language`); this does not change the saved family records.

## Responsibilities of each deployment

Before using real data, the deploying organization must determine its lawful basis, applicable technical and organizational safeguards, and the relevant roles and responsibilities, including, where applicable, Regulation (EU) 2016/679 (GDPR) and Spanish data protection legislation.

At a minimum, appropriate authentication and authorization, restricted `data/` permissions, protection against direct HTTP access, HTTPS where appropriate, secured backups, a retention policy, and access controls and operational logging proportionate to the clinical context should be considered.

`data/.htaccess` blocks direct HTTP access only when Apache actually applies its directives. **It is not a substitute for authentication or authorization.** Equivalent safeguards are required for other web servers, such as Nginx or development servers.

## Sharing and publication

A pedigree can indirectly identify individuals or families even after names have been removed. Before sharing screenshots, examples, or exported files, verify that doing so is lawful and does not disclose sensitive or identifiable information.

Public release of the **source code** under EUPL-1.2 is not permission to disclose personal information or family records held by users of the software.

To report vulnerabilities, see [SECURITY.md](SECURITY.md).
