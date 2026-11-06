# PedigrAPP security

## Scope and current status

PedigrAPP v1.2 does not implement user authentication, roles, or fine-grained authorization in `api.php`. **Do not expose an installation containing real clinical data directly to the Internet without appropriate external access controls and security measures.**

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

## Apache protection scope

`Require all denied` in `data/.htaccess` requires Apache 2.4 authorization support and an effective `AllowOverride AuthConfig` (or equivalent permitted directive) for that directory. With `AllowOverride None`, the file is ignored. Configure an equivalent server-level deny rule where required. Test denial using a synthetic file in a disposable installation.

The PHP API intentionally returns stored JSON to application users; protecting direct file URLs does not restrict `api.php`. External authentication and authorization must cover the application and every API action. This release does not add built-in accounts.
