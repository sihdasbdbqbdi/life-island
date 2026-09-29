import React,{useEffect,useRef,useState} from 'react';
import {prepareAudio,playCardSound,playShuffleSound} from './sound.js';
export default function CardDraw({revealed,onReveal,reduced,sound,name,children}){
 const [phase,setPhase]=useState(revealed?'revealed':'shuffle');const locked=useRef(false),timer=useRef(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(phase!=='shuffle'||!sound)return;let live=true;void prepareAudio().then(()=>{if(live)playShuffleSound();});const id=setInterval(playShuffleSound,150);return()=>{live=false;clearInterval(id);};},[phase,sound]);
 function stop(){if(locked.current)return;locked.current=true;setPhase('flip');if(sound)void prepareAudio().then(()=>playCardSound());timer.current=setTimeout(()=>{onReveal();setPhase('revealed');},reduced?80:720);}
 if(phase==='revealed'||revealed)return <div className="card-revealed">{children}</div>;
 return <div className={`draw-experience ${phase}`}><p className="draw-owner">{name}</p><button className="draw-hitbox" onClick={stop} disabled={phase==='flip'} aria-label="停牌并抽出烧烧卡"><span className="shuffling-deck" aria-hidden="true">{[0,1,2,3].map(i=><span className="draw-back" key={i} style={{'--i':i}}><b>SAO</b><small>烧烧卡</small></span>)}</span></button><p className="draw-prompt" aria-live="polite">{phase==='shuffle'?'点击抽一张':'就是这张！'}</p></div>;
}
