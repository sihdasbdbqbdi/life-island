import React from 'react';
import {walkingLeaders} from './engine.js';
import {playerColor} from './presentation.js';
export default function WalkingLeader({state}){
 const {complete,steps,leaders}=walkingLeaders(state);
 return <section className="walking-leader" aria-label="行走步数领先" aria-live="polite">
  <span className="walking-leader-label">{complete?'本局行走最多':'已记录行走最多'}</span>
  {leaders.length?<><span className="walking-leader-names">{leaders.map(p=><strong key={p.id} style={{color:playerColor(p)}}>{p.name}</strong>)}</span><b>{steps} 步{leaders.length>1?' · 并列':''}</b></>:<span className="walking-leader-empty">{state.players.length?'尚未记录行走步数':'添加角色后开始统计'}</span>}
  <small>{complete?'只统计正常行走，特殊移动不计':'旧存档无法补算历史；仅统计更新后的正常行走'}</small>
 </section>;
}
