# PedigrAPP online security

## Scope

PedigrAPP online is a static browser application. It has no PedigrAPP persistence backend and stores saved cases in browser `localStorage`.

Security considerations still include imported files, handling of user-entered text, SVG/HTML generation, browser storage, exported files, browser/device security, hosting configuration, and future dependencies.

## Deployment recommendations

- Serve the application over HTTPS when used across a network.
- Keep browsers and operating systems maintained.
- Treat browser profiles and devices containing clinical pedigrees as sensitive assets.
- Protect exported JSON, PED, SVG, PNG, and PDF files appropriately.
- Use managed authentication/access controls at the hosting layer when organizational policy requires them.
- Never place real clinical records in the public repository, issues, logs, or fixtures.

## Responsible vulnerability reporting

If GitHub offers **Private vulnerability reporting / Security Advisories** for the repository, use that feature for sensitive vulnerability reports. Otherwise, agree on a private channel with the maintainers before disclosing exploitable details.

Do not attach real patient data or identifiable pedigrees to vulnerability reports. Use synthetic examples only.

## Legal notice

Distribution is governed by **EUPL-1.2**, including its disclaimer of warranties. See [LICENSE](LICENSE) and [PRIVACY.md](PRIVACY.md).
