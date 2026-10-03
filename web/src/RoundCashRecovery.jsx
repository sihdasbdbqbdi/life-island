import React,{useState,useRef,useEffect} from 'react';import {Modal,Button,Input} from 'animal-island-ui';
export default function RoundCashRecovery({state,disabled,onClose,onSave}){
 const old=state.snapshots.find(r=>r.round===2),roles=[...(old?.players||[])];for(const p of state.players)if(!roles.some(r=>r.id===p.id))roles.push(p);
 const [values,setValues]=useState({}),[preview,setPreview]=useState(false),[error,setError]=useState('');
 const fields=useRef(null);useEffect(()=>{if(fields.current)fields.current.scrollTop=0;},[preview]);
 const changes=roles.filter(p=>values[p.id]!==undefined&&values[p.id].trim()!=='').map(p=>({id:p.id,cash:Number(values[p.id])}));
 const invalid=changes.some(p=>!Number.isFinite(p.cash)||Math.abs(p.cash)>1e12);
 return <Modal open title="补录第二轮资金" typewriter={false} onClose={onClose} footer={<><Button onClick={preview?()=>setPreview(false):onClose}>{preview?'返回修改':'取消'}</Button><Button type="primary" disabled={disabled||invalid||!changes.length} onClick={()=>{if(!preview){setPreview(true);return;}try{onSave(changes);}catch(e){setError(e.message);}}}>{preview?'备份并保存历史记录':'预览补录'}</Button></>}>
  <p>只改第二轮历史资金，当前余额、角色、其他轮次和步数不变。留空的角色不修改；保存前下载原存档，保存后可撤销。</p>
  {!old&&<p className="muted">第二轮记录缺失：仅补录已填写角色的资金，未知位置与本轮变化显示 —。正常完成本轮时保留已确认金额。</p>}
  <div className="round-cash-fields" ref={fields}>{(preview?roles.filter(p=>changes.some(c=>c.id===p.id)):roles).map(p=>{const existing=old?.players.find(x=>x.id===p.id);return <label key={p.id} className="round-cash-row"><span><strong>{p.name}</strong><small>原记录：{existing?`$${existing.cash}`:'未记录'}</small></span>{preview?<b>→ ${Number(values[p.id])}</b>:<Input aria-label={`${p.name}第二轮资金`} type="number" step="0.01" placeholder="留空不修改" value={values[p.id]??''} onChange={e=>setValues(v=>({...v,[p.id]:e.target.value}))}/>}</label>;})}</div>
  {preview&&<p><strong>确认补录 {changes.length} 位角色的第二轮资金；这不会同步修改当前余额。</strong></p>}
  {invalid&&<p role="alert">资金格式不正确</p>}{error&&<p role="alert">{error}</p>}
 </Modal>;
}
