# Readable Voice Range Reader

[Open the reader](https://generalgroovy.github.io/webreader/). Read a chosen part of a document aloud using your browser's installed speech voices. The app is a static page with no account or backend.

## Start reading

1. **Paste** is selected initially; enter a title and text, then **Load Text**. **Load Demo** provides a sample.
2. Open **Range** to select the range: click its first and last paragraphs, use the start/end sliders, highlight text in **Native text selection** mode, or choose **Skim mode** for detected headings.
3. Choose a voice and speed, then **Play**. Pitch, volume and speed ramp live under **Voice options**. **Pause** preserves the current utterance and changes Play to **Resume**; **Stop** returns to the beginning of the selected range.
4. **Read view** hides setup controls and focuses the document; **Show controls** restores them. **Previous**, **Next** and the progress bar move the reading position and stop playback. Press **Play** to continue from there.

Changing the selected text stops the old speech before building the new sentence queue. Headings are detected heuristically from short blocks; they are not a semantic document outline.

## Load a webpage

Enter a URL and choose **Load URL**. The remote server must permit browser cross-origin requests. Pages requiring sign-in, rendered entirely by JavaScript, or blocked by CORS may not load; paste the relevant text instead. The app does not bypass these restrictions or use a proxy.

## Saved state

The loaded text, block range, sentence position and speech controls are saved to this browser's local storage. On a later visit choose **Restore session**; changing a control before restoring will not erase the saved text. Storage is specific to the site/browser, can be cleared by browser settings, and is not a backup or cross-device sync. Reading remains available when storage is blocked or full, but persistence is then unavailable. There is no file import/export feature.

## Keyboard

| Key | Action |
|---|---|
| Space | Play or pause |
| Left / Right | Move one sentence and stop playback |
| Escape | Stop and return to the beginning |

Reading shortcuts leave focused form controls, buttons, links and editable text to their normal keyboard behavior; modified key combinations are also left to the browser. Available voices and speech behavior depend on the operating system and browser. An empty or blocked voice list does not establish that audio will work on another device.

## Run and verify

Serve the repository root with a static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`. No build or package installation is needed. Source, styles and controls are in `index.html`.

With Node.js 18 or newer:

```sh
node --test tests/reader.test.cjs
```

Tests cover reversible reading focus, playback action states, session restoration, storage failure, range changes and cancellation callbacks using browser doubles. For a real-browser check, paste two paragraphs, play/pause/stop, select another range, reload, and restore with Restore session. Verify listening with the actual voice/device you intend to use; the automated suite cannot establish audible quality.
