# Working on net19

- This directory is the repository root. Verify `git rev-parse --show-toplevel` before status/staging; never operate on the unrelated parent repository.
- Use `src/` and `static/` as the source of truth. Build into `dist/extension/`; do not hand-edit generated JavaScript.
- net19 only themes the sites listed in `src/themes.ts`. Do not add archive lookups, caches, or behavior on other sites.
- Themes are styling rules on `--n19-*` tokens with light and dark values. The device's light/dark setting decides the mode: when a site shows the other one, `palette.js` flips the page; themes never switch a site's own setting. `npm test` enforces the stylesheet contract.
- Compare a theme with the site's Web Design Museum capture and check it on the live site, in light and dark, before calling it done.
- Run `npm run audit -- <id>` for every theme you change. It hovers menus, opens a menu and types into search, in light and dark. It flags faint text (from pixels), post-2019 labels, misaligned header items and buttons inside fields. Read the flagged screenshots; a clean first screen is not enough.
- Run focused tests for changes, then `npm run check` once at release readiness.
- Keep logs, test browser profiles, environment files, and working notes out of version control and shipping packages.
- Build and package the exact verified source. Stage an explicit file list; inspect the staged file names and diff before publication.
- Do not delegate routine work. Keep tool output and progress reports focused.
