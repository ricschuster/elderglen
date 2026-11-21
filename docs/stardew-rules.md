# Stardew reference rules

Moved out of `CLAUDE.md`. Read before asking the owner a Stardew question, adding a
checks row, or using the saved wiki pages or the Guidebook.

- Stardew checks register: `docs/design/54_stardew_checks.md` lists every
  Stardew claim that is from memory or unchecked, with how to check it (owner
  plays, saved wiki page, Guidebook). Add a row when a note makes such a claim.
  What matters is what we want for Elderglen, not what Stardew does. Ask the
  owner a Stardew fact question only when a decision hinges on it: a behaviour
  players of the genre will assume, or a number or rule we chose to copy. Close
  every other row as "ours, on purpose", and do not offer a question batch just
  because rows are open. Black box only: never reverse engineer Stardew (ADR 0002).
- Stardew wiki pages: the wiki blocks Claude's crawler, so never fetch it (no WebFetch,
  curl, Playwright). Write page URLs, one per line, to
  `docs/reference/stardew/urls_<topic>.txt`; the owner saves each page there by hand.
  Read the saved files, then delete the list. Reference only, never copied into the repo
  (ADR 0002).
- Stardew Valley Guidebook: the owner's PDF in `docs/reference/stardew/` is the free
  supplement only; the wiki stays the main source. Read on demand with
  `pdftotext -layout -f <page> -l <page>`, check table numbers against the page image,
  flag conflicts with the wiki, cite by printed page, never quote. Do not build an
  extraction pipeline.
