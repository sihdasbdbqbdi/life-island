import React,{useEffect,useState} from 'react';
import {Modal,Button} from 'animal-island-ui';
import {toBlob} from 'html-to-image';
import {ranked} from './engine.js';
export function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function buildRecords(state,board){
 const stamp=new Date().toLocaleString('zh-CN'),id=state.createdAt.replace(/[^0-9]/g,'').slice(0,14),label=state.phase==='finished'?(state.endedEarly?'提前结束':'最终排名'):`第${state.round}回合`;
 const prefix=`人生大富翁-${id}-${label}`,players=ranked(state);
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=220+players.length*75;const ctx=canvas.getContext('2d');ctx.fillStyle='#171b25';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ffcd38';ctx.font='bold 38px sans-serif';ctx.fillText(`人生大富翁 · ${label}`,40,65);ctx.fillStyle='#dce5ee';ctx.font='22px sans-serif';ctx.fillText(`局编号 ${id} · 第 ${state.round} 回合 · ${stamp}`,40,108);ctx.fillText('名次',40,160);ctx.fillText('角色',140,160);ctx.fillText('资金／存款',610,160);ctx.fillText('位置',875,160);
 players.forEach((p,i)=>{const y=215+i*75;ctx.fillStyle='#ffffff';ctx.font='26px sans-serif';const rank=players.findIndex(t=>t.cash===p.cash)+1;ctx.fillText(String(rank),45,y);ctx.fillText(p.name,140,y);ctx.fillText(Number(p.cash).toLocaleString('zh-CN'),610,y);ctx.fillText(String(p.pos+1),875,y);});
 const ranking=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!ranking||!board)throw Error('排名或地图无法生成，请保留本局后重试');
 const map=await toBlob(board,{pixelRatio:2,backgroundColor:'#171b25',skipFonts:true,filter:n=>n.tagName!=='BUTTON',style:{animation:'none',transform:'none'}});if(!map)throw Error('地图截图生成失败');
 const image=new Image(),url=URL.createObjectURL(map);image.src=url;try{await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height+150;const g=c.getContext('2d');g.fillStyle='#171b25';g.fillRect(0,0,c.width,c.height);g.fillStyle='#fff';g.font=`${Math.min(32,c.width/24)}px sans-serif`;g.fillText(`${state.phase==='finished'?label:'人生大富翁'} · 第 ${state.round} 回合`,20,45);g.fillText(`局 ${id} · ${stamp}`,20,90);g.drawImage(image,0,150);const titled=await new Promise(r=>c.toBlob(r,'image/png'));if(!titled)throw Error('地图截图生成失败');return {prefix,ranking,map:titled,save:new Blob([JSON.stringify({app:'人生小岛',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'})};}finally{URL.revokeObjectURL(url);}
}
export default function GameRecords({state,onClose,onClean}){
 const [files,setFiles]=useState(null),[error,setError]=useState(''),[sent,setSent]=useState({}),[checked,setChecked]=useState(false);
 useEffect(()=>{let active=true;buildRecords(state,document.querySelector('.board')).then(f=>{if(active)setFiles(f);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[state]);
 const download=(key,suffix)=>{saveBlob(files[key],files.prefix+suffix);setSent(p=>({...p,[key]:true}));};
 return <Modal open title={state.phase==='finished'?'保存本局记录':'保存本回合记录'} typewriter={false} onClose={onClose} footer={<Button onClick={onClose}>保留本局，关闭</Button>}>
 <p>回合／轮：所有人完成本轮掷骰。局：多个回合组成的一场游戏。图片便于查看，JSON 存档用于恢复。</p>
 {!files&&!error&&<p role="status">正在生成完整排名及地图截图…</p>}{error&&<p role="alert">{error}。本局数据未清理。</p>}
 {files&&<div className="record-actions"><Button block onClick={()=>download('ranking','-排名与存款.png')}>保存排名与存款图片</Button><Button block onClick={()=>download('map','-地图.png')}>保存大富翁地图截图</Button><Button block onClick={()=>download('save','.json')}>保存可恢复存档</Button><p>手机可在下载列表中打开图片，再保存到相册。请分别点击，避免浏览器拦截多个下载。</p>
 {state.phase==='finished'&&<><label><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/> 我已确认两张图片和存档保存到本地</label><Button danger block disabled={!checked||!sent.ranking||!sent.map||!sent.save} onClick={onClean}>保存完成，清理本局</Button><small>清理本局角色、资金、回合和撤销记录；保留全局设置。此操作不可撤销。</small></>}
 </div>}
 </Modal>;
}
