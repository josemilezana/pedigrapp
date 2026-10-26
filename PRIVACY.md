# PedigrAPP online privacy

## Browser-only persistence

The `online` edition of PedigrAPP is designed to run entirely in the user's browser. It does not provide a PedigrAPP backend for receiving or storing pedigrees.

The **Save** function uses browser `localStorage`. Saved cases therefore remain associated with the browser profile and the exact web origin (protocol, host, and port).

PedigrAPP online does not send names, family relationships, clinical notes, genetic information, imported family files, or saved pedigree JSON to a PedigrAPP application server.

## Import and export

Imported JSON and PED files are processed in the browser. JSON, PED, SVG, and PNG exports are generated in the browser, and PDF generation uses the browser's print/save-to-PDF workflow.

Exported files may contain all information entered into the pedigree and must be treated as sensitive when they contain clinical or identifying information.

## Language switching

Switching Spanish/English changes application labels and generated interface/report scaffolding. User-entered family and clinical content is never sent to an external translation service and is not automatically translated.

## User responsibility

Users and deploying organizations are responsible for deciding what information may be entered, protecting exported files, configuring managed browsers/devices where appropriate, and complying with applicable confidentiality and data-protection requirements.

Clearing browser data can remove locally saved cases. Export important cases as JSON and store those files securely.

## Development and support

Never include identifiable clinical data in GitHub issues, pull requests, screenshots, logs, or test fixtures. Use synthetic or properly de-identified examples.

The **EUPL-1.2** license governs distribution of the software; it does not replace privacy, confidentiality, professional, or data-protection obligations.
