import React,{useEffect,useRef,useState} from 'react';
export default function WalletAmount({value,reduced,arrivalDelay=0}) {
 const previous=useRef(value),shown=useRef(value),[display,setDisplay]=useState(value),[change,setChange]=useState(null);
 useEffect(()=>{
  const delta=Math.round((value-previous.current)*100)/100;previous.current=value;
  if(!delta){shown.current=value;setDisplay(value);setChange(null);return;}
  const from=shown.current;let frame,clear;
  const timer=setTimeout(()=>{const start=performance.now();setChange({delta,id:start});
   const update=now=>{const t=reduced?1:Math.min(1,(now-start)/650);const n=from+(value-from)*(1-Math.pow(1-t,3));shown.current=n;setDisplay(n);if(t<1)frame=requestAnimationFrame(update);};
   frame=requestAnimationFrame(update);clear=setTimeout(()=>setChange(null),1100);
  },reduced?0:arrivalDelay);
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(clear);};
 },[value,reduced]);
 return <span className={`wallet-amount ${change?'wallet-changing':''}`}><strong className="cash-number" aria-label={`余额 ${value}`}><small>$</small><span aria-hidden="true">{display.toLocaleString('zh-CN',{maximumFractionDigits:value%1?2:0})}</span></strong>{change&&<span key={change.id} aria-hidden="true" className={`money-burst ${change.delta>0?'gain':'loss'}`}><b>{change.delta>0?'+':''}{change.delta}</b></span>}</span>;
}
