/* CLÁSICO 11 · Capa cinematográfica
   Barras de cine, intro con título, cámara lenta + repetición de goles,
   subtítulos de comentarista, grano y etalonaje de color, sonido de trailer. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const cin={on:true,intro:0,introMax:0,ts:1,z:1,zt:1,drift:0,bh:0,g:null,rep:null,live:null,buf:[],gbuf:null,tick:0,subT:0,lastSub:-9,hold:0};
window.CIN=cin;

/* ---------- estilos ---------- */
const css=`
#cin-top,#cin-bot{position:fixed;left:0;right:0;height:0;background:#000;z-index:2;pointer-events:none}
#cin-top{top:0}#cin-bot{bottom:0}
#cin-grade{position:fixed;inset:0;z-index:1;pointer-events:none;mix-blend-mode:soft-light;opacity:.55;
 background:linear-gradient(180deg,rgba(0,110,150,.55),rgba(255,150,60,.45))}
#cin-grain{position:fixed;inset:-50px;z-index:1;pointer-events:none;mix-blend-mode:overlay;opacity:.16;animation:cgr .5s steps(1) infinite}
@keyframes cgr{0%{transform:translate(0,0)}20%{transform:translate(-23px,17px)}40%{transform:translate(19px,-31px)}60%{transform:translate(-37px,-9px)}80%{transform:translate(28px,26px)}}
#cin-rep{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:0;transition:opacity .4s;
 backdrop-filter:grayscale(.55) sepia(.35) contrast(1.12);-webkit-backdrop-filter:grayscale(.55) sepia(.35) contrast(1.12)}
body.cin-rep #cin-rep{opacity:1}
#cin-flash{position:fixed;inset:0;z-index:6;background:#fff;opacity:0;pointer-events:none}
#cin-flash.go{animation:cfl .9s ease-out}
@keyframes cfl{0%{opacity:.85}100%{opacity:0}}
#cin-flare{position:fixed;left:-10%;right:-10%;top:46%;height:3px;z-index:6;pointer-events:none;opacity:0;
 background:linear-gradient(90deg,transparent,rgba(120,190,255,.9) 30%,#fff 50%,rgba(120,190,255,.9) 70%,transparent);filter:blur(1px);box-shadow:0 0 28px 6px rgba(90,170,255,.55)}
#cin-flare.go{animation:cfa 1.3s ease-out}
@keyframes cfa{0%{opacity:0;transform:scaleX(.1)}25%{opacity:1}100%{opacity:0;transform:scaleX(1.2)}}
#cin-black{position:fixed;inset:0;z-index:9;background:#000;opacity:0;pointer-events:none;transition:opacity .9s}
#cin-black.on{opacity:1}
#cin-title{position:fixed;left:0;right:0;top:50%;transform:translateY(-50%);z-index:8;text-align:center;pointer-events:none;opacity:0;
 font-family:Georgia,"Times New Roman",serif;color:#f6efe0;text-transform:uppercase;padding:0 4vw}
#cin-title.on{animation:cti var(--d,3s) ease-out forwards}
@keyframes cti{0%{opacity:0;letter-spacing:.55em;transform:translateY(-50%) scale(1.12)}14%{opacity:1}80%{opacity:1}100%{opacity:0;letter-spacing:.2em;transform:translateY(-50%) scale(1)}}
#cin-title .k{font:600 clamp(11px,2.2vw,15px) system-ui,sans-serif;letter-spacing:.5em;color:#d9c48a;margin-bottom:10px}
#cin-title .t{font-weight:700;font-size:clamp(34px,10vw,92px);line-height:1;text-shadow:0 4px 30px rgba(0,0,0,.7)}
#cin-title .t::after{content:"";display:block;width:min(240px,50vw);height:2px;margin:14px auto 0;background:linear-gradient(90deg,transparent,var(--acc,#d9c48a),transparent)}
#cin-title .s{font:italic 400 clamp(13px,3vw,20px) Georgia,serif;letter-spacing:.2em;margin-top:12px;color:#e9e2d0}
#cin-sub{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 17%);transform:translateX(-50%);z-index:6;pointer-events:none;
 max-width:min(54vw,620px);text-align:center;font:600 clamp(13px,2.6vw,19px)/1.3 system-ui,sans-serif;color:#fff6d6;opacity:0;transition:opacity .35s;
 text-shadow:0 0 3px #000,0 0 3px #000,0 2px 8px #000}
#cin-sub.on{opacity:1}
#cin-badge{position:fixed;left:calc(14px + env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 14%);z-index:6;pointer-events:none;opacity:0;transition:opacity .3s;
 font:800 14px system-ui,sans-serif;letter-spacing:.3em;color:#fff;display:flex;align-items:center;gap:8px;text-shadow:0 1px 6px #000}
#cin-badge.on{opacity:1}
#cin-badge i{width:10px;height:10px;border-radius:50%;background:#e5383b;animation:cbl 1s steps(1) infinite}
@keyframes cbl{50%{opacity:.15}}
body.cin-hud #score,body.cin-hud #pauseBtn,body.cin-hud #zoomBtn,body.cin-hud #viewBtn,body.cin-hud .btn,body.cin-hud #stick,body.cin-hud #banner{opacity:0!important;pointer-events:none}
#score,#pauseBtn,#zoomBtn,#viewBtn,.btn,#stick,#banner{z-index:5;transition:opacity .4s}
body.nocine #cin-grade,body.nocine #cin-grain,body.nocine #cin-rep{display:none}
/* menús con look de película */
.ov{background:radial-gradient(ellipse at 50% 0%,rgba(214,150,60,.30),transparent 50%),radial-gradient(circle at 50% 35%,rgba(6,28,40,.95),rgba(2,5,10,.99))!important}
.card h1{font-family:Georgia,"Times New Roman",serif!important;font-weight:700;letter-spacing:.16em!important;font-size:clamp(34px,9vw,52px)!important;
 background:linear-gradient(180deg,#fff4d0,#d9a84a 60%,#9b6a22);-webkit-background-clip:text;background-clip:text;color:transparent!important;text-shadow:none!important;filter:drop-shadow(0 3px 14px rgba(0,0,0,.6))}
.card h2{font-family:Georgia,serif;letter-spacing:.12em;text-transform:uppercase}
.go{background:linear-gradient(110deg,#b9822b,#e0b252)!important;color:#1a1204!important;letter-spacing:.06em;text-transform:uppercase}
.go.alt{background:transparent!important;color:var(--ink)!important}
#banner{font-family:Georgia,serif;letter-spacing:.06em;background:rgba(0,0,0,.72)!important;border:1px solid rgba(217,196,138,.5);color:#f6efe0}
#banner.big{display:none}
#epilogue{font:italic 400 16px/1.4 Georgia,serif;color:#e9e2d0;margin:2px 0 12px}
`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

