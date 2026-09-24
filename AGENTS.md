# Working on net19

- This directory is the repository root. Verify `git rev-parse --show-toplevel` before status/staging; never operate on the unrelated parent repository.
- Use `src/` and `static/` as the source of truth. Build into `dist/extension/`; do not hand-edit generated JavaScript.
- Keep reveal timing, no-late-activation, document-ID targeting, archive-only networking, origin-only disclosure, and local cache bounds intact.
- Archive content is untrusted data. Never execute archived scripts, import arbitrary CSS selectors or assets, or add a live-page message bridge.
- Run focused tests for changes, then `npm run check` once at release readiness. Use a real Chromium extension test for timing and lifecycle changes.
- Live archive failures are an external availability signal, not a passing historical-style test. Record them honestly; never replace a failed probe with a fixture while calling it live.
- Keep logs, test browser profiles, archive downloads, environment files, and working notes out of version control and shipping packages.
- Build and package the exact verified source. Stage an explicit file list; inspect the staged file names and diff before publication.
- Do not delegate routine work. Keep tool output and progress reports focused.
