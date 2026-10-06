# Reader quality pass — 6 October 2026

## Intended journey and acceptance

Paste text, play it, and know exactly which part is next. Choose a smaller range when needed, then optionally repeat it or pause between parts to recall, translate or read along. Advanced study settings stay closed initially.

Baseline `360b2f0` matches origin/main; checkout was clean. Inspection found English-only sentence boundaries, approximate highlighting that selects the wrong repeated paragraph, inaccessible pointer-only seeking, no replay after completion, voice refresh losing a choice, silent save failures, and URL requests that can replace a newer document.

Acceptance: preserve exact paragraph identity through range/seek/repeat; finite repeat and pause/resume must reject stale speech callbacks; replay after completion; support Unicode and long text; preserve old saved sessions and delayed voice choice; newer document intent wins URL races; truthful save/recovery feedback; readable desktop and 320px controls with native keyboard behavior.

## Evidence

Implemented exact paragraph-associated listening parts, bounded range repeat (1/2/3/5), pause after each part with Continue, completed-range Replay, native keyboard seeking, stored excerpts and stable voice identity. Cancellation rejects old utterance callbacks, including duplicate events and completion during Pause. URL requests carry source identity and abort when a newer document is loaded. Save failures are visible and unavailable speech leaves the document usable.

The document input closes after a successful load/restore, secondary study options stay collapsed, and the short example leads with Play. Desktop setup can scroll independently above the fixed player; narrow screens use a single reading column. The range panel hides irrelevant sliders while highlighting text.

- **Local:** 35 Node behavioral tests pass, including the original 15, a CJK heading regression, and lossless chunking of 250,002 unpunctuated Unicode code points. The long-text splitter scans forward without repeatedly copying the remaining document. `git diff --check` passes. The same regression suite is enforced by `.github/workflows/quality.yml`.
- **Browser, local preview:** CUA at 1366×768, 390×844 and 320×800. Loaded repeated/multilingual text, captured a Japanese excerpt in its actual third block, stepped through two repeats to Replay, sought part 6 with keyboard End, and restored the selected voice and study settings after reload. A short local article loaded without navigation/footer text; a deliberate 404 kept the active document.
- **Responsive:** client/scroll width matched at desktop 1351/1351, phone 375/375 and narrow phone 305/305. At 320px, Play/Pause/Stop were 81×45px, Previous/Next 126×45px. Read view remained reversible. Screenshots: `docs/evidence/reader-desktop.jpg`, `docs/evidence/reader-320.jpg`.
- **Iteration:** browser inspection caught Japanese full-stop/exclamation punctuation being classified as a heading; corrected the heading heuristic. Visible lifecycle checks confirmed Continue/Replay, but do not prove audible quality. Final browser run had no console errors. The deliberately missing URL produced an expected 404 during recovery testing.
- **CI/public:** candidate CI and parent-controlled publication are recorded in the handoff. This document does not claim the candidate is already public.
- **Not established:** actual spoken audio/voice suitability, physical touch-device behavior, unrestricted remote URL access, and learning outcomes. Listening requires a human check on the intended browser/device. No new account, backend or browser permission is required.

## References

- [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) for locale-aware sentence boundaries, with fallback for older browsers.
- [SpeechSynthesis voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event) for delayed and changing voice lists.
