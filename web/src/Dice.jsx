import DiceEffects from './DiceEffects.jsx';
import React,{useEffect,useRef} from 'react';
import {playFullChargeSound} from './sound.js';
import {aimAngle,createRollOrientation,rollEase,reflectedPosition,CHARGE_MS} from './dice-motion.js';
import {diceFaces,faceOrientation,rotate,add,scale,dot,ROLL_MS,qMultiply,qAxis} from './d12.js';

function paint(canvas,q,bounce=0,sides=12,squash=0){
 const ctx=canvas.getContext('2d');if(!ctx)return;const size=210,dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==size*dpr){canvas.width=size*dpr;canvas.height=size*dpr;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);

 ctx.save();ctx.translate(105,150);ctx.scale(1+squash*.22,1-squash*.24);ctx.translate(-105,-150);
 const project=v=>{const perspective=6.5/(6.5-v[2]);return [105+v[0]*40*perspective,107-v[1]*40*perspective-bounce];};
 const visible=diceFaces(sides).map(f=>({...f,n:rotate(q,f.normal),c:rotate(q,f.center),points:f.vertices.map(v=>rotate(q,v))})).filter(f=>dot(f.n,[-f.c[0],-f.c[1],6.5-f.c[2]])>0).sort((a,b)=>a.c[2]-b.c[2]);
 for(const f of visible){
  const pts=f.points.map(project),light=Math.max(0,dot(f.n,[-.35,.55,.76]));const r=Math.round(180+75*light),g=Math.round(115+76*light),b=31;
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fill();ctx.strokeStyle='#a66a09';ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.stroke();
  const center=project(f.c),u=project(add(f.c,scale(rotate(q,f.u),.6))),v=project(add(f.c,scale(rotate(q,f.v),.6)));
  ctx.save();ctx.transform((u[0]-center[0])/24,(u[1]-center[1])/24,(v[0]-center[0])/24,(v[1]-center[1])/24,...center);ctx.fillStyle='#111318';ctx.font=`900 ${sides===24?24:34.5}px Nunito, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(f.value),0,1);if(f.value===6||f.value===9){ctx.fillRect(-4,13,8,1.3);}ctx.restore();
 }
 const points=visible.flatMap(f=>f.points.map(project)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const half=arr=>{const h=[];for(const p of arr){while(h.length>1&&cross2(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};const hull=[...half(points),...half([...points].reverse())];ctx.beginPath();hull.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.strokeStyle='#0a0b0e';ctx.lineWidth=4;ctx.lineJoin='round';ctx.stroke();
 ctx.restore();
}
export default function Dice({value=12,sides=12,rolling=false,reduced=false,pressed=false,power=0,sound=false,launchAngle=null,aim}){
 const canvas=useRef(null),ring=useRef(null),effects=useRef(null),flame=useRef(null),arrow=useRef(null),energy=useRef(null),glow=useRef(null),orientation=useRef(faceOrientation(value,sides)),position=useRef({x:0,y:0}),shape=useRef(0);
 useEffect(()=>{let raf;const node=canvas.current,area=node.closest('.dice-hitbox');
  let areaRect=area.getBoundingClientRect();const updateRect=()=>{areaRect=area.getBoundingClientRect();};window.addEventListener('resize',updateRect);window.addEventListener('scroll',updateRect,{passive:true,capture:true});
  const board=area.closest('.board');const boundX=Math.max(0,(board.clientWidth-node.clientWidth)/2-20),boundY=Math.max(0,(board.clientHeight-node.clientHeight)/2-30);
  const start=performance.now(),target=faceOrientation(value,sides);const rotation=createRollOrientation(orientation.current,target,power);let previous=start,q=orientation.current;
  let x=Math.max(-boundX,Math.min(boundX,position.current.x)),y=Math.max(-boundY,Math.min(boundY,position.current.y));
  const direction=launchAngle??Math.random()*Math.PI*2,totalTravel=450+power*3200,startX=x,startY=y;let vx=0,vy=0,height=0,lift=rolling?260+power*150:0,impactAt=-1000,grounded=false,signX=1,signY=1;
  const bursts=[];let lastPuff=-100,charged=false,lastPaintShape=NaN;
  if(rolling){if(power>=.995&&!reduced){const rect=areaRect;effects.current?.launch(rect.left+rect.width/2+x,rect.top+rect.height/2+y);}}
  if(rolling)for(const [i,star] of [...ring.current.children].entries()){const angle=i*Math.PI/3,dx=Math.cos(angle)*(65+power*65),dy=Math.sin(angle)*(55+power*55);const base=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;bursts.push(star.animate(reduced?[{opacity:1},{opacity:0}]:[{opacity:0,transform:base+' scale(.2)'},{opacity:1,transform:base+` translate(${dx*.6}px,${dy*.6}px) rotate(${i*35}deg) scale(1.35)`,offset:.3},{opacity:0,transform:base+` translate(${dx}px,${dy+18}px) rotate(${i*35+55}deg) scale(.35)`}],{duration:520,delay:i%2*25}));}

  const frame=now=>{if(now-previous<14){raf=requestAnimationFrame(frame);return;}const elapsed=now-start,dt=Math.min(32,Math.max(0,now-previous));previous=now;let squeeze=pressed?1:0;
   if(rolling&&!reduced){
    const progress=Math.min(1,elapsed/(ROLL_MS-80)),distance=totalTravel*rollEase(progress);
    const nextX=reflectedPosition(startX,Math.cos(direction)*distance,boundX),nextY=reflectedPosition(startY,Math.sin(direction)*distance,boundY);
    vx=(nextX.position-x)/Math.max(1,dt);vy=(nextY.position-y)/Math.max(1,dt);
    x=nextX.position;y=nextY.position;
    if(nextX.direction!==signX||nextY.direction!==signY)impactAt=elapsed;
    signX=nextX.direction;signY=nextY.direction;
    if(!grounded){height+=lift*dt/1000;lift-=1450*dt/1000;if(height<0){height=0;lift=Math.abs(lift)*.52;if(lift<45){lift=0;grounded=true;}impactAt=elapsed;}}
    q=rotation(elapsed/(ROLL_MS-80));

    const age=elapsed-impactAt;squeeze=age<240?Math.exp(-age/80)*Math.cos(age/42)*.8:0;
    if(elapsed<250)squeeze-=Math.sin(elapsed/250*Math.PI)*.48;
   }else if(!rolling)q=target;
   shape.current+=(squeeze-shape.current)*(1-Math.exp(-dt/32));
   const charge=pressed?Math.min(1,elapsed/CHARGE_MS):0;
   if(pressed&&charge===1&&!charged){charged=true;if(sound)playFullChargeSound();if(!reduced){bursts.push(flame.current.animate([{scale:'.25',opacity:0},{scale:'1.65',opacity:1,offset:.3},{scale:'.9',opacity:1,offset:.68},{scale:'1',opacity:1}],{duration:420,easing:'ease-out'}));bursts.push(energy.current.animate([{scale:'.3',opacity:1},{scale:'2.7',opacity:.8,offset:.45},{scale:'3.5',opacity:0}],{duration:450,easing:'ease-out'}));}}
   flame.current.classList.toggle('charged',pressed&&charge===1&&!reduced);
   flame.current.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
   const aimValue=aim?.current||{x:0,y:0},aimed=Math.hypot(aimValue.x,aimValue.y)>=14;
   arrow.current.style.display=pressed&&aimed?'block':'none';
   arrow.current.style.width=`${Math.min(180,Math.max(75,Math.hypot(aimValue.x,aimValue.y)))}px`;
   arrow.current.style.transform=`translate(${x}px,${y}px) rotate(${aimAngle(aimValue.x,aimValue.y)??0}rad)`;
   energy.current.style.transform=`translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
   area.classList.toggle('fully-charged',pressed&&charge===1&&!reduced);
   area.classList.toggle('super-launch',rolling&&power>=.995&&elapsed<1000&&!reduced);
   area.style.setProperty('--charge',charge);
   area.dataset.charge=pressed?(charge===1?'满蓄力':`${Math.round(charge*100)}%`):'';
   const jitter=pressed&&!reduced?(1+charge*7)*(charge===1?1.4:1):0;
   const drawX=reduced?0:x+Math.sin(elapsed*.12)*jitter,drawY=reduced?0:y+Math.cos(elapsed*.15)*jitter*.65;
   area.style.setProperty('--dice-x',`${x}px`);area.style.setProperty('--dice-y',`${y}px`);

   glow.current.style.transform=`translate(calc(-50% + ${drawX}px),calc(-50% + ${drawY}px))`;
   position.current={x,y};orientation.current=q;node.style.transform=`translate(${drawX}px,${drawY}px) scale(${rolling&&!reduced?1+.28*(elapsed<70?Math.sin(elapsed/70*Math.PI/2):Math.pow(Math.max(0,1-(elapsed-70)/300),2)):1})`;const impactAge=elapsed-impactAt,wobble=rolling&&!reduced&&impactAge>=0?.055*Math.exp(-impactAge/110)*Math.sin(impactAge/42)*Math.min(1,Math.hypot(vx,vy)/.3):0;if(rolling||!Number.isFinite(lastPaintShape)||Math.abs(shape.current-lastPaintShape)>.003){lastPaintShape=shape.current;paint(node,wobble?qMultiply(qAxis([1,0,0],wobble),q):q,reduced?0:Math.min(42,height),sides,reduced?0:shape.current);}
   if(rolling&&!reduced&&elapsed<1150&&elapsed-lastPuff>(power>=.995?25:80)){lastPuff=elapsed;const rect=areaRect;effects.current?.trail(rect.left+rect.width/2+x,rect.top+rect.height/2+y,power>=.995);}

   if(pressed||elapsed<(rolling?ROLL_MS:280))raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',updateRect);window.removeEventListener('scroll',updateRect,true);bursts.forEach(a=>a.cancel());area.classList.remove('fully-charged','super-launch');flame.current?.classList.remove('charged');area.dataset.charge='';};
 },[value,sides,rolling,reduced,pressed,power,sound,launchAngle]);
 return <><span ref={glow} className="dice-glow" aria-hidden="true"/><span ref={arrow} className="dice-aim" aria-hidden="true"/><span ref={energy} className="charge-burst" aria-hidden="true"/><span ref={flame} className="charge-flame" aria-hidden="true"><i/><i/><i/><i/><i/></span><DiceEffects ref={effects}/><canvas ref={canvas} className="d12-dice" role="img" aria-label={rolling?`${sides}面骰正在滚动`:`${sides}面骰 ${value} 点`}/><span ref={ring} className="dice-click-stars" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i}/>)}</span></>;
}