/* ---------- DOM ---------- */
const mk=(id,html)=>{const d=document.createElement('div'); d.id=id; if(html) d.innerHTML=html; document.body.appendChild(d); return d;};
const nz=document.createElement('canvas'); nz.width=nz.height=160;
{const g=nz.getContext('2d'),im=g.createImageData(160,160);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}g.putImageData(im,0,0);}
mk('cin-grade'); const grain=mk('cin-grain'); grain.style.backgroundImage='url('+nz.toDataURL()+')';
mk('cin-rep'); const bt=mk('cin-top'), bb=mk('cin-bot'); mk('cin-flash'); mk('cin-flare');
const black=mk('cin-black'), title=mk('cin-title','<div class="k"></div><div class="t"></div><div class="s"></div>');
const sub=mk('cin-sub'), badge=mk('cin-badge','<i></i>REPETICIÓN');

/* ---------- utilidades ---------- */
function showTitle(k,t,s,sec,acc){
  title.querySelector('.k').textContent=k||''; title.querySelector('.t').textContent=t||''; title.querySelector('.s').textContent=s||'';
  title.style.setProperty('--d',sec+'s'); title.style.setProperty('--acc',acc||'#d9c48a');
  title.classList.remove('on'); void title.offsetWidth; title.classList.add('on');
}
function say(txt,ms,force){
  if(!cin.on) return; const now=performance.now()/1000;
  if(!force&&now-cin.lastSub<3) return; cin.lastSub=now;
  sub.textContent=txt; sub.classList.add('on'); clearTimeout(cin.subT); cin.subT=setTimeout(()=>sub.classList.remove('on'),ms||3200);
}
const pick=a=>a[(Math.random()*a.length)|0];
function fx(el){el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');}
function minute(){return Math.min(90,Math.floor((S.half-1)*45+S.clock/S.halfDur*45)+1);}

/* sonido de trailer (usa el AudioContext del juego) */
function boom(){
  if(!AC||!master) return; const t=AC.currentTime;
  const o=AC.createOscillator(),g=AC.createGain(); o.type='sine'; o.frequency.setValueAtTime(110,t); o.frequency.exponentialRampToValueAtTime(32,t+1.1);
  g.gain.setValueAtTime(.9,t); g.gain.exponentialRampToValueAtTime(.001,t+1.4); o.connect(g); g.connect(master); o.start(t); o.stop(t+1.5);
}
function riser(sec){
  if(!AC||!master) return; const t=AC.currentTime, f=AC.createBiquadFilter(), g=AC.createGain();
  f.type='lowpass'; f.frequency.setValueAtTime(180,t); f.frequency.exponentialRampToValueAtTime(2600,t+sec);
  g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+sec*.9); g.gain.exponentialRampToValueAtTime(.0001,t+sec+.5);
  f.connect(g); g.connect(master);
  [55,82.4,110,164.8,220].forEach((hz,i)=>{const o=AC.createOscillator(); o.type='sawtooth'; o.frequency.value=hz*(1+i*.002); o.connect(f); o.start(t); o.stop(t+sec+.6);});
}

