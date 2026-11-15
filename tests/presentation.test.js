import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationController} from '../src/presentation-controller.js';
import {defaultPresentation,presentationDuration} from '../src/presentation-scenes.js';
import {createWorkspace} from '../src/workspace.js';
import {anchorPatients} from '../src/patients.js';

const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fakeClock(){
  let now=0,id=0;const tasks=new Map();
  return {now:()=>now,set(fn,ms){tasks.set(++id,{fn,at:now+ms});return id;},clear:id=>tasks.delete(id),get count(){return tasks.size;},
    advance(ms){const end=now+ms;for(;;){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;tasks.delete(next[0]);next[1].fn();}now=end;},
  };
}
const scenes=()=>['one','two','three'].map(id=>({id,title:id,holdMs:1000,required:true,target:id}));
function harness(overrides={},definitions=scenes()){
  const clock=fakeClock(),entered=[],beats=[],restored=[],prior={dataset:'expanded',filters:{query:'SYN-0007'}},data={notes:[]};
  const host={validate:definitions=>({scenes:definitions,blockers:[],omitted:[]}),capture:()=>prior,restore:view=>restored.push(view),enter:async scene=>{entered.push(scene.id);},beat:async(scene,beat)=>beats.push(beat.action),cleanup(){},...overrides};
  return {controller:createPresentationController({presentation:{scenes:definitions},host,clock}),clock,entered,beats,restored,prior,data};
}

test('the default story has twelve unique scenes and 300 seconds of editable speaking time',()=>{
  assert.equal(defaultPresentation.scenes.length,12);assert.equal(presentationDuration(defaultPresentation.scenes),300000);
  assert.equal(new Set(defaultPresentation.scenes.map(scene=>scene.id)).size,12);
  for(const scene of defaultPresentation.scenes){assert.ok(scene.holdMs>0&&scene.target&&scene.caption&&scene.context.dataset==='unified');for(const beat of scene.beats||[])assert.ok(beat.at>=0&&beat.at<1);}
  assert.deepEqual(defaultPresentation.scenes.map(scene=>scene.id),['study','patient','evidence','scenario','priority','restriction','unresolved','population','composition','guidance','trace','report']);
});

test('each hold starts only after the actual view is ready',async()=>{
  let ready;const h=harness({enter:()=>new Promise(resolve=>ready=resolve)});const starting=h.controller.start();
  assert.equal(h.controller.state.status,'preparing');h.clock.advance(50000);assert.equal(h.clock.count,0);assert.equal(h.controller.state.remainingMs,1000);
  ready();await starting;assert.equal(h.controller.state.status,'playing');h.clock.advance(350);assert.equal(h.controller.state.remainingMs,650);assert.equal(h.clock.count,1);
});

test('explicit pause stops the only playback timer and resume uses the exact remaining time',async()=>{
  const h=harness();await h.controller.start();h.clock.advance(425);h.controller.pause();
  assert.equal(h.controller.state.remainingMs,575);assert.equal(h.clock.count,0);h.clock.advance(10000);assert.deepEqual(h.entered,['one']);
  await h.controller.resume();assert.equal(h.controller.state.remainingMs,575);h.clock.advance(574);assert.equal(h.controller.state.index,0);
  h.clock.advance(26);await flush();assert.equal(h.controller.state.index,1);assert.equal(h.clock.count,1);
});

test('pause during preparation prevents late readiness from starting playback or changing the scene',async()=>{
  let ready;const h=harness({enter:()=>new Promise(resolve=>ready=resolve)});const starting=h.controller.start();
  h.controller.pause();ready();await starting;h.clock.advance(20000);
  assert.equal(h.controller.state.status,'paused');assert.equal(h.controller.state.index,0);assert.equal(h.clock.count,0);
});

test('manual intervention preserves the manual view until an explicit return or next choice',async()=>{
  const h=harness();await h.controller.start();h.clock.advance(200);h.controller.interrupt();h.clock.advance(5000);
  assert.equal(h.controller.state.status,'interrupted');assert.equal(await h.controller.resume(),false);assert.deepEqual(h.entered,['one']);
  await h.controller.returnAndContinue();assert.equal(h.controller.state.index,0);assert.equal(h.controller.state.status,'playing');assert.equal(h.controller.state.remainingMs,800);
  h.controller.interrupt();await h.controller.continueNext();assert.equal(h.controller.state.index,1);assert.equal(h.controller.state.status,'playing');
});

test('previous, next and scene picker preserve paused versus playing intent',async()=>{
  const h=harness();await h.controller.start();h.controller.pause();await h.controller.next();assert.equal(h.controller.state.status,'paused');assert.equal(h.controller.state.index,1);
  await h.controller.jump(2);assert.equal(h.controller.state.status,'paused');await h.controller.previous();assert.equal(h.controller.state.index,1);
  await h.controller.resume();await h.controller.jump(0);assert.equal(h.controller.state.status,'playing');assert.equal(h.controller.state.remainingMs,1000);
});

test('a responsive layout refresh preserves remaining time and leaves manual exploration alone',async()=>{
  const h=harness();await h.controller.start();h.clock.advance(350);await h.controller.refresh();
  assert.equal(h.controller.state.index,0);assert.equal(h.controller.state.status,'playing');assert.equal(h.controller.state.remainingMs,650);assert.equal(h.clock.count,1);
  h.controller.interrupt();assert.equal(h.controller.refresh(),false);assert.equal(h.controller.state.status,'interrupted');assert.equal(h.clock.count,0);
});

