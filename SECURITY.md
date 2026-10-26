# PedigrAPP security

## Scope and current status

PedigrAPP v1.0.5 does not implement user authentication, roles, or fine-grained authorization in `api.php`. **Do not expose an installation containing real clinical data directly to the Internet without appropriate external access controls and security measures.**

The `data/.htaccess` rule is intended for Apache installations configured to honor it; it does not protect alternative paths or deployments on other servers by itself.

## Deployment recommendations

- Protect access to the application and `api.php` with suitable authentication and authorization.
- Keep `data/` outside the public document root whenever feasible, or effectively deny web-server access to it.
- Use HTTPS in transit, least-privilege filesystem permissions, protected backups, and maintained web-server/PHP versions.
- Explicitly test that read, save, and delete operations cannot be performed without the necessary permissions.
- Never place real clinical records in GitHub, issues, public logs, or sample fixtures.
- Do not use `php -S` as a public production server.

## Responsible vulnerability reporting

If GitHub offers **Private vulnerability reporting / Security Advisories** for the repository, use that feature to report vulnerabilities privately. Otherwise, agree on a private channel with the maintainers before disclosing exploitable details.

This document does not invent or designate an unconfirmed security email address. Response procedures and target resolution times will be defined when the project establishes its public communication channels.

## Legal notice

Distribution is governed by **EUPL-1.2**, including its disclaimer of warranties. See [LICENSE](LICENSE) and [PRIVACY.md](PRIVACY.md).
