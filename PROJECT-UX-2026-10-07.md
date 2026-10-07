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

- Local: `node --test tests/reader.test.cjs` — **40/40 passed**. Five added behavioral regressions cover quiet all-text defaults, passage/full-text/restore transitions, Unicode boundary previews and stale click anchors, explicit cancellation retaining drafts/position, and timeout/late-body/newer-request races. The original Unicode, repeat, speech-race, voice, unavailable-speech and stored-session checks remain.
- `git diff --check` passes. No dependencies, backend or permissions were added.
- Rendered browser verification and independent final diff review are requested from the lead; their findings and candidate CI result will be added before handoff. This document does not claim publication.

## Limits

Browser doubles establish state transitions and exact text, not audible quality or physical touch behavior. Voices and remote webpage access depend on the browser, operating system and source site. The built-in example is synthetic. Human listening and learning outcomes remain untested. Input drafts survive loading actions during this visit; they are not new persistent backups. Saved reading sessions remain browser-local and compatible with the prior format.
