# Security — GitHub Pages edition v1.3

This static edition contains no PHP API or data directory. Case persistence uses browser localStorage; write operations require HTTPS, Web Crypto and Web Locks. Revisions detect stale saves and new-case creation rejects existing identifiers. These controls do not provide authentication, encryption or protection against malicious same-origin scripts.

Use a private browser profile, maintain JSON backups and avoid identifiable clinical data on the public demonstration. Clearing browser storage can delete saved cases. Never publish case records, credentials or internal infrastructure information in issues. Report security concerns privately through the repository security reporting facilities when available.

For an independently hosted PHP installation, consult SECURITY.md on main and restrict access to both the editor and its API. Apache data-directory protections alone do not secure the API.
