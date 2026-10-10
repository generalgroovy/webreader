const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const html = readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const key = 'readableVoiceRangeReader.session.v1';
const saved = { title: 'My document', source: 'Pasted text', blocks: [{type:'p',text:'First sentence. Second sentence.'}], startBlock:0,endBlock:0,currentSentenceIndex:1,controls:{rate:'1.2',pitch:'1',volume:'0',mode:'paragraph'} };

function reader(payload, blocked = false, overrides = {}) {
  const storage = new Map(payload ? [[key, JSON.stringify(payload)]] : []);
  const elements = new Map();
  const create = () => {
    const classes=new Set();
    return { value:'1', checked:false, style:{}, dataset:{}, children:[], textContent:'',
      set className(value){classes.clear();value.split(' ').forEach(c=>classes.add(c));},
      set innerHTML(value){this.children=[];},
      classList:{add(c){classes.add(c);},remove(c){classes.delete(c);},contains(c){return classes.has(c);},toggle(c,v){if(v??!classes.has(c))classes.add(c);else classes.delete(c);}},
      setAttribute(k,v){this[k]=v;}, focus(){this.focused=true;}, addEventListener(type, fn){this[type]=fn;},
      appendChild(node){this.children.push(node);},querySelectorAll(selector){return this.children.filter(node=>node.classList.contains(selector.slice(1)));},scrollIntoView(){} };
  };
  const speech = {speaking:false,paused:false,queue:[],resumeCalls:0,getVoices:()=>[],cancel(){},speak(u){this.queue.push(u);},resume(){this.paused=false;this.resumeCalls++;},pause(){this.paused=true;}};
  const context = vm.createContext({ document:{ body:{classList:create().classList},getElementById(id){ if(!elements.has(id))elements.set(id,create()); return elements.get(id);},createElement:create,addEventListener(type, fn){this[type]=fn;} },
    speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text;},
    localStorage:{getItem(k){if(blocked)throw Error('blocked');return storage.get(k);},setItem(k,v){if(blocked)throw Error('full');storage.set(k,v);}},
    window:{getSelection:()=>({toString:()=>''})},console,URL,AbortController,setTimeout,clearTimeout,...overrides });
  elements.set('selectionMode', {...create(),value:'paragraph'});
  vm.runInContext(script, context);
  return {context,storage,elements,speech,run:code=>vm.runInContext(code,context)};
}

test('startup preserves the saved document and Resume restores position and muted volume',()=>{
  const app=reader(saved);
  assert.deepEqual(JSON.parse(app.storage.get(key)),saved);
  app.run('resumeSession()');
  assert.equal(app.elements.get('articleTitle').textContent,'My document');
  assert.equal(app.run('state.currentSentenceIndex'),1);
  assert.equal(app.elements.get('volumeRange').value,'0');
  assert.equal(JSON.parse(app.storage.get(key)).currentSentenceIndex,1);
});
test('blocked storage still loads and reads the demo',()=>{
  const app=reader(null,true);
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
  app.run('playReading()');
  assert.ok(app.speech.queue.length);
});
test('callbacks from cancelled speech cannot advance or cancel the new reading',()=>{
  const app=reader();
  app.run('playReading()');
  const stale=app.speech.queue.at(-1);
  app.run('playReading()');
  const count=app.speech.queue.length;
  stale.onend();
  stale.onerror();
  assert.equal(app.speech.queue.length,count);
  assert.equal(app.run('state.currentSentenceIndex'),0);
  assert.equal(app.run('state.isReading'),true);
});
test('loading another document stops active speech before replacing its sentence queue',()=>{
  const app=reader();
  app.run('playReading()');
  const stale=app.speech.queue.at(-1);
  app.run("renderDocument('Replacement', [{type:'p',text:'New content.'}])");
  stale.onend();
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.run('state.currentSentenceIndex'),0);
});
test('changing a control before Resume cannot erase the stored document',()=>{
  const app=reader(saved);
  app.elements.get('rateRange').value='1.5';
  app.elements.get('rateRange').input();
  assert.deepEqual(JSON.parse(app.storage.get(key)),saved);
});
test('selecting a different range stops speech and ignores the old completion callback',()=>{
  const app=reader();
  app.run('playReading()');
  const stale=app.speech.queue.at(-1);
  app.run("els.selectionMode.value='slider';state.startBlock=2; state.endBlock=2; rebuildSentences()");
  stale.onend();
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.run('state.currentSentenceIndex'),0);
});
test('malformed restore is rejected without replacing the active document',()=>{
  const app=reader();
  app.storage.set(key,JSON.stringify({blocks:[null]}));
  app.run('resumeSession()');
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
  assert.match(app.elements.get('status').textContent,/could not be restored/);
});
test('restored ranges and sentence positions stay within the document',()=>{
  const app=reader({...saved,startBlock:-50,endBlock:999,currentSentenceIndex:999});
  app.run('resumeSession()');
  assert.equal(app.run('state.startBlock'),0);
  assert.equal(app.run('state.endBlock'),0);
  assert.equal(app.run('state.currentSentenceIndex'),1);
});

