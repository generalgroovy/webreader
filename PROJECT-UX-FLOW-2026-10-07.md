# Reader playback recovery — 7 October 2026

Baseline: `b050853c253e47cf766062d2f9d902dff75745c6`, clean and matching upstream main at inspection. Candidate branch: `codex/ux-flow-2026-10-07`. Intended live URL: https://generalgroovy.github.io/webreader/. Candidate work is not publication.

Observed friction: in Read view, speech failures were reported in the hidden sidebar while the fixed player returned to Ready to listen. Empty heading filters, excerpts or cleared passages disabled Play with only a generic Select text instruction. The recovery route now stays with the player.

Speech failures preserve the exact reading position and remain visible until retry, a voice change or another explicit playback/selection action. Play retries the same part. Voice settings exits Read view and focuses the voice menu without altering text, selection or position. Empty selections explain their specific cause and offer Read all text; it updates the selection, saves it and focuses Play without autoplay. With no document loaded, Add text opens and focuses the paste input while preserving a saved session and input draft. Only the relevant recovery action is shown.

No speech model, sentence partitioning, Unicode handling, finite repeats, saved format, cancellation guards or URL loading behavior changed. The app has no new runtime dependencies. A CI-only Chromium harness supplies synthetic speech callbacks so failure states can be inspected without sound output.

Owner validation: 45 Node tests passed, including four new recovery tests. They exercise asynchronous and thrown speech failures, retry at the same part, stale callback rejection after recovery, voice focus without queue mutation, headings/excerpt/cleared-selection recovery without autoplay, and Add text preserving saved data/drafts. Browser script syntax and diff checks passed. Independent review, browser CI and root composed-rendering acceptance are separate gates not yet closed at this owner handoff.

Automated synthetic speech verifies UI state and callback behavior, not audible quality or device voice support. Human listening outcomes and physical touch remain outside this evidence.
