const realClock = {now:()=>performance.now(),set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)};

export function createPresentationController({presentation,host,clock=realClock}) {
  const listeners=new Set();
  let sessionNumber=0;
  let status='idle',plan=presentation.scenes,index=0,remaining=0,deadline=0,timer=null,revision=0,abort=null;
  let entered=false,wanted=false,prior=null,sessionId=null,beatIndex=0,pendingBeat=null,focusTarget=null,message='',omitted=[],exiting=null;
  const current=()=>plan[index];
  const left=()=>status==='playing'?Math.max(0,deadline-clock.now()):remaining;
  const snapshot=()=>({status,index,total:plan.length,scene:current(),target:focusTarget,scenes:plan,remainingMs:left(),elapsedMs:current()?current().holdMs-left():0,sessionId,message,omitted,entered});
  const notify=()=>{for(const listener of listeners)listener(snapshot());};
  function stopClock(){if(status==='playing')remaining=left();if(timer!==null)clock.clear(timer);timer=null;}
  function cancel(){stopClock();abort?.abort();abort=null;revision++;}
  const context=signal=>({signal,sessionId,activity:{activity:'presentation',presentationSessionId:sessionId}});
  function fail(error){cancel();wanted=false;status='error';message=error.message||'This scene could not be prepared.';notify();}
  function hold(){status='playing';wanted=true;message='';deadline=clock.now()+remaining;notify();timer=clock.set(tick,Math.min(100,remaining));}
  async function applyBeat(beat){
    stopClock();pendingBeat=beat;focusTarget=beat.target||current().target;status='preparing';const token=revision,signal=abort.signal;notify();
    try{await host.beat?.(current(),beat,context(signal));if(token!==revision||signal.aborted)return;pendingBeat=null;wanted?hold():(status='paused',notify());}
    catch(error){if(token===revision&&!signal.aborted)fail(error);}
  }
  function tick(){
    timer=null;if(status!=='playing')return;remaining=left();
    const beat=current().beats?.[beatIndex];
    if(beat&&current().holdMs-remaining>=beat.at*current().holdMs){beatIndex++;void applyBeat(beat);return;}
    if(remaining<=0){
      if(index===plan.length-1){cancel();remaining=0;wanted=false;status='completed';message='Presentation complete.';notify();}
      else void go(index+1,true);
      return;
    }
    notify();timer=clock.set(tick,Math.min(100,remaining));
  }
  async function go(next,play,resumeAt=null){
    if(next<0||next>=plan.length||status==='exiting')return false;
    const previous=current();cancel();host.cleanup?.(previous);index=next;remaining=resumeAt?.remainingMs??current().holdMs;focusTarget=resumeAt?.target||current().target;beatIndex=resumeAt?.beatIndex||0;pendingBeat=null;entered=false;wanted=play;message='';status='preparing';
    abort=new AbortController();const token=revision,signal=abort.signal;notify();
    try{
      await host.enter(current(),context(signal));
      if(token!==revision||signal.aborted)return false;
      if(resumeAt?.beatIndex){await host.beat?.(current(),current().beats[resumeAt.beatIndex-1],context(signal));if(token!==revision||signal.aborted)return false;}
      entered=true;wanted?hold():(status='paused',notify());return true;
    }catch(error){if(token===revision&&!signal.aborted)fail(error);return false;}
  }
  async function start(){
    if(status==='completed')return replay();
    if(status!=='idle')return false;
    const validation=host.validate(presentation.scenes);
    omitted=validation.omitted||[];
    if(validation.blockers.length){message=validation.blockers.join(' ');notify();return false;}
    plan=validation.scenes;if(!plan.length){message='No presentation scenes are available.';notify();return false;}
    prior=host.capture();sessionId=`PRESENTATION-${Date.now()}-${++sessionNumber}`;return go(0,true);
  }
  function pause(reason='Paused — explore freely.'){
    if(!['playing','preparing'].includes(status))return;
    const wasPreparing=status==='preparing';cancel();wanted=false;if(wasPreparing&&!pendingBeat)entered=false;
    status='paused';message=reason;notify();
  }
  function interrupt(reason='Paused — explore freely.'){
    if(!['playing','preparing','paused'].includes(status))return;
    pause(reason);status='interrupted';wanted=false;message=reason;notify();
  }
  async function resume(){
    if(status!=='paused')return false;
    if(!entered)return go(index,true);
    abort=new AbortController();wanted=true;if(pendingBeat){await applyBeat(pendingBeat);return true;}hold();return true;
  }
  function next(){if(status==='idle'||status==='exiting')return false;if(status==='error'&&current()?.required)return false;return go(index+1,status==='playing'||status==='preparing'&&wanted);}
  function previous(){if(status==='idle'||status==='exiting')return false;return go(index-1,status==='playing'||status==='preparing'&&wanted);}
  function jump(next){if(status==='idle'||status==='exiting')return false;return go(next,status==='playing'||status==='preparing'&&wanted);}
  async function replay(){if(status!=='completed')return false;sessionId=`PRESENTATION-${Date.now()}-${++sessionNumber}`;return go(0,true);}
  function exit(){
    if(status==='idle')return Promise.resolve();if(exiting)return exiting;
    cancel();host.cleanup?.(current());wanted=false;status='exiting';notify();
    exiting=(async()=>{
      try{await host.restore(prior,{sessionId,activity:{activity:'presentation',presentationSessionId:sessionId}});message='';}
      catch(error){message=`Presentation ended. ${error.message}`;}
      finally{prior=null;entered=false;remaining=0;index=0;status='idle';exiting=null;notify();}
    })();return exiting;
  }
  return {
    get state(){return snapshot();},subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},
    validate:()=>host.validate(presentation.scenes),start,pause,interrupt,resume,next,previous,jump,replay,exit,
    refresh:()=>['playing','preparing'].includes(status)?go(index,true,{remainingMs:left(),beatIndex,target:focusTarget}):false,
    returnAndContinue:()=>status==='interrupted'?go(index,true,{remainingMs:remaining,beatIndex,target:focusTarget}):false,
    continueNext:()=>status==='interrupted'?go(index+1,true):false,
    retry:()=>status==='error'?go(index,false):false,
    skip:()=>status==='error'&&!current()?.required?go(index+1,false):false,
    destroy(){cancel();listeners.clear();},
  };
}
