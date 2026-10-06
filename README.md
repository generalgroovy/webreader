# Readable Voice Range Reader

[Open the reader](https://generalgroovy.github.io/webreader/). Read a chosen part of a document aloud using your browser's installed speech voices. The app is a static page with no account or backend.

## Start reading

1. Paste text into **Document**, then **Load Text**, or choose **Try example**. Successful loading closes the input panel and focuses the document; open Document again to change it.
2. Choose a voice and speed, then **Play**. **Pause** keeps the current part and changes Play to **Resume**. **Stop** returns to the beginning. **Replay** starts a finished range again.
3. To hear a smaller passage, click its first and last paragraphs, or open **Range**. There you can set its first/last blocks, choose **Highlight text** for an exact excerpt, or read detected headings inside the range. Excerpts must come from the document; the selected text remains available when you move to the controls.
4. **Read view** focuses the document; **Show controls** brings setup back. **Previous**, **Next** and the position slider move to an exact part and stop speech. The slider supports the keyboard's arrows, Home and End. Press Play to continue there.

The player shows the selected range, exact part and paragraph, and current playback state. Sentences are separated within their original paragraphs; long sentences are split into parts of at most 500 Unicode code points. Heading detection is a heuristic for short blocks, not a semantic document outline. Changing the range cancels the old speech before building a new queue.

## Study a passage

Open **Study** to read the range once, twice, three or five times. Turn on **Pause after each part** to recall, translate or read along before choosing **Continue**. These options combine with any range, voice and speed. Stop starts the exercise over; seeking or changing the repeat count starts a fresh pass at the current position. There is no endless repeat by default or as a hidden setting.

Pitch, volume and gradual speed increase live under **Voice options**. Voice and speed changes apply to the next part; Stop/Play applies them immediately. Voice choices survive delayed or reordered voice lists. If a saved voice is unavailable, the menu says so and uses the browser default until that voice returns or you choose another.

## Load a webpage

Enter an HTTP/HTTPS URL and choose **Load URL**. The remote server must permit browser cross-origin requests. Pages requiring sign-in, rendered entirely by JavaScript, or blocked by CORS may not load; paste the relevant text instead. The app does not bypass these restrictions or use a proxy. Loading times out after 15 seconds; failure keeps the current document. Loading a newer document cancels an older request, including one still reading its response.

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

The CI workflow runs these tests for pushes and pull requests. They cover finite repeat, step-by-step study, replay, exact repeated-paragraph identity, native excerpt restoration, Unicode and long-text preservation, delayed voices, invalid/blocked storage, URL races, no-speech fallback and cancellation/pause callback races using browser doubles.

For a browser check, paste repeated paragraphs and multilingual text, try Highlight text, seek with the keyboard, repeat twice with pauses, reload and restore. `tests/fixtures/article.html` is a short URL-loading fixture with navigation/footer text that should be excluded. Check both narrow-screen and desktop layouts. Verify listening with the actual voice/device you intend to use; automated behavior and visible state checks do not establish audible quality. The bounded release evidence is in [PROJECT-QUALITY-2026-10-06.md](PROJECT-QUALITY-2026-10-06.md).
