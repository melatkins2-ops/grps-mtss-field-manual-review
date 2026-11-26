# GRPS MTSS Field Manual

A working tool for Multi-Tiered System of Supports at Grand Rapids Public Schools. It starts from the situation in front of you, not from chapters.

**Live site:** https://melatkins2-ops.github.io/grps-mtss-field-manual-review/

## How it's organized

| Page | What it's for |
|---|---|
| **Start** | Four situations: a scholar concern, a schoolwide pattern, a plan review, a meeting. Each asks a few quick questions and gives a first move. Search across everything. |
| **Supports** | All 84 GRPS supports (59 academic, 25 attendance/behavior/SEL/cross-domain) in one filterable list. Any support can be added to a plan. |
| **Plan** | The intervention plan builder: six sections, a live readiness check against the GRPS Plan Standard, an action-vs-intervention warning, and a one-page printout. |
| **Meetings** | Who should own the problem, what to bring and leave with, and a printable decision record. |
| **Guide** | The reference: framework, eight rules, process, who solves what, tiers, evidence, fidelity, families, grade spans, roles, academic core, examples, sources. |

Plans and decision records are saved only in the user's browser (`localStorage`). Nothing is sent anywhere. Staff are asked to use initials, not full names.

## Files

- `index.html`: page structure and all Guide text
- `assets/data.js`: **edit here** to change supports or school support staff
- `assets/app.js`: routing, guided flows, plan builder, printing
- `assets/styles.css`, `assets/fonts/`: design (Source Serif 4 and Public Sans, self-hosted)

## Updating the site

Edit the files on a branch and open a pull request. GitHub Pages publishes `main` automatically, usually within a minute or two of a merge. When staffing changes, update `MTSS_SCHOOLS` in `assets/data.js`.

## Automated site check

Every pull request and every push to `main` runs **Site check** (`.github/workflows/site-check.yml`). It opens the site in a headless browser at desktop (1366px) and phone (390px) widths and fails if the page throws a JavaScript error, a local file is missing, or the page scrolls sideways.

Maintained by GRPS Community & Student Affairs.
