import React,{useEffect,useRef} from 'react';
import {ranked,money} from './engine.js';
import {playerColor} from './presentation.js';
import RankMedal from './RankMedal.jsx';
import './awards.css';
const fmt=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2});
export default function Awards({s,Pawn,onContinue,onDice,onFinish,onClose,onRecords,disabled=false}){
 const dialog=useRef(null),rankings=ranked(s),final=s.phase==='finished';
 useEffect(()=>{const el=dialog.current;const previous=document.activeElement;el.showModal();return()=>{el.close();previous?.focus?.();};},[]);
 return <dialog ref={dialog} className="awards-dialog" aria-labelledby="awards-title" onCancel={e=>{e.preventDefault();if(final)onClose();}}>
  <div className="awards-header"><span>{final?'本局落幕':`第 ${s.round} 轮`}</span><h2 id="awards-title">{final?'最终荣耀':'本轮颁奖'}</h2>{!final&&<button className="award-dice" aria-label="切换下轮骰子" disabled={disabled} onClick={onDice}>{s.rules.diceSides||12} 面骰 ↻</button>}</div>
  <div className="award-scene" aria-label="前三名颁奖台">
   <div className="award-confetti" aria-hidden="true">{Array.from({length:30},(_,i)=><i key={i} style={{'--delay':`${-(i*.37)}s`,'--time':`${2.6+i%5*.27}s`,'--left':`${i%2?96:4}%`,'--dx':`${(i%2?-1:1)*(35+(i*23)%200)}px`,'--color':['#ffcd38','#64dbce','#f17dbc','#a886ef'][i%4]}}/>)}</div>
   <div className="award-flashes" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{left:`${8+i*16}%`,top:`${20+(i%3)*14}%`,animationDelay:`${i*.8}s`}}/>)}</div>
   <div className="podium-row">{[1,0,2].map(index=>{const p=rankings[index];return <div key={index} className={`podium-place place-${index+1} ${p?'':'empty'}`}>
    {p&&<><div className="winner-character" style={{'--celebrate-delay':`${-index*2.1}s`}}><Pawn p={p}/></div><strong className="podium-name" style={{color:playerColor(p)}}>{p.name}</strong></>}
    <div className="podium-block"><RankMedal rank={index+1}/><b>{index+1}</b></div>
   </div>;})}</div>
   <div className="award-crowd" aria-label="其他玩家鼓掌">{rankings.slice(3).map((p,i)=><div className="clapping-character" key={p.id} style={{'--clap-delay':`${-i*.17}s`}}><div className="crowd-pawn"><Pawn p={p}/></div><span style={{color:playerColor(p)}}>{p.name}</span></div>)}</div>
  </div>
  <table className="award-scores"><thead><tr><th>排名</th><th>玩家</th><th>总财富</th><th>本轮</th></tr></thead><tbody>{rankings.map((p,i)=>{const change=money(p.cash-p.roundStart);return <tr key={p.id}><td><RankMedal rank={i+1}/></td><th scope="row" style={{color:playerColor(p)}}>{p.name}</th><td>{fmt(p.cash)}$</td><td className={change<0?'loss':'gain'}>{change>0?'+':''}{fmt(change)}$</td></tr>;})}</tbody></table>
  <footer className="award-actions"><button disabled={disabled} onClick={onRecords}>保存本回合记录</button>{final?<button autoFocus onClick={onClose}>关闭</button>:<><button className="award-continue" autoFocus disabled={disabled} onClick={onContinue}>继续</button><button disabled={disabled} onClick={onFinish}>结束</button></>}</footer>
 </dialog>;
}
