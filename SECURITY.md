# Security

## Reporting a problem

Don't open a public issue for a security problem. Use **Report a vulnerability** under this repo's
[Security tab](https://github.com/Zai-exe/sibika/security) to send a private report to the maintainers.

## How the site is built

- It's a static site on GitHub Pages: no server, no database, no logins, no cookies.
- Listings are rendered as text, never as HTML, and only `http`/`https` links are shown.
- A Content Security Policy limits scripts to this site and one pinned, integrity-checked icon library.
- Submissions are GitHub issues. Anything typed into the form is public once the issue is posted, along with the
  submitter's GitHub username, so don't include personal phone numbers, emails or addresses.
