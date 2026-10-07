# Reader clarity pass — 7 October 2026

## Purpose and scope

Make listening to a document feel straightforward, with precise passage study available when wanted. Baseline: clean `ea0fdb47cb799701b5120f3106d7b877583d2ca7` from origin/main. Work is isolated on `codex/ux-clarity-2026-10-07`.

The independent source review identified inconsistent block/paragraph/part labels, weak URL cancellation and a return route from Read view that depended on the page header. The lead's rendered baseline also showed full-document green selection boxes competing with the text. Source inspection confirmed Paste already opened at runtime; the static HTML has now been aligned with that behavior.

## Changes

- New documents use **All text**, with ordinary quiet paragraphs. Clicking text cannot accidentally narrow playback. **Choose a passage** opens the selection tools and focuses their Read control. Existing paragraph selection, exact Unicode excerpts, headings, finite repeats and keyboard seeking remain available.
- Start/end sliders show actual text previews instead of abstract block numbers. The player names all text, a passage, an exact excerpt or headings and shows listening position without duplicated internal units. Selection mode changes discard an unfinished click anchor.
- **Your text** starts with the paste field and **Use this text**; a title is optional and disclosed. The webpage path includes a brief paste fallback.
- **Cancel loading** remains available outside the input disclosure and tabs. Cancellation and the 15-second timeout invalidate request identity before aborting, so even a late response body cannot replace the current document or a newer request. URL, title and paste drafts remain intact; focus returns to the visible input.
- **Text & settings** is reachable in the Read view player as well as the header. Returning focuses the Your text summary. Short screens allow the fixed player to scroll if needed. Existing reduced-motion styling is retained.

## Verification and review

- Local: `node --test tests/reader.test.cjs` — **41/41 passed**. Six added behavioral regressions cover quiet all-text defaults, passage/full-text/restore transitions, Unicode boundary previews and stale click anchors, explicit cancellation retaining drafts/position, timeout/late-body/newer-request races, and legacy saved passages without control settings. The original Unicode, repeat, speech-race, voice, unavailable-speech and stored-session checks remain.
- Owner diff review caught legacy sessions without control settings inheriting the new All text default. Restore now keeps their existing passage; explicit new All text sessions normalize to the full document. The added legacy regression exercises actual playback of the stored passage.
- `git diff --check` passes. No dependencies, backend or permissions were added.
- Lead browser verification through CUA: **1366×900, 390×844, 320×740 and 1366×600**. A synthetic three-paragraph document containing café and 🎸 opened in quiet All text; selecting paragraphs 2–3 reported exactly two paragraphs and the corresponding start/end previews. Read all text restored the full queue. Read view kept a player return route, which focused Your text. No horizontal overflow or blocking short-screen control problem was observed.
- A separate synthetic article server delayed its response by 12 seconds. The browser exposed Cancel, kept it available after switching to Paste, and retained the three-paragraph document and unsubmitted draft after cancellation. The delayed response did not replace the document. Reload and Restore session recovered the document in All text. Screenshots are held by the lead in the shared mission evidence as `reader-after-desktop.png` and `reader-after-mobile.png`.
- Final runtime `e4c9390cd3eeaf64690868599abb1546c2e95cfc`, including the legacy-session guard and 41st check, passed both [candidate CI](https://github.com/generalgroovy/webreader/actions/runs/37599690069) and [main CI](https://github.com/generalgroovy/webreader/actions/runs/37600634545).
- Independent final diff review accepted this runtime, reran all 41 tests and found no blocker. The lead completed rendered acceptance, main promotion and public runtime-byte verification. The shared `ux-2026-10-07/release-status.json` and `reviews/reader-review.md` retain the final acceptance records.

## Limits

Browser doubles establish state transitions and exact text, not audible quality or physical touch behavior. Voices and remote webpage access depend on the browser, operating system and source site. The built-in example is synthetic. Human listening and learning outcomes remain untested. Input drafts survive loading actions during this visit; they are not new persistent backups. Saved reading sessions remain browser-local and compatible with the prior format.