test('rapid repeated navigation cancels stale entries and never creates duplicate timers',async()=>{
  const pending=[];const h=harness({enter:(scene,{signal})=>new Promise(resolve=>pending.push({scene,signal,resolve}))});
  const first=h.controller.start(),second=h.controller.next(),third=h.controller.next();
  assert.equal(h.controller.state.index,2);assert.ok(pending[0].signal.aborted&&pending[1].signal.aborted);
  pending[2].resolve();await third;pending[0].resolve();pending[1].resolve();await Promise.all([first,second]);
  assert.equal(h.controller.state.index,2);assert.equal(h.controller.state.status,'playing');assert.equal(h.clock.count,1);
});

test('progressive trace beats use the same clock and a paused beat cannot resume itself',async()=>{
  let ready;const definition={id:'trace',holdMs:1000,required:true,beats:[{at:.25,action:'rule'},{at:.75,action:'result'}]};
  const h=harness({beat:()=>new Promise(resolve=>ready=resolve)},[definition]);await h.controller.start();h.clock.advance(300);
  assert.equal(h.controller.state.status,'preparing');assert.equal(h.clock.count,0);const remaining=h.controller.state.remainingMs;
  h.controller.pause();ready();await flush();assert.equal(h.controller.state.status,'paused');assert.equal(h.clock.count,0);
  const resumed=h.controller.resume();ready();await resumed;assert.equal(h.controller.state.status,'playing');assert.equal(h.controller.state.remainingMs,remaining);
});

test('the end of the story stops without looping and Replay retains the original restoration context',async()=>{
  const h=harness({},[scenes()[0]]);await h.controller.start();h.clock.advance(1000);await flush();
  assert.equal(h.controller.state.status,'completed');assert.equal(h.clock.count,0);h.clock.advance(100000);assert.deepEqual(h.entered,['one']);
  await h.controller.replay();assert.equal(h.controller.state.status,'playing');assert.deepEqual(h.entered,['one','one']);await h.controller.exit();assert.equal(h.restored[0],h.prior);
});

test('missing core dependencies block entry; optional unavailable scenes are omitted explicitly',async()=>{
  const blocked=harness({validate:()=>({scenes:[],blockers:['P03 is unavailable.'],omitted:[]})});
  assert.equal(await blocked.controller.start(),false);assert.equal(blocked.controller.state.status,'idle');assert.equal(blocked.entered.length,0);assert.match(blocked.controller.state.message,/P03/);
  const optional=harness({validate:defs=>({scenes:defs.filter(scene=>scene.id!=='two'),blockers:[],omitted:[{id:'two',reason:'View unavailable.'}]})});
  await optional.controller.start();assert.equal(optional.controller.state.total,2);assert.equal(optional.controller.state.omitted[0].id,'two');
});

test('readiness failures pause on an error with retry and optional skip, not stale playback',async()=>{
  const h=harness({enter:async()=>{throw new Error('Evidence did not load.');}},[{...scenes()[0],required:false},scenes()[1]]);
  await h.controller.start();assert.equal(h.controller.state.status,'error');assert.match(h.controller.state.message,/Evidence/);assert.equal(h.clock.count,0);
  await h.controller.skip();assert.equal(h.controller.state.index,1);assert.equal(h.controller.state.status,'error');assert.equal(h.controller.skip(),false);assert.equal(h.controller.next(),false);
});

test('exit cancels pending work, restores view context only, and leaves deliberate edits untouched',async()=>{
  let ready;const data={notes:[]};const h=harness({enter:()=>new Promise(resolve=>ready=resolve),restore:view=>{assert.equal(view.dataset,'expanded');}});
  const starting=h.controller.start();data.notes.push('A deliberate reviewer note.');await h.controller.exit();ready();await starting;
  assert.equal(h.controller.state.status,'idle');assert.equal(h.clock.count,0);assert.deepEqual(data.notes,['A deliberate reviewer note.']);h.clock.advance(5000);assert.equal(h.controller.state.status,'idle');
});

test('presentation navigation is labeled separately and cannot change review actions or clinical outcomes',()=>{
  const w=createWorkspace(),activity={activity:'presentation',presentationSessionId:'PRESENTATION-TEST'};
  w.setDataset('casebook',activity);w.setScenario('renal-revision',activity);
  assert.ok(w.events.slice(1).every(event=>event.activity==='presentation'&&event.actor==='Presentation playback'&&event.presentationSessionId==='PRESENTATION-TEST'));
  assert.equal(w.events.filter(event=>/review|disposition/.test(event.type)).length,0);
  assert.equal(w.run.current.records.find(record=>record.id==='P06').status,'excluded');assert.equal(w.run.current.records.find(record=>record.id==='P16').status,'indeterminate');
  const count=w.events.length;w.setDataset('casebook',activity);w.setScenario('renal-revision',activity);assert.equal(w.events.length,count);
  w.recordDisposition({patientId:'P03',disposition:'reviewer-note',reason:'A deliberate note during manual exploration.'});assert.equal(w.events.at(-1).actor,'Demo reviewer');
  w.addProfile({...structuredClone(anchorPatients[1]),id:'MANUAL21'});w.setDataset('expanded',activity);w.setDataset('casebook',activity);
  assert.equal(w.run.current.total,21);assert.ok(w.run.patients.some(record=>record.id==='MANUAL21'));assert.ok(w.events.some(event=>event.reason==='A deliberate note during manual exploration.'));
});
