// CI-only composed-browser check. Speech is synthetic; no audible acceptance is claimed.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('.');
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    response.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript'})[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch();
const results = [];
await mkdir('test-results', { recursive: true });
try {
  for (const [width,height] of [[1366,900],[390,844],[320,740],[320,420]]) {
    const context = await browser.newContext({ viewport:{width,height}, reducedMotion:'reduce' });
    await context.addInitScript(() => {
      const speech = { queue:[], paused:false, getVoices:()=>[], cancel(){}, resume(){this.paused=false;}, pause(){this.paused=true;}, speak(utterance){this.queue.push(utterance);} };
      Object.defineProperty(window, 'speechSynthesis', { value:speech });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value:class { constructor(text){this.text=text;} } });
      window.testSpeech = speech;
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.getByLabel('Text to read').fill('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
    await page.getByRole('button',{name:'Use this text',exact:true}).click();
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('button',{name:'Read view',exact:true}).click();
    await page.getByRole('button',{name:'Play',exact:true}).click();
    await page.evaluate(() => window.testSpeech.queue.at(-1).onerror());
    assert.match(await page.locator('#playbackState').innerText(), /Speech failed\. Your position is kept/);
    assert.equal(await page.locator('#readerSettings').isVisible(),false);
    assert.equal(await page.locator('#playbackRecovery').innerText(),'Voice settings');
    await page.locator('#playbackRecovery').scrollIntoViewIfNeeded();
    const recoveryBox = await page.locator('#playbackRecovery').boundingBox();
    assert.ok(recoveryBox.y >= 0 && recoveryBox.y + recoveryBox.height <= height, 'failure recovery is inside the viewport');
    await page.screenshot({path:`test-results/${width}x${height}-speech-recovery.png`});
    await page.getByRole('button',{name:'Voice settings',exact:true}).click();
    assert.equal(await page.locator('#voiceSelect').evaluate(el => el === document.activeElement),true);
    assert.equal(await page.evaluate(() => state.currentSentenceIndex),1);
    await page.getByRole('button',{name:'Play',exact:true}).click();
    assert.equal(await page.evaluate(() => window.testSpeech.queue.at(-1).text),'Second paragraph.');
    assert.equal(await page.locator('#playbackRecovery').isVisible(),false);
    await page.getByRole('button',{name:'Stop',exact:true}).click();
    await page.getByRole('button',{name:'Choose a passage',exact:true}).click();
    await page.getByLabel('Read',{exact:true}).selectOption('headings');
    await page.getByRole('button',{name:'Read view',exact:true}).click();
    assert.match(await page.locator('#playbackState').innerText(), /No headings in this passage/);
    assert.equal(await page.getByRole('button',{name:'Play',exact:true}).isDisabled(),true);
    await page.locator('#playbackRecovery').scrollIntoViewIfNeeded();
    await page.screenshot({path:`test-results/${width}x${height}-empty-selection.png`});
    await page.locator('#playbackRecovery').click();
    assert.equal(await page.locator('#playBtn').evaluate(el => el === document.activeElement),true);
    assert.equal(await page.evaluate(() => state.sentences.length),3);
    assert.equal(await page.evaluate(() => state.isReading),false);
    assert.equal(await page.locator('#rangeInfo').innerText(),'All text');
    const saved = await page.evaluate(() => localStorage.getItem(STORAGE_KEY));
    await page.reload();
    await page.getByRole('button',{name:'Read view',exact:true}).click();
    await page.getByRole('button',{name:'Add text',exact:true}).click();
    assert.equal(await page.getByLabel('Text to read').evaluate(el => el === document.activeElement),true);
    assert.equal(await page.evaluate(() => localStorage.getItem(STORAGE_KEY)),saved);
    const metrics = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.equal(metrics.width,metrics.scroll);
    assert.deepEqual(errors,[]);
    results.push({width,height,passed:true,metrics,errors,speech:'synthetic'});
    await context.close();
  }
  await writeFile('test-results/results.json',JSON.stringify(results,null,2));
} finally { await browser.close(); server.close(); }