test('legacy sessions without control settings retain their chosen passage',()=>{
  const app=reader({title:'Legacy text',blocks:[{type:'p',text:'Do not read this.'},{type:'p',text:'Saved passage.'}],startBlock:1,endBlock:1,currentSentenceIndex:0});
  app.run('resumeSession();playReading()');
  assert.equal(app.speech.queue.at(-1).text,'Saved passage.');
  assert.equal(app.elements.get('rangeInfo').textContent,'Selected passage · 1 paragraph');
});
test('changing range while paused resumes the engine and submits a new utterance',()=>{
  const app=reader();app.run('playReading()');app.speech.speaking=true;
  app.run('pauseReading()');assert.equal(app.speech.paused,true);
  app.run("els.selectionMode.value='slider';state.startBlock=2;state.endBlock=2;rebuildSentences();playReading()");
  assert.equal(app.speech.paused,false);assert.equal(app.speech.resumeCalls,1);
  assert.equal(app.speech.queue.length,2);
  assert.match(app.speech.queue.at(-1).text,/Choose a passage/);
});
test('Stop while paused starts a fresh queue on the next Play',()=>{
  const app=reader();app.run('playReading()');app.speech.speaking=true;
  app.run('pauseReading();stopReading();playReading()');
  assert.equal(app.speech.paused,false);assert.equal(app.speech.queue.length,2);
  assert.equal(app.run('state.isReading'),true);
});
test('Pause then Play without changing range resumes the existing queue',()=>{
  const app=reader();app.run('playReading()');app.speech.speaking=true;
  app.run('pauseReading();playReading()');
  assert.equal(app.speech.paused,false);assert.equal(app.speech.queue.length,1);
  assert.equal(app.run('state.isPaused'),false);
});
test('Play on an empty selection does not mark the reader as active',()=>{
  const app=reader();app.elements.get('clearSelectionBtn').click();app.run('playReading()');
  assert.equal(app.run('state.isReading'),false);assert.equal(app.speech.queue.length,0);
});

