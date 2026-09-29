import React,{useEffect,useRef,useState} from 'react';
import {prepareAudio,playCardSound,playShuffleSound} from './sound.js';
export default function CardDraw({revealed,onReveal,reduced,sound,name,children}){
 const [phase,setPhase]=useState(revealed?'revealed':'shuffle'),[celebrate,setCelebrate]=useState(false);
 const locked=useRef(false),timer=useRef(null),shineTimer=useRef(null),gesture=useRef(null),button=useRef(null);
 useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(shineTimer.current);},[]);
 useEffect(()=>{if(phase!=='shuffle'||!sound)return;let live=true;void prepareAudio().then(()=>{if(live)playShuffleSound();});const id=setInterval(playShuffleSound,150);return()=>{live=false;clearInterval(id);};},[phase,sound]);
 function draw(){if(locked.current)return;locked.current=true;setPhase('flip');button.current?.style.setProperty('--pull','0px');if(sound)void prepareAudio().then(()=>playCardSound());timer.current=setTimeout(()=>{onReveal();setCelebrate(true);setPhase('revealed');if(sound)playCardSound();shineTimer.current=setTimeout(()=>setCelebrate(false),1000);},reduced?100:950);}
 function begin(e){if(phase!=='shuffle')return;gesture.current={y:e.clientY,time:performance.now(),distance:0};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('dragging');}
 function move(e){if(!gesture.current)return;const distance=Math.max(0,gesture.current.y-e.clientY);gesture.current.distance=distance;e.currentTarget.style.setProperty('--pull',`${Math.min(distance,130)*.7}px`);}
 function release(e){const g=gesture.current;gesture.current=null;e.currentTarget.classList.remove('dragging');e.currentTarget.style.setProperty('--pull','0px');if(g&&(g.distance>55||(g.distance>25&&g.distance/(performance.now()-g.time)>.45)))draw();}
 if(phase==='revealed'||revealed)return <div className="card-revealed">{celebrate&&<div className="card-sparkles" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{'--angle':`${i*45}deg`,'--delay':`${i%3*40}ms`}}/>)}</div>}{children}</div>;
 return <div className={`draw-experience ${phase}`}><p className="draw-owner">{name}</p><button ref={button} className="draw-hitbox" onPointerDown={begin} onPointerMove={move} onPointerUp={release} onPointerCancel={e=>{gesture.current=null;e.currentTarget.classList.remove('dragging');e.currentTarget.style.setProperty('--pull','0px');}} onClick={e=>{if(e.detail===0)draw();}} disabled={phase==='flip'} aria-label="向上滑动抽出烧烧卡，键盘可按回车"><span className="shuffling-deck" aria-hidden="true">{[0,1,2,3].map(i=><span className="draw-back" key={i} style={{'--i':i}}><b>SAO</b><small>烧烧卡</small></span>)}</span></button><p className="draw-prompt" aria-live="polite">{phase==='shuffle'?'↑ 上滑抽一张':'就是这张！'}</p></div>;
}
