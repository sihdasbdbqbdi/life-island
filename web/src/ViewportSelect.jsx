import React,{useState,useRef,useEffect,useId} from 'react';
// In-flow list keeps the complete picker inside any drawer or zoomed viewport.
export default function ViewportSelect({options,value,onChange,disabled,'aria-label':label='选择人物或地图格子'}){
 const [open,setOpen]=useState(false),[active,setActive]=useState(0),root=useRef(null),trigger=useRef(null),list=useRef(null),id=useId();
 useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 useEffect(()=>{if(open)list.current?.children[active]?.scrollIntoView({block:'nearest'});},[open,active]);
 function show(){setActive(Math.max(0,options.findIndex(o=>o.key===value)));setOpen(true);}
 function choose(index){if(!options[index])return;onChange(options[index].key);setOpen(false);trigger.current?.focus();}
 function key(e){if(disabled)return;const k=e.key;if(k==='Escape'&&open){e.stopPropagation();e.preventDefault();setOpen(false);return;}
 if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(k)){e.preventDefault();e.stopPropagation();if(!open){show();return;}if(k==='Enter'||k===' ')choose(active);else setActive(k==='Home'?0:k==='End'?options.length-1:Math.max(0,Math.min(options.length-1,active+(k==='ArrowDown'?1:-1))));}}
 return <div className="viewport-select" ref={root} onKeyDown={key} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <button type="button" ref={trigger} className="viewport-select-trigger" disabled={disabled} role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} onClick={()=>open?setOpen(false):show()}>{options.find(o=>o.key===value)?.label||'请选择'}<span aria-hidden="true">{open?'⌃':'⌄'}</span></button>
  {open&&<div className="viewport-select-list" id={id} ref={list} role="listbox" aria-label={label}>{options.map((o,i)=><div id={`${id}-${i}`} key={o.key} role="option" aria-selected={o.key===value} className={i===active?'active':''} onPointerMove={()=>setActive(i)} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(i)}>{o.label}{o.key===value&&<span aria-hidden="true">✓</span>}</div>)}</div>}
 </div>;
}
