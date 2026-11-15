import {defaultPresentation,presentationDuration,formatPresentationDuration} from './presentation-scenes.js';
import {createPresentationController} from './presentation-controller.js';
import {escape as e,icon} from './ui.js';
import {transitionPanel} from './motion.js';

export function waitForPresentationView(predicate,signal,message='The scene did not become ready.',timeout=10000){
  return new Promise((resolve,reject)=>{
    let frame;const started=performance.now();
    const finish=(error)=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',aborted);error?reject(error):resolve();};
    const aborted=()=>finish(new DOMException('Presentation navigation cancelled.','AbortError'));
    function check(){
      if(signal.aborted){aborted();return;}
      try{if(predicate()){finish();return;}}catch(error){finish(error);return;}
      if(performance.now()-started>timeout){finish(new Error(message));return;}
      frame=requestAnimationFrame(check);
    }
    signal.addEventListener('abort',aborted,{once:true});check();
  });
}

export function mountPresentation(host){
  const controller=createPresentationController({presentation:defaultPresentation,host});
  const launcher=document.getElementById('presentation-launch');
  const setup=document.createElement('dialog');setup.id='presentation-setup';setup.className='presentation-setup';setup.dataset.presentationUi='';setup.setAttribute('aria-labelledby','presentation-setup-heading');
  const controls=document.createElement('aside');controls.className='presentation-controls';controls.dataset.presentationUi='';controls.hidden=true;controls.setAttribute('aria-label','Presentation controls');
  controls.innerHTML=`<div class="presentation-scene-line"><span class="presentation-kicker">PRESENTATION</span><span id="presentation-position"></span><span id="presentation-status" role="status" aria-live="polite"></span></div><h2 id="presentation-scene-title"></h2><p id="presentation-caption"></p><progress id="presentation-progress" max="1" value="0" aria-label="Current-scene progress"></progress><div class="presentation-transport"><button class="studio-button" data-presentation-command="previous" aria-label="Previous scene">←<span>Previous</span></button><button class="studio-button primary" data-presentation-command="play"></button><button class="studio-button" data-presentation-command="next" aria-label="Next scene"><span>Next</span>→</button><label class="presentation-picker-label" for="presentation-scene-picker">Scene<select id="presentation-scene-picker" aria-label="Choose presentation scene"></select></label><button class="studio-button" data-presentation-command="exit">Exit</button></div><div class="presentation-continuation" hidden><p>Your manual view is unchanged. Choose how to continue.</p><button class="studio-button primary" data-presentation-command="return">Return to this scene and continue</button><button class="studio-button" data-presentation-command="continue-next">Continue with the next scene</button></div><div class="presentation-errors" hidden><p id="presentation-error-message"></p><button class="studio-button" data-presentation-command="retry">Retry scene</button><button class="studio-button" data-presentation-command="skip">Skip scene</button></div><details class="presentation-notes" hidden><summary>Speaker notes</summary><p></p></details>`;
  document.body.append(setup,controls);
  let notesEnabled=false,highlighted=null,lastScene=null,optionsKey='',active=false,modalStack=[],resizeFrame=null;
  const q=selector=>controls.querySelector(selector);
  function clearHighlight(){highlighted?.classList.remove('presentation-focus-target');highlighted=null;}
  function relocate(){
    if(!active)return;
    modalStack=modalStack.filter(dialog=>dialog.open&&dialog.isConnected);
    const modal=modalStack.at(-1)||document.activeElement.closest('dialog:modal')||[...document.querySelectorAll('dialog[open]')].filter(dialog=>dialog!==setup&&dialog.matches(':modal')).at(-1);
    const parent=modal||document.body;if(controls.parentElement!==parent)parent.append(controls);
    controls.classList.toggle('in-dialog',Boolean(modal));
    document.documentElement.style.setProperty('--presentation-clearance',modal?'0px':`${controls.offsetHeight+44}px`);
  }
  const dialogs=new MutationObserver(records=>{for(const record of records)if(record.type==='attributes'&&record.target.matches('dialog')&&record.target!==setup){modalStack=modalStack.filter(dialog=>dialog!==record.target);if(record.target.open)modalStack.push(record.target);}relocate();});
  const resize=new ResizeObserver(relocate);resize.observe(controls);
  function render(state){
    const nextActive=state.status!=='idle';
    if(nextActive!==active){
      active=nextActive;controls.hidden=!active;document.body.classList.toggle('presentation-active',active);
      if(active){dialogs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});listen(true);transitionPanel(controls);}
      else{dialogs.disconnect();listen(false);clearHighlight();document.body.append(controls);document.documentElement.style.removeProperty('--presentation-clearance');}
    }
    controls.dataset.presentationStatus=state.status;controls.dataset.presentationScene=state.scene?.id||'';controls.dataset.remainingMs=String(Math.round(state.remainingMs));
    launcher.setAttribute('aria-expanded',String(active||setup.open));
    if(!active)return;
    const playing=state.status==='playing',preparing=state.status==='preparing',complete=state.status==='completed',interrupted=state.status==='interrupted',error=state.status==='error',exiting=state.status==='exiting';
    q('#presentation-position').textContent=`${state.index+1} / ${state.total}`;
    q('#presentation-scene-title').textContent=state.scene.title;
    const statusText=preparing?'Preparing scene…':playing?'Playing':state.message||'Paused — explore freely.';
    if(q('#presentation-status').textContent!==statusText)q('#presentation-status').textContent=statusText;
    q('#presentation-caption').textContent=state.scene.caption;
    q('#presentation-progress').value=Math.min(1,Math.max(0,state.elapsedMs/state.scene.holdMs));
    const play=q('[data-presentation-command="play"]');play.textContent=complete?'Replay':playing||preparing?'Pause':'Play';play.disabled=interrupted||error||exiting;
    q('[data-presentation-command="previous"]').disabled=state.index===0||exiting;
    q('[data-presentation-command="next"]').disabled=state.index===state.total-1||exiting||error&&state.scene.required;
    q('[data-presentation-command="exit"]').disabled=exiting;
    q('.presentation-continuation').hidden=!interrupted;q('[data-presentation-command="continue-next"]').disabled=state.index===state.total-1;
    q('.presentation-errors').hidden=!error;q('#presentation-error-message').textContent=state.message;q('[data-presentation-command="skip"]').hidden=state.scene.required;
    const key=state.scenes.map(scene=>scene.id).join('/');
    if(optionsKey!==key){q('#presentation-scene-picker').innerHTML=state.scenes.map((scene,index)=>`<option value="${index}">${index+1}. ${e(scene.title)}</option>`).join('');optionsKey=key;}
    q('#presentation-scene-picker').value=String(state.index);q('#presentation-scene-picker').disabled=exiting;
    q('.presentation-notes').hidden=!notesEnabled;q('.presentation-notes p').textContent=state.scene.notes||'';
    if(lastScene!==state.scene.id){q('.presentation-notes').open=false;lastScene=state.scene.id;}
    const target=playing?host.resolveTarget(state.target):null;
    if(target!==highlighted){clearHighlight();highlighted=target;highlighted?.classList.add('presentation-focus-target');}
    relocate();
  }
  function insideUi(target){return target.closest?.('[data-presentation-ui],#presentation-launch');}
  function intervene(event){if(!insideUi(event.target))controller.interrupt();}
  function keyboard(event){
    const target=event.target instanceof Element?event.target:document.activeElement;
    const editing=target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],[role="combobox"]');
    const nativeControl=target.closest('button,a,summary,[role="button"]');
    const directionalControl=target.closest('[role="tab"],[role="slider"],[data-scene-key]');
    if(editing||event.code==='Space'&&nativeControl||['ArrowLeft','ArrowRight'].includes(event.key)&&directionalControl){if(!insideUi(target))controller.interrupt();return;}
    const command={Space:'play',ArrowRight:'next',ArrowLeft:'previous',Escape:'exit'}[event.code]||({' ':'play',ArrowRight:'next',ArrowLeft:'previous',Escape:'exit'}[event.key]);
    if(command&&!event.altKey&&!event.ctrlKey&&!event.metaKey){event.preventDefault();event.stopImmediatePropagation();void run(command);}
    else if(!insideUi(target)&&event.key!=='Shift')controller.interrupt();
  }
  const hidden=()=>{if(document.hidden)controller.pause('Paused — this tab was hidden. Resume when ready.');};
  const layoutChanged=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;void controller.refresh();});};
  function listen(on){
    for(const name of ['pointerdown','wheel','input'])document[on?'addEventListener':'removeEventListener'](name,intervene,{capture:true,passive:true});
    document[on?'addEventListener':'removeEventListener']('keydown',keyboard,true);
    document[on?'addEventListener':'removeEventListener']('visibilitychange',hidden);
    window[on?'addEventListener':'removeEventListener']('resize',layoutChanged);
    if(!on){cancelAnimationFrame(resizeFrame);resizeFrame=null;}
  }
  async function run(command){
    if(command==='play')return controller.state.status==='completed'?controller.replay():['playing','preparing'].includes(controller.state.status)?controller.pause():controller.resume();
    const methods={previous:'previous',next:'next',exit:'exit',return:'returnAndContinue','continue-next':'continueNext',retry:'retry',skip:'skip'};
    if(methods[command])await controller[methods[command]]();
  }
  controls.addEventListener('click',event=>{event.stopPropagation();const command=event.target.closest('[data-presentation-command]')?.dataset.presentationCommand;if(command)void run(command);});
  q('#presentation-scene-picker').addEventListener('change',event=>void controller.jump(Number(event.target.value)));
  launcher.addEventListener('click',()=>{
    if(active){q('[data-presentation-command="play"]').focus();return;}
    const validation=controller.validate(),duration=presentationDuration(validation.scenes);
    setup.innerHTML=`<header><span class="studio-eyebrow">GUIDED APPLICATION DEMONSTRATION</span><button class="studio-icon-button" data-presentation-close aria-label="Close presentation setup">${icon('close')}</button></header><h2 id="presentation-setup-heading">${e(defaultPresentation.title)}</h2><p class="presentation-setup-intro">A live journey through the patient, the evidence and the decision. You speak; Cohort handles the navigation.</p><dl><div><dt>Configured speaking time</dt><dd>${formatPresentationDuration(duration)} <small>excludes pauses and loading</small></dd></div><div><dt>Dataset / study</dt><dd>${e(host.studyLabel)}<small>${e(host.datasetLabel)}</small></dd></div></dl><label class="presentation-notes-setting"><input type="checkbox" id="presentation-show-notes" ${notesEnabled?'checked':''}> Show speaker notes <small>Available on expansion during playback</small></label>${validation.blockers.length?`<div class="presentation-setup-blocker" role="alert"><strong>Presentation cannot start.</strong><ul>${validation.blockers.map(item=>`<li>${e(item)}</li>`).join('')}</ul></div>`:''}${validation.omitted.length?`<p class="presentation-omitted">Optional scenes omitted: ${validation.omitted.map(item=>`${e(item.title)} (${e(item.reason)})`).join('; ')}.</p>`:''}<button class="studio-button primary" data-presentation-start ${validation.blockers.length?'disabled':''}>Start presentation ${icon('arrow')}</button><p class="presentation-setup-help">Pause at any time to explore. No narration, music, approvals or automatic downloads.</p>`;
    setup.showModal();launcher.setAttribute('aria-expanded','true');transitionPanel(setup);
  });
  setup.addEventListener('click',async event=>{
    if(event.target===setup||event.target.closest('[data-presentation-close]'))setup.close();
    if(event.target.closest('[data-presentation-start]')){notesEnabled=setup.querySelector('#presentation-show-notes').checked;setup.close();await controller.start();}
  });
  setup.addEventListener('close',()=>launcher.setAttribute('aria-expanded',String(active)));
  controller.subscribe(render);
  return {controller,destroy(){controller.destroy();dialogs.disconnect();resize.disconnect();listen(false);clearHighlight();document.body.classList.remove('presentation-active');document.documentElement.style.removeProperty('--presentation-clearance');setup.remove();controls.remove();}};
}
