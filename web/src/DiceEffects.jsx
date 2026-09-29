import React,{forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {createPortal} from 'react-dom';
// Particles finish fading independently after the die has stopped.
export default forwardRef(function DiceEffects(_,ref){
 const canvas=useRef(null),items=useRef([]),raf=useRef(0),lastFrame=useRef(0);
 function add(item){items.current.push({...item,born:performance.now()});if(items.current.length>360)items.current.splice(0,items.current.length-360);if(!raf.current)raf.current=requestAnimationFrame(draw);}
 function draw(now){
  if(now-lastFrame.current<30){raf.current=requestAnimationFrame(draw);return;}lastFrame.current=now;
  const node=canvas.current;if(!node){raf.current=0;return;}const ratio=1,w=innerWidth,h=innerHeight;
  if(node.width!==Math.round(w*ratio)||node.height!==Math.round(h*ratio)){node.width=Math.round(w*ratio);node.height=Math.round(h*ratio);}
  const c=node.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,w,h);
  items.current=items.current.filter(p=>now-p.born<p.life);
  for(const p of items.current){const t=(now-p.born)/p.life;c.save();
   if(p.type==='ember'){c.globalAlpha=(1-t)*.7;c.fillStyle=p.color;c.beginPath();c.arc(p.x+p.dx*t,p.y-20*t,p.size*(1-t*.7),0,Math.PI*2);c.fill();}
   if(p.type==='smoke'){c.globalAlpha=(1-t)*.4;c.fillStyle='#060607';c.beginPath();c.arc(p.x+p.dx*t,p.y-36*t,p.size*(.5+t),0,Math.PI*2);c.fill();}
   if(p.type==='dirt'){const travel=Math.min(1,t/.8),phase=t<.44?t/.44:t<.72?(t-.44)/.28:(t-.72)/.28,jump=t<.44?42:t<.72?16:0;const lift=jump*4*phase*(1-phase);c.globalAlpha=Math.min(1,(1-t)*4);c.translate(p.x+p.dx*travel,p.y+p.dy*travel-lift);c.rotate(p.spin*t);c.fillStyle=p.color;c.strokeStyle='#29180e';c.lineWidth=1.5;c.beginPath();c.roundRect(-p.size/2,-p.size/2,p.size,p.size,2);c.fill();c.stroke();}
   c.restore();
  }
  raf.current=items.current.length?requestAnimationFrame(draw):0;
 }
 useImperativeHandle(ref,()=>({
  launch(x,y){for(let i=0;i<14;i++){const angle=i*Math.PI*2/14,distance=45+Math.random()*60;add({type:'dirt',x,y,dx:Math.cos(angle)*distance,dy:Math.sin(angle)*distance*.55,size:5+Math.random()*8,spin:(Math.random()-.5)*9,color:i%2?'#985c2c':'#c3894a',life:1100+Math.random()*180});}},
  trail(x,y,full){if(full){add({type:'ember',x,y,dx:(Math.random()-.5)*24,size:5+Math.random()*13,color:Math.random()>.5?'#f04420':'#ff732d',life:420+Math.random()*220});}add({type:'smoke',x,y,dx:(Math.random()-.5)*30,size:7+Math.random()*11,life:900+Math.random()*400});},
 }),[]);
 useEffect(()=>()=>{cancelAnimationFrame(raf.current);items.current=[];},[]);
 return createPortal(<canvas ref={canvas} className="dice-ground-effects" aria-hidden="true"/>,document.body);
});