/* ---------- grabación y repetición ---------- */
const snap=()=>({p:P.map(o=>Object.assign({},o)),b:Object.assign({},ball)});
function rec(){
  if(S.mode!=='play'&&S.mode!=='setpiece') return;
  if((cin.tick++&1)===0){cin.buf.push(snap()); if(cin.buf.length>130) cin.buf.shift();}
}
function applyRep(i){
  const B=cin.rep.buf, a=B[i|0], b=B[Math.min(B.length-1,(i|0)+1)], f=i-(i|0);
  for(let k=0;k<P.length;k++){
    const p=P[k], A=a.p[k], C=b.p[k]; Object.assign(p,A);
    p.x=A.x+(C.x-A.x)*f; p.y=A.y+(C.y-A.y)*f; p.face=A.face+wrapAng(C.face-A.face)*f;
  }
  Object.assign(ball,a.b); ball.x=a.b.x+(b.b.x-a.b.x)*f; ball.y=a.b.y+(b.b.y-a.b.y)*f; ball.z=a.b.z+(b.b.z-a.b.z)*f;
}
function startReplay(){
  if(!cin.gbuf||cin.gbuf.length<24){cin.g=null; return;}
  cin.live=snap(); cin.rep={buf:cin.gbuf,i:0,end:0};
  document.body.classList.add('cin-rep'); badge.classList.add('on'); cin.zt=1.12; cin.drift=1.6;
  say('Otra vez, desde el principio de la jugada.',3000,true); c3.init=false;
}
function endReplay(){
  if(!cin.rep) return;
  const L=cin.live; for(let k=0;k<P.length;k++) Object.assign(P[k],L.p[k]); Object.assign(ball,L.b);
  cin.rep=null; cin.g=null; cin.zt=1; cin.drift=0; cin.ts=1;
  document.body.classList.remove('cin-rep','cin-hud'); badge.classList.remove('on'); sub.classList.remove('on');
  if(S.mode==='goal') S.timer=Math.min(S.timer,1.2);
}
function skip(){
  if(!cin.on) return;
  if(cin.intro>.5){cin.intro=.5;} else if(cin.rep){cin.rep.i=cin.rep.buf.length;}
}
addEventListener('pointerdown',skip,true); addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')skip();});

