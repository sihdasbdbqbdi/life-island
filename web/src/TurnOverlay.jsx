import React, {useEffect, useRef, useState} from 'react';
import {playerColor} from './presentation.js';
export default function TurnOverlay({player, players, sorting, carry, onConfirm, disabled}) {
  const dialog=useRef(null), [digits,setDigits]=useState('');
  useEffect(()=>{dialog.current.showModal();return()=>dialog.current?.close();},[]);
  useEffect(()=>setDigits(''),[player?.id]);
  const key=value=>setDigits(old=>value==='清空'?'':value==='退格'?old.slice(0,-1):(old==='0'?value:old+value).slice(0,3));
  return <dialog ref={dialog} className="turn-dialog" onCancel={e=>e.preventDefault()} aria-label={sorting?'随机排序':'录入本轮积分'} onKeyDown={e=>{if(disabled||sorting)return;if(/^\d$/.test(e.key)){e.preventDefault();key(e.key);}else if(e.key==='Backspace'){e.preventDefault();key('退格');}}}>
    {sorting?<div className="sort-stage"><h2>随机排序</h2><div className="sort-list">{players.map((p,i)=><div key={p.id} style={{'--delay':`${i*35}ms`,color:playerColor(p)}}><span>{i+1}</span>{p.name}</div>)}</div></div>:<form onSubmit={e=>{e.preventDefault();if(digits!==''&&!disabled)onConfirm(Number(digits));}}>
      <p className="turn-eyebrow">轮到你了</p><h2 style={{color:playerColor(player)}}>{player.name}</h2>
      <label className="score-label">本轮积分<input aria-label="本轮积分" value={digits} readOnly inputMode="none" placeholder="0" /></label>
      <p className="carry-note">余分 {carry} · 共 {carry+Number(digits||0)} 分</p>
      <div className="number-pad">{['1','2','3','4','5','6','7','8','9','清空','0','退格'].map(n=><button type="button" key={n} disabled={disabled} onClick={()=>key(n)}><span>{n}</span></button>)}</div>
      <button className="confirm-score" disabled={digits===''||disabled}><span>确认</span></button>
    </form>}
  </dialog>;
}
