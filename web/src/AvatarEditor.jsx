import React,{useRef,useState,useEffect} from 'react';
import {Modal,Button,Input} from 'animal-island-ui';
import {playerColor} from './presentation.js';
import {cropGeometry} from './avatar.js';
import './avatar.css';

export default function AvatarEditor({player,disabled,onClose,onSave}){
 const [name,setName]=useState(player.name),[avatar,setAvatar]=useState(player.avatar||''),[photo,setPhoto]=useState(null),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const gallery=useRef(null),camera=useRef(null),drag=useRef(null),request=useRef(0);
 useEffect(()=>()=>{request.current++;},[]);
 useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.src);},[photo]);
 const geometry=photo?cropGeometry(photo.width,photo.height,zoom,pan):null;
 async function select(e){
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  const ticket=++request.current;setError('');setLoading(true);
  if(file.size>30*1024*1024){setError('图片过大，请选择 30 MB 以内的照片');setLoading(false);return;}
  const url=URL.createObjectURL(file);let retained=false;
  try{const img=new Image();img.src=url;await img.decode();if(ticket!==request.current)return;
   retained=true;setPhoto(img);setZoom(1);setPan({x:0,y:0});
  }catch{if(ticket===request.current)setError('无法读取照片，请换一张 JPG 或 PNG');}
  finally{if(!retained)URL.revokeObjectURL(url);if(ticket===request.current)setLoading(false);}
 }
 async function adjust(){
  const ticket=++request.current;setLoading(true);setError('');
  try{const img=new Image();img.src=avatar;await img.decode();if(ticket!==request.current)return;setPhoto(img);setZoom(1);setPan({x:0,y:0});}catch{setError('照片无法读取，请重新选择');}finally{if(ticket===request.current)setLoading(false);}
 }
 function save(){
  let result=avatar;
  if(photo){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=playerColor(player);ctx.fillRect(0,0,128,128);const g=geometry;ctx.drawImage(photo,(120-g.width/2+g.x)*128/240,(120-g.height/2+g.y)*128/240,g.width*128/240,g.height*128/240);result=canvas.toDataURL('image/jpeg',.75);if(result.length>12000)result=canvas.toDataURL('image/jpeg',.45);}
  onSave(name.trim(),result);
 }
 return <Modal open title="编辑角色" typewriter={false} onClose={onClose} footer={<Button type="primary" disabled={disabled||loading||!name.trim()} onClick={save}>保存</Button>}>
  <div className="avatar-editor">
   <Input aria-label="名字" maxLength={16} value={name} onChange={e=>setName(e.target.value)}/>
   <div className={`avatar-crop ${photo?'editable':''}`} style={{background:playerColor(player)}} aria-label="头像预览，拖动调整位置"
    onPointerDown={e=>{if(!photo||drag.current)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,pan:{x:geometry.x,y:geometry.y},ratio:240/e.currentTarget.getBoundingClientRect().width};}}
    onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const next=cropGeometry(photo.width,photo.height,zoom,{x:d.pan.x+(e.clientX-d.x)*d.ratio,y:d.pan.y+(e.clientY-d.y)*d.ratio});setPan({x:next.x,y:next.y});}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
    {photo?<img src={photo.src} alt="裁剪预览" draggable="false" style={{width:geometry.width,height:geometry.height,transform:`translate(${geometry.x}px,${geometry.y}px)`}}/>:avatar?<img className="saved-avatar" src={avatar} alt="当前头像" draggable="false"/>:<span>{Array.from(name||player.name)[0]}</span>}
   </div>
   {photo&&<><span className="crop-hint">拖动照片 · 调整大小</span><label className="avatar-zoom"><span>－</span><input aria-label="头像大小" type="range" min="1" max="4" step="0.01" value={zoom} onChange={e=>{const value=Number(e.target.value);setZoom(value);const g=cropGeometry(photo.width,photo.height,value,pan);setPan({x:g.x,y:g.y});}}/><span>＋</span></label></>}
   <div className="avatar-actions">{avatar&&!photo&&<Button disabled={loading} onClick={adjust}>调整</Button>}<Button disabled={loading} onClick={()=>gallery.current.click()}>选照片</Button><Button disabled={loading} onClick={()=>camera.current.click()}>拍照</Button>{(photo||avatar)&&<Button onClick={()=>{request.current++;setLoading(false);setPhoto(null);setAvatar('');setError('');}}>用名字</Button>}</div>
   <input hidden ref={gallery} type="file" accept="image/*" onChange={select}/><input hidden ref={camera} type="file" accept="image/*" capture="user" onChange={select}/>
   {loading&&<small>读取中…</small>}{error&&<p role="alert">{error}</p>}
  </div>
 </Modal>;
}
