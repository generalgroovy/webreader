# Readable Voice Range Reader

[Open the reader](https://generalgroovy.github.io/webreader/). Read a chosen part of a document aloud using your browser's installed speech voices. The app is a static page with no account or backend.

## Start reading

1. Paste into **Your text**, then **Use this text**, or choose **Try example**. **Add a title** is optional. Successful loading closes the input panel and focuses the document; reopen Your text to change it.
2. Choose a voice and speed, then **Play**. **Pause** keeps the current part and changes Play to **Resume**. **Stop** returns to the beginning. **Replay** starts a finished range again.
3. New text starts in **All text**: clicking or selecting words does not change what plays. **Choose a passage** opens the optional selection tools. Choose its first and last paragraphs, **Highlight exact text**, **Set start and end** with keyboard-friendly sliders and text previews, or read **Headings only**. **Read all text** returns to the full document. Exact excerpts stay selected when you move to the controls.
4. **Read view** focuses the document; **Text & settings** in the player or header returns to setup and focuses Your text. **Previous**, **Next** and the position slider move through the text and stop speech. The slider supports the keyboard's arrows, Home and End. Press Play to continue there.

The player distinguishes all text, a selected passage, exact excerpt, or headings, and shows the listening position and playback state. Only selected passages and the current spoken paragraph receive emphasis. Long sentences are split into listening steps of at most 500 Unicode code points. Heading detection is a heuristic; detected headings count as paragraphs when setting a passage. Changing the selection cancels the old speech before building a new queue.

## Study a passage

Open **Study** to read once, twice, three or five times. Turn on **Pause between sentences** to recall, translate or read along before choosing **Continue**. Very long sentences pause at the shorter listening steps described above. These options combine with any selection, voice and speed. Stop starts the exercise over; seeking or changing the repeat count starts a fresh pass at the current position. Repeats are always finite.

Pitch, volume and gradual speed increase live under **Voice options**. Voice and speed changes apply to the next part; Stop/Play applies them immediately. Voice choices survive delayed or reordered voice lists. If a saved voice is unavailable, the menu says so and uses the browser default until that voice returns or you choose another.

## Load a webpage

In **Your text**, choose **Webpage**, enter an HTTP/HTTPS URL, then **Load webpage**. **Cancel loading** remains available if you switch to Paste text or close the input panel. Cancellation, failure, and the 15-second timeout keep your current document, position and input drafts. Late responses cannot replace your text. Loading a newer document also cancels an older request.

The remote server must permit browser cross-origin requests. Pages requiring sign-in, rendered entirely by JavaScript, or blocked by CORS may not load; paste the relevant text instead. The app does not bypass these restrictions or use a proxy.

## Saved state

The loaded text, range/excerpt, part position, completion state, voice and study controls are saved in this browser. On a later visit choose **Restore session**; changing a control before restoring does not erase the saved text. Restoration keeps old session files compatible and clamps invalid control values. A repeat exercise resumes as a new pass at the saved part, with playback stopped.

Storage is specific to the site/browser, can be cleared by browser settings, and is not a backup or cross-device sync. A visible notice warns when changes cannot be saved; reading still works. Keep the original text. There is no file import/export feature.

## Keyboard

| Key | Action |
|---|---|
| Space | Play or pause |
| Left / Right | Move one part and stop playback |
| Escape | Stop and return to the beginning |

Reading shortcuts leave focused form controls, buttons, links and editable text to their normal keyboard behavior; modified key combinations are also left to the browser. Available voices and speech behavior depend on the operating system and browser. An empty or blocked voice list does not establish that audio will work on another device.

## Run and verify

Serve the repository root with a static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`. No build or package installation is needed. Source, styles and controls are in `index.html`.

With Node.js 18 or newer:

```sh
node --test tests/reader.test.cjs
```

The CI workflow runs these tests for pushes and pull requests. Forty behavioral checks cover quiet all-text reading, passage/keyboard boundaries, finite repeat, step-by-step study, replay, exact repeated-paragraph identity, native excerpt restoration, Unicode and long-text preservation, delayed voices, invalid/blocked storage, URL cancellation/timeout/races, no-speech fallback and cancellation/pause callback races using browser doubles.

For a browser check, paste repeated paragraphs and multilingual text, try Highlight exact text, seek with the keyboard, repeat twice with pauses, reload and restore. `tests/fixtures/article.html` is a short URL-loading fixture with navigation/footer text that should be excluded. Check narrow, short and desktop layouts and the player return from Read view. Verify listening with the actual voice/device you intend to use; automated behavior and visible state checks do not establish audible quality. See [this usability pass](PROJECT-UX-2026-10-07.md) and the [previous quality pass](PROJECT-QUALITY-2026-10-06.md) for bounded evidence.
