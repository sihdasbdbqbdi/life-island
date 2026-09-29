import React,{useEffect,useRef} from 'react';
import {diceFaces,faceOrientation,rotate,qMultiply,qAxis,qSlerp,add,scale,dot,ROLL_MS} from './d12.js';

function paint(canvas,q,bounce=0,sides=12){
 const ctx=canvas.getContext('2d');if(!ctx)return;const size=210,dpr=Math.min(devicePixelRatio||1,2);
 if(canvas.width!==size*dpr){canvas.width=size*dpr;canvas.height=size*dpr;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
 ctx.save();ctx.translate(105,181);ctx.scale(1,.24);const shadow=ctx.createRadialGradient(0,0,2,0,0,64-bounce*.3);shadow.addColorStop(0,'rgba(0,0,0,.6)');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,65,0,Math.PI*2);ctx.fill();ctx.restore();
 const project=v=>{const perspective=6.5/(6.5-v[2]);return [105+v[0]*40*perspective,107-v[1]*40*perspective-bounce];};
 const visible=diceFaces(sides).map(f=>({...f,n:rotate(q,f.normal),c:rotate(q,f.center),points:f.vertices.map(v=>rotate(q,v))})).filter(f=>dot(f.n,[-f.c[0],-f.c[1],6.5-f.c[2]])>0).sort((a,b)=>a.c[2]-b.c[2]);
 for(const f of visible){
  const pts=f.points.map(project),light=Math.max(0,dot(f.n,[-.35,.55,.76]));const r=Math.round(180+75*light),g=Math.round(115+76*light),b=31;
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
  ctx.fillStyle=`rgb(${r},${g},${b})`;ctx.fill();ctx.strokeStyle='#0a0b0e';ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.stroke();
  const center=project(f.c),u=project(add(f.c,scale(rotate(q,f.u),.6))),v=project(add(f.c,scale(rotate(q,f.v),.6)));
  ctx.save();ctx.transform((u[0]-center[0])/24,(u[1]-center[1])/24,(v[0]-center[0])/24,(v[1]-center[1])/24,...center);ctx.fillStyle='#111318';ctx.font=`900 ${sides===24?16:23}px Nunito, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(f.value),0,1);if(f.value===6||f.value===9){ctx.fillRect(-4,13,8,1.3);}ctx.restore();
 }
}
export default function Dice({value=12,sides=12,rolling=false,reduced=false}){
 const canvas=useRef(null),orientation=useRef(faceOrientation(value,sides)),position=useRef({x:0,y:0});
 useEffect(()=>{let raf;const start=performance.now(),from=orientation.current,target=faceOrientation(value,sides);
  let previous=start,x=rolling?0:position.current.x,y=rolling?0:position.current.y,vx=(Math.random()<.5?-1:1)*.8,vy=(Math.random()<.5?-1:1)*.48;
  const node=canvas.current,area=node.closest(".dice-hitbox");const boundX=Math.max(0,(area.clientWidth-node.clientWidth)/2-8),boundY=Math.max(0,(area.clientHeight-node.clientHeight)/2-5);
  const frame=now=>{let q=target,bounce=0;
   if(rolling&&!reduced){const dt=Math.min(32,now-previous);previous=now;x+=vx*dt;y+=vy*dt;
    if(Math.abs(x)>boundX){x=Math.sign(x)*boundX;vx*=-.82;}if(Math.abs(y)>boundY){y=Math.sign(y)*boundY;vy*=-.82;}vx*=Math.pow(.985,dt/16);vy*=Math.pow(.985,dt/16);
    const t=Math.min((now-start)/ROLL_MS,1),ease=1-(1-t)**3,spin=qMultiply(qAxis([0,1,0],(1-ease)*Math.PI*6),qAxis([1,0,0],(1-ease)*Math.PI*4));q=qMultiply(spin,qSlerp(from,target,ease));bounce=Math.abs(Math.sin(t*Math.PI*4))*22*(1-t);}
   if(reduced){x=0;y=0;}x=Math.max(-boundX,Math.min(boundX,x));y=Math.max(-boundY,Math.min(boundY,y));position.current={x,y};node.style.transform=`translate(${x}px,${y}px)`;orientation.current=q;paint(canvas.current,q,bounce,sides);if(rolling&&!reduced&&now-start<ROLL_MS)raf=requestAnimationFrame(frame);
  };raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[value,sides,rolling,reduced]);
 return <canvas ref={canvas} className="d12-dice" role="img" aria-label={rolling?`${sides}面骰正在滚动`:`${sides}面骰 ${value} 点`}/>;
}