test('speech failure stays visible in Read view and voice recovery preserves passage and position',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'p',text:'First. Second.'}]);seekPart(1);setReaderFocus(true);playReading()");
  const failed=app.speech.queue.at(-1);
  failed.onerror();
  assert.match(app.elements.get('playbackState').textContent,/Speech failed\. Your position is kept/);
  assert.equal(app.elements.get('playbackRecovery').textContent,'Voice settings');
  assert.equal(app.elements.get('playbackRecovery').classList.contains('hidden'),false);
  assert.equal(app.run('state.currentSentenceIndex'),1);
  assert.equal(app.elements.get('playBtn').disabled,false);
  const queue=app.run('JSON.stringify(state.sentences)');
  app.elements.get('playbackRecovery').click();
  assert.equal(app.context.document.body.classList.contains('reading-focus'),false);
  assert.equal(app.elements.get('voiceSelect').focused,true);
  assert.equal(app.run('JSON.stringify(state.sentences)'),queue);
  assert.equal(app.run('state.currentSentenceIndex'),1);
  assert.equal(app.speech.queue.length,1);
  app.elements.get('voiceSelect').value='new-voice';app.elements.get('voiceSelect').change();
  assert.equal(app.elements.get('playbackRecovery').classList.contains('hidden'),true);
  app.run('playReading()');
  assert.equal(app.speech.queue.at(-1).text,'Second.');
  failed.onerror();
  assert.equal(app.run('state.isReading'),true);
  assert.doesNotMatch(app.elements.get('playbackState').textContent,/failed/);
});

test('Play retries a thrown speech failure at the same part and later Stop clears its recovery',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'p',text:'First. Second.'}]);seekPart(1)");
  const speak=app.speech.speak;
  app.speech.speak=()=>{throw Error('speech engine unavailable');};
  app.run('playReading()');
  assert.match(app.elements.get('playbackState').textContent,/Speech failed/);
  app.speech.speak=speak;
  app.run('playReading()');
  assert.equal(app.speech.queue.at(-1).text,'Second.');
  assert.equal(app.elements.get('playbackRecovery').classList.contains('hidden'),true);
  app.speech.queue.at(-1).onerror();
  app.run('stopReading()');
  assert.equal(app.elements.get('playbackRecovery').classList.contains('hidden'),true);
  assert.equal(app.run('state.currentSentenceIndex'),0);
});

test('empty headings, excerpt and cleared passage give a player route back to all text without autoplay',()=>{
  for(const mode of ['headings','text','paragraph']) {
    const app=reader();
    app.run("renderDocument('Plain',[{type:'p',text:'First.'},{type:'p',text:'Second.'}])");
    app.elements.get('selectionMode').value=mode;app.elements.get('selectionMode').change();
    if(mode==='paragraph')app.elements.get('clearSelectionBtn').click();
    app.run('setReaderFocus(true)');
    assert.equal(app.elements.get('playBtn').disabled,true);
    assert.match(app.elements.get('playbackState').textContent,mode==='headings'?/No headings/:mode==='text'?/No excerpt/:/No passage/);
    assert.equal(app.elements.get('playbackRecovery').textContent,'Read all text');
    app.elements.get('playbackRecovery').click();
    assert.equal(app.elements.get('selectionMode').value,'all');
    assert.equal(app.elements.get('playBtn').focused,true);
    assert.equal(app.run('state.sentences.join(" ")'),'First. Second.');
    assert.equal(app.speech.queue.length,0);
    assert.equal(app.elements.get('playbackRecovery').classList.contains('hidden'),true);
    assert.equal(JSON.parse(app.storage.get(key)).controls.mode,'all');
    assert.equal(app.context.document.body.classList.contains('reading-focus'),true);
  }
});

test('Add text exits an empty Read view without replacing the saved session or draft',()=>{
  const app=reader(saved);
  app.elements.get('pasteInput').value='My unfinished draft.';
  app.run('setReaderFocus(true)');
  assert.equal(app.elements.get('playbackRecovery').textContent,'Add text');
  app.elements.get('playbackRecovery').click();
  assert.equal(app.elements.get('documentTools').open,true);
  assert.equal(app.elements.get('pasteInput').focused,true);
  assert.equal(app.elements.get('pasteInput').value,'My unfinished draft.');
  assert.deepEqual(JSON.parse(app.storage.get(key)),saved);
  assert.equal(app.run('state.blocks.length'),0);
});

