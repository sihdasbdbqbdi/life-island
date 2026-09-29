import React,{useEffect,useRef} from 'react';
import {playMoneySound} from './sound.js';
// 每批使用固定起点，先弹出减速，再沿曲线加速到实时的排行榜位置。
export default function MoneyFlights({batch,rows,reduced,sound,onDone}){
 const layer=useRef(null);
 useEffect(()=>{
  if(!batch)return;
  const animations=[],timers=[];let cancelled=false;
  const schedule=(fn,t)=>{const id=setTimeout(()=>{if(!cancelled)fn();},t);timers.push(id);};
  let duration=0;
  for(const group of batch.groups){
   const row=rows.current[group.playerId];if(!row)continue;
   const rect=row.getBoundingClientRect();const target={x:Math.min(innerWidth-25,Math.max(25,rect.right-45)),y:Math.min(innerHeight-30,Math.max(30,rect.top+rect.height/2))};
   const pulse=()=>{row.getAnimations().forEach(a=>a.cancel());animations.push(row.animate(reduced?[{opacity:.65},{opacity:1}]:[{transform:'scale(1)'},{transform:'scale(1.08,.9)',offset:.28},{transform:'scale(.97,1.08)',offset:.6},{transform:'scale(1)'}],{duration:380,easing:'ease-out'}));};
   if(reduced){pulse();if(sound)playMoneySound(group.amount);continue;}
   const count=Math.min(20,Math.max(1,Math.ceil(group.amount/10)));
   for(let i=0;i<count;i++){
    const node=layer.current.querySelector(`[data-note="${group.key}-${i}"]`);if(!node)continue;
    const delay=i*32,spread=(i%2?1:-1)*(25+(i%5)*12),start=group.from;
    const x=start.x+spread,y=start.y-55-(i%4)*12;
    const dx=target.x-x,dy=target.y-y;
    const translate=(x,y,scale,angle)=>`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${scale})`;
    const frames=[{opacity:0,transform:translate(start.x,start.y,.2,-20),offset:0,easing:'cubic-bezier(.1,.8,.2,1)'},{opacity:1,transform:translate(x,y,1.2,i%2?15:-15),offset:.25,easing:'ease-out'},{opacity:1,transform:translate(x+4,y-3,1,0),offset:.43,easing:'cubic-bezier(.55,0,.9,.55)'},{opacity:1,transform:translate(x+dx*.42,y+dy*.22,.9,12),offset:.73,easing:'ease-in'},{opacity:1,transform:translate(target.x,target.y,.35,0),offset:.96},{opacity:0,transform:translate(target.x,target.y,.15,0),offset:1}];
    animations.push(node.animate(frames,{duration:850,delay,fill:'both'}));
    schedule(()=>{pulse();if(sound&&count>1)playMoneySound(10,true,i);},delay+810);
    duration=Math.max(duration,delay+1200);
   }
   if(sound)schedule(()=>playMoneySound(group.amount),Math.min(19,count-1)*32+850);
  }
  schedule(onDone,reduced?450:duration||50);
  return()=>{cancelled=true;timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());};
 },[batch]);
 if(!batch||reduced)return null;
 return <div className="money-flight-layer" ref={layer} aria-hidden="true">{batch.groups.flatMap(group=>Array.from({length:Math.min(20,Math.max(1,Math.ceil(group.amount/10)))},(_,i)=><span className="dollar-note" data-note={`${group.key}-${i}`} key={`${group.key}-${i}`}><span>$</span></span>))}</div>;
}
