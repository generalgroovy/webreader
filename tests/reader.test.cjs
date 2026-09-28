const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const html = readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const key = 'readableVoiceRangeReader.session.v1';
const saved = { title: 'My document', source: 'Pasted text', blocks: [{type:'p',text:'First sentence. Second sentence.'}], startBlock:0,endBlock:0,currentSentenceIndex:1,controls:{rate:'1.2',pitch:'1',volume:'0',mode:'paragraph'} };

function reader(payload, blocked = false) {
  const storage = new Map(payload ? [[key, JSON.stringify(payload)]] : []);
  const elements = new Map();
  const create = () => ({ value:'1', checked:false, style:{}, dataset:{}, children:[], textContent:'',
    classList:{add(){},remove(){},toggle(){}}, addEventListener(type, fn){this[type]=fn;},
    appendChild(node){this.children.push(node);},querySelectorAll(){return [];},scrollIntoView(){} });
  const speech = {speaking:false,paused:false,queue:[],resumeCalls:0,getVoices:()=>[],cancel(){},speak(u){this.queue.push(u);},resume(){this.paused=false;this.resumeCalls++;},pause(){this.paused=true;}};
  const context = vm.createContext({ document:{ getElementById(id){ if(!elements.has(id))elements.set(id,create()); return elements.get(id);},createElement:create,addEventListener(type, fn){this[type]=fn;} },
    speechSynthesis:speech,SpeechSynthesisUtterance:function(text){this.text=text;},
    localStorage:{getItem(k){if(blocked)throw Error('blocked');return storage.get(k);},setItem(k,v){if(blocked)throw Error('full');storage.set(k,v);}},
    window:{getSelection:()=>({toString:()=>''})},console });
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
  app.run('state.startBlock=2; state.endBlock=2; rebuildSentences()');
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
test('changing range while paused resumes the engine and submits a new utterance',()=>{
  const app=reader();app.run('playReading()');app.speech.speaking=true;
  app.run('pauseReading()');assert.equal(app.speech.paused,true);
  app.run('state.startBlock=2;state.endBlock=2;rebuildSentences();playReading()');
  assert.equal(app.speech.paused,false);assert.equal(app.speech.resumeCalls,1);
  assert.equal(app.speech.queue.length,2);
  assert.match(app.speech.queue.at(-1).text,/central idea/);
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
  const app=reader();app.run('state.startBlock=null;state.endBlock=null;playReading()');
  assert.equal(app.run('state.isReading'),false);assert.equal(app.speech.queue.length,0);
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
  assert.equal(app.elements.get('focusReader').textContent,'Show controls');
  app.run('setReaderFocus(false)');
  assert.equal(classes.has('reading-focus'),false);
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
