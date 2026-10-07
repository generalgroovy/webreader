# Reader playback recovery — 7 October 2026

Baseline: `b050853c253e47cf766062d2f9d902dff75745c6`, clean and matching upstream main at inspection. Branch: `codex/ux-flow-2026-10-07`. Published URL: https://generalgroovy.github.io/webreader/.

Observed friction: in Read view, speech failures were reported in the hidden sidebar while the fixed player returned to Ready to listen. Empty heading filters, excerpts or cleared passages disabled Play with only a generic Select text instruction. The recovery route now stays with the player.

Speech failures preserve the exact reading position and remain visible until retry, a voice change or another explicit playback/selection action. Play retries the same part. Voice settings exits Read view and focuses the voice menu without altering text, selection or position. Empty selections explain their specific cause and offer Read all text; it updates the selection, saves it and focuses Play without autoplay. With no document loaded, Add text opens and focuses the paste input while preserving a saved session and input draft. Only the relevant recovery action is shown.

No speech model, sentence partitioning, Unicode handling, finite repeats, saved format, cancellation guards or URL loading behavior changed. The app has no new runtime dependencies. A CI-only Chromium harness supplies synthetic speech callbacks so failure states can be inspected without sound output.

Owner validation: 45 Node tests passed, including four new recovery tests. They exercise asynchronous and thrown speech failures, retry at the same part, stale callback rejection after recovery, voice focus without queue mutation, headings/excerpt/cleared-selection recovery without autoplay, and Add text preserving saved data/drafts. Browser script syntax and diff checks passed.

Runtime `8ec693bc3e0d3c1edc76887912ef46220e069979` passed [CI 37610835334](https://github.com/generalgroovy/webreader/actions/runs/37610835334): 45 behavior tests and Chromium recovery flows at 1366×900, 390×844, 320×740 and 320×420, with no page errors or horizontal overflow. The owner inspected 320×420 and 390×844 synthetic speech-error screenshots: the error, retained 2/3 position and Voice settings action were clear and reachable. Independent reviewer `flow_a` passed source review and 45 tests, inspected the short speech-recovery and desktop empty-selection screenshots, and found no blocker. The review record is `ux-flow-2026-10-07/reviews/webreader-review.md`.

Root CUA acceptance passed the real empty-state recovery flow at 390×844: Add text returned focus to the paste input without replacing saved state; Headings only explained an empty queue; Read all text restored the full queue and focused Play. Root inspected `evidence/reader-recovery-phone.png` and authorized main promotion after these gates closed.

Automated synthetic speech verifies UI state and callback behavior, not audible quality or device voice support. Human listening outcomes and physical touch remain outside this evidence.

Release: main fast-forwarded to `275d38f4154a71ae441df6ba66312c40e2997707` after root authorization. The existing legacy Pages build was explicitly requested because the report-only push did not automatically queue it. [Pages deployment 37612133981](https://github.com/generalgroovy/webreader/actions/runs/37612133981) passed. The public `index.html` matched the reviewed runtime's Git bytes exactly; evidence is `ux-flow-2026-10-07/evidence/webreader-public.json`. Later report-only commits retain that runtime.