test('playback labels and disabled actions follow pause, resume, and stop',()=>{
  const app=reader();
  app.run('playReading()');app.speech.speaking=true;
  assert.equal(app.elements.get('pauseBtn').disabled,false);
  app.run('pauseReading()');
  assert.equal(app.elements.get('playBtn').textContent,'Resume');
  assert.equal(app.elements.get('pauseBtn').disabled,true);
  app.run('playReading()');
  assert.equal(app.elements.get('playBtn').textContent,'Play');
  app.run('stopReading()');
  assert.equal(app.elements.get('pauseBtn').disabled,true);
  assert.equal(app.elements.get('stopBtn').disabled,true);
});

test('read view preserves the document and exposes a reversible controls action',()=>{
  const app=reader(),classes=new Set();let focused=0;
  app.context.document.body={classList:{toggle(k,v){if(v)classes.add(k);else classes.delete(k);}}};
  app.elements.get('focusReader').setAttribute=function(k,v){this[k]=v;};
  app.elements.get('articleTitle').focus=()=>focused++;
  const title=app.elements.get('articleTitle').textContent;
  app.run('setReaderFocus(true)');
  assert.ok(classes.has('reading-focus'));assert.equal(focused,1);
  assert.equal(app.elements.get('focusReader').textContent,'Text & settings');
  app.elements.get('returnSettingsBtn').click();
  assert.equal(classes.has('reading-focus'),false);
  assert.equal(app.elements.get('documentSummary').focused,true);
  assert.equal(app.elements.get('articleTitle').textContent,title);
});


test('reader shortcuts leave focused controls, editors and modified keys to the browser',()=>{
  const app=reader();
  for(const active of [{tagName:'BUTTON'},{tagName:'A'},{tagName:'SUMMARY'},{tagName:'DIV',isContentEditable:true}]){
    app.context.document.activeElement=active;
    app.context.document.keydown({code:'Space',preventDefault(){throw Error('Control activation was intercepted');}});
  }
  app.context.document.activeElement={tagName:'BODY'};
  app.context.document.keydown({code:'Space',ctrlKey:true,preventDefault(){throw Error('Modified shortcut was intercepted');}});
  assert.equal(app.speech.queue.length,0);
  let prevented=false;
  app.context.document.keydown({code:'Space',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(app.speech.queue.length,1);
});

test('repeat finishes exactly the requested number of passes, then Replay starts again',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'p',text:'One. Two.'}]);els.repeatCount.value='3';playReading()");
  for(let i=0;i<6;i++) app.speech.queue.at(-1).onend();
  assert.deepEqual(app.speech.queue.map(u=>u.text),['One.','Two.','One.','Two.','One.','Two.']);
  assert.equal(app.run('state.completed'),true);
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.elements.get('playBtn').textContent,'Replay');
  app.run('playReading()');
  assert.equal(app.speech.queue.at(-1).text,'One.');
  assert.equal(app.run('state.cycle'),1);
});

test('pause after each part waits for Continue, including between repeats, without repeating completed callbacks',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'p',text:'One. Two.'}]);els.repeatCount.value='2';els.pauseBetween.checked=true;playReading()");
  const first=app.speech.queue.at(-1);
  first.onend();first.onend();first.onerror();
  assert.equal(app.speech.queue.length,1);
  assert.equal(app.elements.get('playBtn').textContent,'Continue');
  assert.equal(app.run('state.currentSentenceIndex'),1);
  app.run('playReading()');app.speech.queue.at(-1).onend();
  assert.equal(app.run('state.cycle'),2);
  assert.equal(app.run('state.waitingForNext'),true);
  app.run('stopReading();playReading()');
  assert.equal(app.run('state.cycle'),1);
  assert.equal(app.speech.queue.at(-1).text,'One.');
});

test('an end callback racing Pause advances once on Resume and a late onstart cannot unpause',()=>{
  const app=reader();app.run("renderDocument('Study',[{type:'p',text:'One. Two.'}]);playReading();pauseReading()");
  const first=app.speech.queue.at(-1);first.onstart();first.onend();
  assert.equal(app.run('state.isPaused'),true);
  assert.equal(app.speech.queue.length,1);
  app.run('playReading()');
  assert.equal(app.speech.queue.length,2);
  assert.equal(app.speech.queue.at(-1).text,'Two.');
  first.onend();first.onerror();
  assert.equal(app.run('state.isReading'),true);
  assert.equal(app.run('state.currentSentenceIndex'),1);
});