/* ---------- ganchos sobre el juego ---------- */
const _startMatch=window.startMatch;
window.startMatch=function(){
  _startMatch.apply(this,arguments);
  cin.buf=[]; cin.g=null; if(cin.rep) endReplay(); sub.classList.remove('on'); cin.lastSub=-9;
  if(!cin.on) return;
  const A=TEAMS[0],B=TEAMS[1]; cin.intro=cin.introMax=4.6;
  black.style.transition='none'; black.classList.add('on'); document.body.classList.add('cin-hud'); hideTouch(true);
  showTitle('Una película de fútbol','Clásico 11',(A.name||A.short)+'  ·  '+(B.name||B.short),2.4);
  cin.zt=1.5; cin.z=1.5; cin.drift=2.2; riser(2.6); setTimeout(boom,2300);
  setTimeout(()=>{ if(cin.intro>0&&cin.introMax){ black.style.transition=''; black.classList.remove('on'); } },900);
  setTimeout(()=>{ if(cin.intro>0) showTitle('Esta noche','Se juega la historia',(A.short)+'  vs  '+(B.short),2.2,A.shirt); },2600);
};
$('startBtn').onclick=window.startMatch; $('againBtn').onclick=window.startMatch;

const _goal=window.goal;
window.goal=function(team){
  _goal.apply(this,arguments);
  if(!cin.on) return;
  const own=ball.last&&ball.last.t!==team, T=TEAMS[team], me=team===0;
  cin.gbuf=cin.buf.slice(-120); cin.g={t:0}; cin.ts=.28; cin.zt=1.4; cin.drift=1.2;
  document.body.classList.add('cin-hud'); fx($('cin-flash')); fx($('cin-flare')); boom(); riser(2.2);
  const num=S.scorer?('#'+S.scorer.num+'  ·  '):'';
  showTitle(own?'Gol en propia puerta':(T.name||T.short),own?'¡Ay, no!':'¡GOOOL!',num+minute()+"'",2.6,T.shirt);
  say(own?'Un error que nadie quería ver.':me?pick(['Y se desata la locura en las tribunas.','Ese gol quedará en la memoria de todos.','Nadie pudo detenerlo. Hoy no.']):pick(['Silencio en el estadio… hay que levantarse.','Golpe duro. Pero el partido sigue.']),3400,true);
};

const _foul=window.callFoul;
window.callFoul=function(off,vic){
  const m=S.mode; _foul.apply(this,arguments);
  if(!cin.on||m!=='play') return;
  if(S.sp&&S.sp.type==='penalty'){ showTitle('Minuto '+minute(),'Penal','',2.2,'#e5383b'); say('Un penal. Todo el estadio contiene la respiración.',3600,true); boom(); cin.zt=1.15; }
  else say(pick(['El árbitro no duda: falta.','Se detiene el juego. Falta.']),2400);
};
const _catch=window.catchBall;
window.catchBall=function(g){_catch.apply(this,arguments); if(cin.on&&g&&ball.last&&ball.last.t!==g.t) say(pick(['¡Atajadón! El arquero se vistió de héroe.','Manos seguras. Qué salvada.']),2600);};
const _kick=window.startKickoff;
window.startKickoff=function(team){
  _kick.apply(this,arguments);
  if(cin.on&&!cin.intro&&S.score[0]+S.score[1]===0&&S.clock===0&&S.half===1) say('Rueda el balón. Se abre el telón.',3000,true);
};
const _half=window.endHalf;
window.endHalf=function(){
  _half.apply(this,arguments);
  if(!cin.on) return;
  if(S.mode==='half') say('Se cierra el primer acto.',3000,true);
  if(S.mode==='full'){
    const a=S.score[0],b=S.score[1];
    let ep=$('epilogue'); if(!ep){ep=document.createElement('p'); ep.id='epilogue'; const t=$('endTitle'); t.parentNode.insertBefore(ep,t.nextSibling);}
    ep.textContent=a>b?'Una noche para contar a los nietos.':a<b?'Las grandes historias también tienen derrotas.':'Nadie ganó, nadie perdió. Todo por escribirse.';
    boom();
  }
};
const _upd=window.update;
window.update=function(dt){
  if(!cin.on||S.mode==='menu') return _upd(dt);
  if(cin.intro>0||cin.rep) return;
  rec(); _upd(dt*cin.ts);
};
const _cam=window.camUpdate3;
window.camUpdate3=function(dt){
  _cam(dt); if(!cin.on) return;
  PJ.F*=cin.z; if(cin.drift) PJ.y+=Math.sin(performance.now()/1300)*cin.drift;
};
const _draw=window.drawFrame;
window.drawFrame=function(dt){ tickCin(dt); _draw(dt); };

