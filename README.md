# MyCall handbook

Internal handbook (Simplified Chinese) for colleagues who take over the MyCall project:
overview, Thailand collection progress, old-customer linking, Vietnam, contacts, FAQ, glossary.
One static page with tabs, protected by a password.

```
src/handbook.html   plaintext content, one <section> per tab (NOT published, git-ignored)
src/gate.html       password page template
assets/             style.css, app.js (tabs + decryption)
tools/build.mjs     encrypts src/handbook.html into docs/index.html
docs/               the published site: password page + ciphertext only
```

## How the password works

GitHub Pages serves every file to anyone, even from a private repository, so a password check in
JavaScript alone would not hide anything. Instead the build encrypts the whole page:

- AES-256-GCM, key derived from the password with PBKDF2-SHA256 (600,000 iterations), using the
  Web Crypto API built into Node and the browser. No packages.
- `docs/index.html` holds only the ciphertext. The browser decrypts it after the visitor types the
  password. Wrong password: nothing is shown.
- After a correct password the key is kept in `sessionStorage`, so reloading in the same tab does
  not ask again. Closing the tab forgets it.
- The ciphertext is public, so the password is the only protection: use 12+ random characters and
  share it privately (never in the group chat).

## Build

From the repository root (the password is typed hidden and never lands in shell history):

```
read -rs HANDBOOK_PASSWORD && export HANDBOOK_PASSWORD && node tools/build.mjs
```

Rebuild after every content change, then commit `docs/`. To change the password, rebuild with the
new one; the old one stops working.

Preview without a password: open `src/handbook.html` in a browser.

## Publish on GitHub Pages

1. Push the repository to GitHub.
2. Settings > Pages > Build and deployment: Source "Deploy from a branch", branch `main`, folder `/docs`.
3. The site appears at `https://<owner>.github.io/<repo>/`.

`src/handbook.html` is git-ignored because GitHub Free only serves Pages from public repositories.
If the repository is private, remove that line from `.gitignore` so the source is versioned too.
Either way, keep a copy of `src/handbook.html`: without it the site cannot be rebuilt.

## Content rules

- No API keys, passwords, tenant ids, server IPs, partner callback URLs or customer personal data,
  even behind the password.
- Change the date in the header (`更新日期`) on every update.
- The collection progress board mirrors the internal task sheet tab 「催收Cluega Dev」; update both together.
- Interface labels stay in Traditional Chinese inside 「」, exactly as the product shows them.

© 2026 Cluega Engine IT Co., Ltd. All rights reserved
