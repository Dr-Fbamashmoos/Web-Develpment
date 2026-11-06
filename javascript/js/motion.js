/* Motion player: timeline, Arabic narration sync, subtitles, controls. Shared by part1-6.html */
(function(){
  const $=id=>document.getElementById(id);
  const frame=$('frame'), stage=$('stage');
  const LINES=window.LINES||[];
  const scenes=[...stage.querySelectorAll('.scene')].map((el,i)=>{
    const audio=new Audio();audio.preload='auto';if(el.dataset.audio)audio.src=el.dataset.audio;
    const s={el,i,anim:+el.dataset.dur,adur:+el.dataset.adur||0,title:el.dataset.title,lines:LINES[i]||[],audio,ok:!!el.dataset.audio,anchors:JSON.parse(el.dataset.anchors||'[]'),tst:JSON.parse(el.dataset.tst||'[]'),wa:el.dataset.wa?JSON.parse(el.dataset.wa):null,wt:el.dataset.wt?JSON.parse(el.dataset.wt):null};
    audio.addEventListener('error',()=>{s.ok=false;relayout()});
    audio.addEventListener('loadedmetadata',()=>{if(isFinite(audio.duration)&&audio.duration>0){s.adur=audio.duration;relayout()}});
    return s;
  });
  const store={get(k,d){try{const v=localStorage.getItem('cpit405-motion-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('cpit405-motion-'+k,JSON.stringify(v))}catch(e){}}};
  let voiceOn=store.get('voice',true), subs=store.get('subs','en');
  const SUBS=['en','ar','off'], SUBS_LBL={en:'English',ar:'Arabic',off:'Off'};

  /* timing: with the voice on, a scene lasts as long as its recording and the animation beats are spread to match */
  const hasVoice=s=>voiceOn&&s.ok&&s.adur>0;
  const lenOf=s=>hasVoice(s)?Math.max(s.anim,s.adur+0.8):s.anim;
  const stretchOf=s=>lenOf(s)/s.anim;
  /* sentence starts: measured in the recording when the voice is on, the designed beats when it is off */
  function lineTimes(s){
    if(hasVoice(s)&&s.tst.length===s.lines.length)return s.tst;
    if(s.anchors.length===s.lines.length)return s.anchors;
    const span=s.anim*0.92,w=s.lines.map(l=>l[0].length+12),tot=w.reduce((a,b)=>a+b,0)||1;let acc=0;return w.map(x=>{const t=acc/tot*span;acc+=x;return t});
  }
  /* map a designed animation time onto the recording, piece by piece between sentence starts */
  function warp(s,d){
    if(!hasVoice(s))return d;
    const fine=s.wa&&s.wt&&s.wa.length===s.wt.length;
    const A=fine?s.wa.concat([s.anim]):s.anchors.length===s.tst.length&&s.anchors.length?s.anchors.concat([s.anim]):[0,s.anim];
    const T=fine?s.wt.concat([s.adur]):s.anchors.length===s.tst.length&&s.tst.length?s.tst.concat([Math.max(s.adur,s.tst[s.tst.length-1]+0.5)]):[0,s.adur];
    for(let k=0;k<A.length-1;k++){if(d<A[k+1]||k===A.length-2){const r=(T[k+1]-T[k])/Math.max(0.01,A[k+1]-A[k]);return T[k]+Math.max(0,d-A[k])*r}}
    return d;
  }
  let starts=[],total=0;
  function relayout(){starts=[];total=0;scenes.forEach(s=>{starts.push(total);total+=lenOf(s)});ui()}

  let cur=0,t=0,playing=false,last=0,lineIdx=-1,curStretch=1;
  const cap=$('capText'),capBox=$('cap'),playBtn=$('play'),fill=$('progFill'),timeEl=$('time'),scnNo=$('scnNo'),chaps=$('chaps');
  scenes.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='chap';b.textContent=(i+1)+'. '+s.title;b.onclick=()=>{go(i);play()};chaps.appendChild(b)});
  function fit(){const w=frame.clientWidth,h=frame.clientHeight;const rot=frame.classList.contains('rot');const W=rot?h:w,H=rot?w:h;const k=Math.min(W/1600,H/900);stage.style.transform=rot?`translate(${w}px,0) rotate(90deg) translate(${(W-1600*k)/2}px,${(H-900*k)/2}px) scale(${k})`:`translate(${(w-1600*k)/2}px,${(h-900*k)/2}px) scale(${k})`}
  new ResizeObserver(fit).observe(frame);fit();
  const fmt=x=>{x=Math.max(0,Math.floor(x));return Math.floor(x/60)+':'+String(x%60).padStart(2,'0')};

  function showLine(){
    const L=scenes[cur].lines[lineIdx];capBox.hidden=subs==='off';cap.style.opacity=0;
    clearTimeout(showLine._t);
    showLine._t=setTimeout(()=>{cap.textContent=L?(subs==='ar'?L[0]:L[1]):'';capBox.classList.toggle('rtl',subs==='ar');cap.style.opacity=1},120);
  }
  function syncLine(){const T=lineTimes(scenes[cur]);let k=-1;T.forEach((x,j)=>{if(t>=x-0.01)k=j});if(k!==lineIdx){lineIdx=k;showLine()}}
  function ui(){if(!starts.length)return;const g=starts[cur]+Math.min(t,lenOf(scenes[cur]));fill.style.width=(g/total*100)+'%';timeEl.textContent=fmt(g)+' / '+fmt(total);[...chaps.children].forEach((b,i)=>b.classList.toggle('cur',i===cur));scnNo.textContent=String(cur+1).padStart(2,'0')+' / '+scenes.length}

  function anims(el){try{return el.getAnimations({subtree:true}).filter(a=>a.animationName!=='flow'&&a.animationName!=='glow'&&a.animationName!=='pk'&&a.animationName!=='pkb'&&a.animationName!=='spn'&&a.animationName!=='blink')}catch(e){return[]}}
  function stopAudio(){scenes.forEach(s=>{try{s.audio.pause()}catch(e){}})}
  function go(i,offset){
    stopAudio();
    scenes[cur].el.classList.remove('on');
    cur=Math.max(0,Math.min(scenes.length-1,i));t=offset||0;lineIdx=-2;
    const s=scenes[cur],el=s.el;void el.offsetWidth;el.classList.add('on');
    anims(el).forEach(a=>{try{const d=a.effect.getTiming().delay||0;a.effect.updateTiming({delay:warp(s,d/1000)*1000});if(t)a.currentTime=t*1000;if(!playing)a.pause();else a.play()}catch(e){}});
    try{s.audio.currentTime=Math.min(t,s.adur||0)}catch(e){}
    syncLine();ui();
    if(playing)startAudio();
  }
  function startAudio(){const s=scenes[cur];if(!hasVoice(s)||t>=s.adur)return;try{s.audio.currentTime=t;const p=s.audio.play();p&&p.catch&&p.catch(()=>{})}catch(e){}}
  function play(){
    if(cur===scenes.length-1&&t>=lenOf(scenes[cur])-0.05){go(0)}
    playing=true;stage.classList.remove('paused');anims(scenes[cur].el).forEach(a=>{try{a.play()}catch(e){}});
    playBtn.textContent='Pause';last=performance.now();startAudio();
  }
  function pause(){playing=false;stage.classList.add('paused');anims(scenes[cur].el).forEach(a=>{try{a.pause()}catch(e){}});playBtn.textContent='Play';stopAudio()}
  function loop(now){
    if(playing){
      const s=scenes[cur];
      if(hasVoice(s)&&!s.audio.paused&&!s.audio.ended){t=s.audio.currentTime}else{t+=(now-last)/1000}
      if(t>=lenOf(s)){if(cur<scenes.length-1)go(cur+1);else{t=lenOf(s);pause()}}
      syncLine();ui();
    }
    last=now;requestAnimationFrame(loop);
  }

  function updateVoiceUI(){const vb=$('voice');if(!scenes.some(s=>s.ok)){vb.disabled=true;vb.classList.remove('on');$('voiceLbl').textContent='Arabic voice: coming soon';return}vb.setAttribute('aria-pressed',String(voiceOn));vb.classList.toggle('on',voiceOn);$('voiceLbl').textContent='Arabic voice: '+(voiceOn?'on':'off')}
  playBtn.onclick=()=>playing?pause():play();
  $('next').onclick=()=>{go(cur+1);play()};
  $('prev').onclick=()=>{go(cur-1);play()};
  $('voice').onclick=()=>{
    voiceOn=!voiceOn;store.set('voice',voiceOn);updateVoiceUI();
    const keep=t;relayout();
    if(!voiceOn)stopAudio();
    go(cur,Math.min(keep,lenOf(scenes[cur])-0.1)); /* re-spread this scene for the new mode */
  };
  $('subs').onclick=()=>{subs=SUBS[(SUBS.indexOf(subs)+1)%3];store.set('subs',subs);$('subsLbl').textContent=SUBS_LBL[subs];showLine()};
  $('subsLbl').textContent=SUBS_LBL[subs];
  /* full screen: real fullscreen where the browser allows it (desktop, Android), otherwise the player covers the page (iPhone). Held upright, the picture turns sideways to fill the screen. */
  const isFS=()=>frame.classList.contains('fs');
  const nativeFS=()=>document.fullscreenElement===frame||document.webkitFullscreenElement===frame;
  function applyRotate(){frame.classList.toggle('rot',isFS()&&window.innerHeight>window.innerWidth);fit()}
  let barT=0;function showBar(){frame.classList.add('bar-on');clearTimeout(barT);barT=setTimeout(()=>{if(playing)frame.classList.remove('bar-on')},3500)}
  async function enterFS(){
    let ok=false;
    try{const r=frame.requestFullscreen||frame.webkitRequestFullscreen;if(r){await r.call(frame);ok=nativeFS()}}catch(e){}
    if(ok){try{await screen.orientation.lock('landscape')}catch(e){}}
    else document.body.classList.add('fs-fake');
    frame.classList.add('fs');applyRotate();showBar();
  }
  function exitFS(){
    try{if(nativeFS())(document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch(e){}
    try{screen.orientation.unlock()}catch(e){}
    document.body.classList.remove('fs-fake');frame.classList.remove('fs','rot','bar-on');fit();
  }
  $('fs').onclick=()=>isFS()?exitFS():enterFS();
  ['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{if(!nativeFS()&&!document.body.classList.contains('fs-fake')&&isFS()){frame.classList.remove('fs','rot','bar-on');fit()}else if(isFS())applyRotate()}));
  window.addEventListener('resize',()=>{if(isFS())applyRotate()});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{if(isFS())applyRotate()},250));
  const fsb=$('fsbar');
  if(fsb){
    fsb.addEventListener('click',e=>{const b=e.target.closest('[data-fsb]');if(!b)return;e.stopPropagation();const a=b.dataset.fsb;
      if(a==='play')$('play').click();else if(a==='prev')$('prev').click();else if(a==='next')$('next').click();else if(a==='voice')$('voice').click();else if(a==='subs')$('subs').click();else if(a==='exit')exitFS();showBar();syncBar()});
    stage.addEventListener('click',e=>{if(!isFS()||e.target.closest('[data-fsb]'))return;if(frame.classList.contains('bar-on'))$('play').click();showBar();syncBar()});
  }
  function syncBar(){if(!fsb)return;const pl=fsb.querySelector('[data-fsb=play]');pl.textContent=playing?'❚❚':'▶';pl.setAttribute('aria-label',playing?'Pause':'Play');fsb.querySelector('[data-fsb=voice]').classList.toggle('off',!voiceOn);const sl=fsb.querySelector('[data-fsb=subs]');sl.textContent='CC '+(subs==='en'?'EN':subs==='ar'?'AR':'off');const t=fsb.querySelector('.fst');if(t)t.textContent=timeEl.textContent}
  setInterval(syncBar,400);
  const prog=$('prog');
  prog.onclick=e=>{const r=prog.getBoundingClientRect();const g=(e.clientX-r.left)/r.width*total;let i=0;while(i<scenes.length-1&&starts[i+1]<=g)i++;go(i,g-starts[i])};
  document.addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,textarea'))return;
    if(e.code==='Space'){e.preventDefault();playing?pause():play()}
    else if(e.key==='ArrowRight'){go(cur+1);play()}else if(e.key==='ArrowLeft'){go(cur-1);play()}
    else if(e.key==='m'||e.key==='M'){$('voice').click()}
    else if(e.key==='c'||e.key==='C'){$('subs').click()}
    else if(e.key==='f'||e.key==='F'){$('fs').click()}});

  window.__jumpEnd=i=>go(i,lenOf(scenes[i])-0.4);
  updateVoiceUI();relayout();
  stage.classList.add('paused');go(0);requestAnimationFrame(loop);
})();