/* ---------- reloj de la capa (tiempo real) ---------- */
function tickCin(dt){
  if(!cin.on){ if(cin.bh>0){cin.bh=0; bt.style.height=bb.style.height='0';} cin.z=1; return; }
  if(S.mode==='menu'){ cin.zt=1; cin.z=1; }
  if(cin.intro>0){
    cin.intro-=dt;
    if(cin.intro<=cin.introMax-2.4&&cin.intro>0) cin.zt=1.12;
    if(cin.intro<=0){ cin.intro=0; cin.zt=1; cin.drift=0; document.body.classList.remove('cin-hud'); hideTouch(false); boom(); say('Rueda el balón. Se abre el telón.',3000,true); }
  }
  if(cin.g&&!cin.rep){
    cin.g.t+=dt; const t=cin.g.t;
    cin.ts=t<1.3?.28:Math.min(1,.28+(t-1.3)*.9);
    if(t>2.2) cin.zt=1.05;
    if(t>2.5) startReplay();
  }
  if(cin.rep){
    const R=cin.rep; R.i+=dt*30*.7;
    if(R.i>=R.buf.length-1){ R.i=R.buf.length-1; R.end+=dt; if(R.end>.7) endReplay(); }
    if(cin.rep) applyRep(Math.min(R.i,R.buf.length-1.001));
  }
  const pen=S.mode==='setpiece'&&S.sp&&S.sp.type==='penalty';
  if(pen&&!cin.g&&!cin.rep) cin.zt=1.12; else if(!cin.g&&!cin.rep&&!cin.intro) cin.zt=1;
  if(S.mode==='half'||S.mode==='full'){ cin.zt=1; document.body.classList.remove('cin-hud'); }
  const want=(cin.intro>0||cin.g||cin.rep||pen||S.mode==='half'||S.mode==='full')?Math.round(innerHeight*(pen?.07:.11)):0;
  cin.bh+=(want-cin.bh)*Math.min(1,dt*4.5);
  const h=cin.bh<.5?'0':cin.bh.toFixed(1)+'px'; bt.style.height=bb.style.height=h;
  cin.z+=(cin.zt-cin.z)*Math.min(1,dt*(cin.intro>0?1.2:2.6));
}

/* ---------- botón «Modo cine» en la pausa ---------- */
const cb=document.createElement('button'); cb.className='go alt'; cb.id='cinBtn'; cb.textContent='Modo cine: sí';
const q=$('quitBtn'); q.parentNode.insertBefore(cb,q);
cb.onclick=()=>{
  cin.on=!cin.on; cb.textContent='Modo cine: '+(cin.on?'sí':'no'); document.body.classList.toggle('nocine',!cin.on);
  if(!cin.on){ if(cin.rep) endReplay(); cin.intro=0; cin.g=null; cin.ts=1; cin.zt=1; cin.drift=0; black.classList.remove('on'); title.classList.remove('on'); sub.classList.remove('on'); document.body.classList.remove('cin-hud','cin-rep'); hideTouch(S.mode==='menu'); }
};
})();