test('Stop invalidates a pending paused completion rather than resurrecting it',()=>{
  const app=reader();app.run('playReading();pauseReading()');
  const first=app.speech.queue.at(-1);first.onend();
  app.run('stopReading()');first.onend();
  assert.equal(app.run('state.pendingEnd'),null);
  assert.equal(app.run('state.currentSentenceIndex'),0);
  assert.equal(app.run('state.isReading'),false);
});

test('identical paragraphs use exact block identity when selecting and highlighting',()=>{
  const app=reader();app.run("renderDocument('Repeat',[{type:'p',text:'Same text.'},{type:'p',text:'Same text.'}]);els.selectionMode.value='paragraph';handleBlockClick(0);playReading()");
  const stale=app.speech.queue.at(-1);
  app.run('state.selectionAnchor=null;handleBlockClick(1)');
  stale.onend();assert.equal(app.run('state.isReading'),false);
  app.run('playReading()');app.speech.queue.at(-1).onstart();
  const blocks=app.elements.get('content').children;
  assert.equal(blocks[0].classList.contains('current-sentence'),false);
  assert.equal(blocks[1].classList.contains('current-sentence'),true);
});

test('native position input stops playback at an exact part and resets study count',()=>{
  const app=reader();app.run("renderDocument('Study',[{type:'p',text:'One. Two. Three.'}]);playReading();state.cycle=3");
  const stale=app.speech.queue.at(-1);
  app.elements.get('progress').value='2';app.elements.get('progress').input();stale.onend();
  assert.equal(app.run('state.currentSentenceIndex'),2);
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.run('state.cycle'),1);
  assert.equal(app.elements.get('progress')['aria-valuetext'],'Reading position 3 of 3');
  app.run('playReading()');assert.equal(app.speech.queue.at(-1).text,'Three.');
});

test('Unicode sentence segmentation and long unpunctuated text preserve every non-space character',()=>{
  const app=reader();
  const text='こんにちは。世界！ Привет. До свидания. '+('😀カタカナ café '.repeat(250));
  app.context.sample=text;
  const parts=Array.from(app.run('sentenceSplit(sample)'));
  assert.ok(parts.length>4);
  assert.equal(parts.join('').replace(/\s/g,''),text.replace(/\s/g,''));
  assert.ok(parts.every(part=>Array.from(part).length<=500));
  assert.ok(parts.every(part=>!/[\uD800-\uDBFF]$/.test(part)));
});

test('sentence fallback preserves text on older engines without Intl.Segmenter',()=>{
  const app=reader(null,false,{Intl:{}});
  assert.deepEqual(Array.from(app.run("sentenceSplit('bonjour. salut! 你好。再见。')")),['bonjour.','salut!','你好。','再见。']);
});

test('CJK terminal punctuation stays paragraph text and is excluded from headings-only playback',()=>{
  const app=reader();
  app.run("renderDocument('Japanese',splitIntoBlocks('見出し\\n\\nこんにちは。\\n\\n世界！\\n\\n本当？'));els.selectionMode.value='headings';rebuildSentences()");
  assert.deepEqual(Array.from(app.run('state.blocks.map(block=>block.type)')),['h2','p','p','p']);
  assert.deepEqual(Array.from(app.run('state.sentences')),['見出し']);
});

test('large unpunctuated text becomes bounded parts without losing its tail',()=>{
  const app=reader();app.context.longText='x'.repeat(250001)+'😀';
  const parts=Array.from(app.run('sentenceSplit(longText)'));
  assert.equal(parts.length,501);
  assert.equal(parts.join(''),app.context.longText);
  assert.equal(parts.at(-1),'x😀');
});

