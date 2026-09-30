import React,{useId} from 'react';
import {playerColor} from './presentation.js';
import art from './pawn-art.js';
import './pawn.css';
export default function Pawn({p,walking=false}){
 const id=useId().replace(/:/g,'');const left=`${id}-left`,right=`${id}-right`,torso=`${id}-torso`;
 const stroke={fill:'currentColor',stroke:'#000',strokeWidth:art.stroke,strokeLinejoin:'round',strokeLinecap:'round'};
 return <span className={`little-person psd-pawn ${walking?'walking':''}`} style={{color:playerColor(p),'--idle-delay':`${-(p.id.charCodeAt(0)%7)}s`}}>
  <span className="person-figure">
   <svg className="person-highlight" viewBox="0 0 40 56" aria-hidden="true"><path d={art.head}/><path d={art.body}/><path d={art.leftArm}/><path d={art.rightArm}/></svg>
   <svg className="person-body" viewBox="0 0 40 56" aria-hidden="true">
    <defs><clipPath id={torso}><rect x="-10" y="-10" width="60" height={art.legSplitY+10}/></clipPath><clipPath id={left}><rect x="-10" y={art.legSplitY} width={art.legSplitX+10} height="40"/></clipPath><clipPath id={right}><rect x={art.legSplitX} y={art.legSplitY} width="40" height="40"/></clipPath></defs>
    <g className="leg leg-left"><g clipPath={`url(#${left})`}><path d={art.body} {...stroke}/></g></g>
    <g className="leg leg-right"><g clipPath={`url(#${right})`}><path d={art.body} {...stroke}/></g></g>
    <g clipPath={`url(#${torso})`}><path d={art.body} {...stroke}/></g>
    <path className="arm arm-left" d={art.leftArm} {...stroke}/><path className="arm arm-right" d={art.rightArm} {...stroke}/>
    <path d={art.leftButton} fill="#ff285d"/><path d={art.rightButton} fill="#ff285d"/>
   </svg>
   <span className="token small" style={{background:playerColor(p)}} title={p.name}>{p.avatar?<img src={p.avatar} alt="" draggable="false"/>:<span>{Array.from(p.name)[0]}</span>}</span>
   <svg className="raised-arms" viewBox="0 0 40 56" aria-hidden="true"><path d={art.leftArm} transform="translate(-5 -30)" {...stroke}/><path d={art.rightArm} transform="translate(5 -30)" {...stroke}/></svg>
  </span>
 </span>;
}