test('headings respect the chosen range and Clear does not rebuild a hidden queue',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'h2',text:'First'},{type:'p',text:'Body.'},{type:'h2',text:'Last'}]);els.selectionMode.value='headings';state.startBlock=2;state.endBlock=2;rebuildSentences()");
  assert.deepEqual(Array.from(app.run('state.sentences')),['Last']);
  app.elements.get('clearSelectionBtn').click();app.run('playReading()');
  assert.equal(app.speech.queue.length,0);
  assert.equal(app.elements.get('playBtn').disabled,true);
});

test('empty native selection stays empty; captured excerpts restore without reading unrelated text',()=>{
  const app=reader();
  app.run("renderDocument('Study',[{type:'p',text:'First sentence.'},{type:'p',text:'Second sentence.'}]);els.selectionMode.value='text';rebuildSentences();playReading()");
  assert.equal(app.speech.queue.length,0);
  app.run("state.nativeParts=[{text:'Second',block:1}];state.nativeText='Second';rebuildSentences();saveSession()");
  const restored=reader(JSON.parse(app.storage.get(key)));restored.run('resumeSession();playReading()');
  assert.equal(restored.speech.queue.at(-1).text,'Second');
  assert.equal(restored.run('state.sentenceBlocks[0]'),1);
  restored.elements.get('selectAllBtn').click();
  assert.equal(restored.elements.get('selectionMode').value,'all');
  assert.equal(restored.run('state.sentences.length'),2);
});

test('chosen voice survives delayed and reordered voice lists and session restoration',()=>{
  const app=reader();const english={name:'English',lang:'en',voiceURI:'en'},japanese={name:'Japanese',lang:'ja',voiceURI:'ja'};
  app.speech.getVoices=()=>[english,japanese];app.run('populateVoices()');
  app.elements.get('voiceSelect').value='ja|ja';app.elements.get('voiceSelect').change();
  app.speech.getVoices=()=>[japanese,english];app.speech.onvoiceschanged();
  assert.equal(app.elements.get('voiceSelect').value,'ja|ja');
  app.run('playReading()');assert.equal(app.speech.queue.at(-1).voice,japanese);
  const restored=reader(JSON.parse(app.storage.get(key)));restored.run('resumeSession()');
  assert.equal(restored.elements.get('voiceSelect').value,'ja|ja');
  restored.speech.getVoices=()=>[japanese];restored.speech.onvoiceschanged();restored.run('playReading()');
  assert.equal(restored.speech.queue.at(-1).voice,japanese);
});

test('completed sessions restore as Replay; invalid saved controls use bounded defaults',()=>{
  const app=reader({...saved,completed:true,controls:{rate:'NaN',pitch:500,volume:0,mode:'invalid',repeat:99}});
  app.run('resumeSession()');
  assert.equal(app.elements.get('rateRange').value,'1');
  assert.equal(app.elements.get('pitchRange').value,'2');
  assert.equal(app.elements.get('volumeRange').value,'0');
  assert.equal(app.elements.get('repeatCount').value,'1');
  assert.equal(app.elements.get('playBtn').textContent,'Replay');
  app.run('playReading()');assert.equal(app.speech.queue.at(-1).text,'First sentence.');
});

test('storage failure is visible while keeping the current readable text',()=>{
  const app=reader(null,true);app.run("renderDocument('Keep this',[{type:'p',text:'Important text.'}]);playReading()");
  assert.match(app.elements.get('storageStatus').textContent,/not saved/);
  assert.equal(app.elements.get('articleTitle').textContent,'Keep this');
  assert.equal(app.speech.queue.at(-1).text,'Important text.');
});

test('browsers without speech still load text and expose an accurate unavailable state',()=>{
  const app=reader(null,false,{speechSynthesis:undefined,SpeechSynthesisUtterance:undefined});
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
  assert.equal(app.elements.get('playBtn').disabled,true);
  assert.match(app.elements.get('playbackState').textContent,/unavailable/);
});

test('synchronous speech failure preserves position and makes Play available again',()=>{
  const app=reader();app.speech.speak=()=>{throw Error('blocked');};app.run('skipSentence(1);playReading()');
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.run('state.currentSentenceIndex'),1);
  assert.equal(app.elements.get('playBtn').disabled,false);
  assert.match(app.elements.get('status').textContent,/position is kept/);
});

test('an old URL response cannot replace a newer pasted document or its status',async()=>{
  let resolve;const app=reader(null,false,{fetch:()=>new Promise(r=>{resolve=r;})});
  app.elements.get('urlInput').value='https://example.com/old';const pending=app.run('loadUrl()');
  app.run("renderDocument('New document',[{type:'p',text:'Keep me.'}])");
  resolve({ok:true,text:async()=>'<article>Old text</article>'});await pending;
  assert.equal(app.elements.get('articleTitle').textContent,'New document');
  assert.equal(app.elements.get('loadUrlBtn').disabled,false);
  assert.equal(app.elements.get('status').textContent,'Your text is ready. Press Play to listen.');
});

test('a second URL load invalidates the first even while its text response is pending',async()=>{
  let resolveText;let calls=0;
  const app=reader(null,false,{fetch:async()=>++calls===1?{ok:true,text:()=>new Promise(r=>{resolveText=r;})}:{ok:false}});
  app.elements.get('urlInput').value='https://example.com/old';const first=app.run('loadUrl()');
  await Promise.resolve();
  app.elements.get('urlInput').value='https://example.com/new';await app.run('loadUrl()');
  const status=app.elements.get('status').textContent;
  resolveText('Old content');await first;
  assert.equal(app.elements.get('status').textContent,status);
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
});

test('non-web URL protocols are rejected before any fetch',async()=>{
  const app=reader(null,false,{fetch:()=>{throw Error('must not fetch');}});
  app.elements.get('urlInput').value='file:///secret';await app.run('loadUrl()');
  assert.match(app.elements.get('status').textContent,/http or https/);
});

test('new documents open as quiet All text and paragraph clicks cannot change that selection',()=>{
  const app=reader();
  assert.equal(app.elements.get('pasteTab')['aria-pressed'],'true');
  assert.equal(app.elements.get('selectionMode').value,'all');
  assert.equal(app.elements.get('rangeInfo').textContent,'All text');
  assert.equal(app.elements.get('content').children.some(node=>node.classList.contains('selected-range')),false);
  const queue=app.run('state.queueKey');
  app.run('handleBlockClick(2)');
  assert.equal(app.run('state.queueKey'),queue);
  assert.equal(app.run('state.selectionAnchor'),null);
  app.run("els.selectionMode.value='headings';renderDocument('New',[{type:'p',text:'Keep every word.'}]);playReading()");
  assert.equal(app.speech.queue.at(-1).text,'Keep every word.');
});

test('Choose a passage exposes the selection control and Read all text restores a full quiet queue',()=>{
  const app=reader();
  app.run('setReaderFocus(true)');
  app.elements.get('choosePassageBtn').click();
  assert.equal(app.context.document.body.classList.contains('reading-focus'),false);
  assert.equal(app.elements.get('passageTools').open,true);
  assert.equal(app.elements.get('selectionMode').focused,true);
  app.run('handleBlockClick(2);handleBlockClick(2);playReading()');
  assert.equal(app.elements.get('rangeInfo').textContent,'Selected passage · 1 paragraph');
  const stale=app.speech.queue.at(-1);
  app.elements.get('selectAllBtn').click();stale.onend();
  assert.equal(app.run('state.isReading'),false);
  assert.equal(app.elements.get('rangeInfo').textContent,'All text');
  assert.equal(app.elements.get('content').children.some(node=>node.classList.contains('selected-range')),false);
  const restored=reader(JSON.parse(app.storage.get(key)));restored.run('resumeSession()');
  assert.equal(restored.elements.get('selectionMode').value,'all');
  assert.equal(restored.run('state.sentences.length'),app.run('state.sentences.length'));
});

test('keyboard range boundaries describe actual Unicode text and a stale click anchor cannot extend another mode',()=>{
  const app=reader();
  app.run("renderDocument('Boundaries',[{type:'h2',text:'見出し'},{type:'p',text:'こんにちは。😀'},{type:'p',text:'Last paragraph.'}]);els.selectionMode.value='paragraph';handleBlockClick(0)");
  app.elements.get('selectionMode').value='slider';app.elements.get('selectionMode').change();
  assert.equal(app.run('state.selectionAnchor'),null);
  app.elements.get('endRange').value='2';app.elements.get('endRange').input();
  app.elements.get('startRange').value='1';app.elements.get('startRange').input();
  assert.equal(app.elements.get('startRange')['aria-valuetext'],'2. こんにちは。😀');
  assert.equal(app.elements.get('endRange')['aria-valuetext'],'3. Last paragraph.');
  assert.equal(app.elements.get('rangeInfo').textContent,'Selected passage · 2 paragraphs');
  assert.deepEqual(Array.from(app.run('state.sentenceBlocks')),[1,1,2]);
});

test('Cancel loading keeps document, playback position and both drafts even if an aborted body resolves',async()=>{
  let resolveText,signal;
  const app=reader(null,false,{fetch:async(_url,options)=>{signal=options.signal;return {ok:true,text:()=>new Promise(resolve=>{resolveText=resolve;})};}});
  app.elements.get('urlInput').value='https://example.com/pending';
  app.elements.get('pasteInput').value='Unsubmitted draft 😀';
  app.elements.get('titleInput').value='Draft title';
  app.run('seekPart(2);setTab("url")');
  const pending=app.run('loadUrl()');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(app.elements.get('loadingNotice').classList.contains('hidden'),false);
  app.elements.get('cancelLoadBtn').click();
  const cancelled=app.elements.get('status').textContent;
  assert.equal(signal.aborted,true);
  assert.equal(app.elements.get('urlInput').focused,true);
  resolveText('<article>Late document.</article>');await pending;
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
  assert.equal(app.run('state.currentSentenceIndex'),2);
  assert.equal(app.elements.get('status').textContent,cancelled);
  assert.equal(app.elements.get('pasteInput').value,'Unsubmitted draft 😀');
  assert.equal(app.elements.get('titleInput').value,'Draft title');
  assert.equal(app.elements.get('urlInput').value,'https://example.com/pending');
  assert.equal(app.elements.get('loadingNotice').classList.contains('hidden'),true);
  assert.equal(app.elements.get('loadUrlBtn').disabled,false);
});

test('timeout cancels stale response bodies and a newer load retains its own loading controls',async()=>{
  const timers=[];let resolveFirst,resolveSecond,calls=0;
  const app=reader(null,false,{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},fetch:async()=>({ok:true,text:()=>new Promise(resolve=>{if(++calls===1)resolveFirst=resolve;else resolveSecond=resolve;})})});
  app.elements.get('urlInput').value='https://example.com/slow';
  const first=app.run('loadUrl()');await new Promise(resolve=>setImmediate(resolve));timers[0]();
  assert.match(app.elements.get('status').textContent,/took too long/);
  const second=app.run('loadUrl()');await new Promise(resolve=>setImmediate(resolve));
  resolveFirst('<article>Expired response.</article>');await first;
  assert.equal(app.elements.get('loadUrlBtn').disabled,true);
  assert.equal(app.elements.get('loadingNotice').classList.contains('hidden'),false);
  app.run('setTab("paste")');app.elements.get('cancelLoadBtn').click();
  assert.equal(app.elements.get('pasteInput').focused,true);
  resolveSecond('<article>Cancelled second response.</article>');await second;
  assert.equal(app.elements.get('articleTitle').textContent,'Demo Document');
  assert.match(app.elements.get('status').textContent,/cancelled/);
});
