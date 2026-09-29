// 本地合成木质骰子碰撞声，不需要下载音频。
let context;
export async function prepareAudio(){
  try {const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return null;
    context??=new C();if(context.state==='suspended')await context.resume();return context;
  }catch{return null;}
}
function impact(ctx,time,strength,pan=0){
  const length=Math.ceil(ctx.sampleRate*.075),buffer=ctx.createBuffer(1,length,ctx.sampleRate),samples=buffer.getChannelData(0);
  for(let i=0;i<length;i++)samples[i]=(Math.random()*2-1)*Math.exp(-i/(ctx.sampleRate*.013));
  const noise=ctx.createBufferSource();noise.buffer=buffer;
  const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1300+strength*1700;filter.Q.value=.65;
  const gain=ctx.createGain();gain.gain.setValueAtTime(strength*.45,time);gain.gain.exponentialRampToValueAtTime(.001,time+.09);
  const panner=ctx.createStereoPanner();panner.pan.value=pan;noise.connect(filter).connect(gain).connect(panner).connect(ctx.destination);noise.start(time);noise.stop(time+.1);
  const body=ctx.createOscillator(),bodyGain=ctx.createGain();body.type='sine';body.frequency.setValueAtTime(210,time);body.frequency.exponentialRampToValueAtTime(90,time+.055);bodyGain.gain.setValueAtTime(strength*.09,time);bodyGain.gain.exponentialRampToValueAtTime(.001,time+.065);body.connect(bodyGain).connect(ctx.destination);body.start(time);body.stop(time+.07);
}
export function playDiceSound(){if(!context||context.state!=='running')return;const now=context.currentTime;[0,.115,.265,.445,.655,.9,1.05].forEach((t,i)=>impact(context,now+t,.95-i*.1,-.3+i*.08));}
export function playStepSound(){if(context?.state==='running')impact(context,context.currentTime,.13,0);}
export function stopAudio(){if(context){void context.close().catch(()=>{});context=undefined;}}
function chime(ctx,frequency,time,duration,volume,type='sine'){
 const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(.001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.001,time+duration);oscillator.connect(gain).connect(ctx.destination);oscillator.start(time);oscillator.stop(time+duration+.02);
}
// 收银机：短促的咔声，接明亮的金属双音。
export function playMoneySound(amount=10,tick=false,index=0){if(context?.state!=='running')return;const t=context.currentTime;if(tick){chime(context,1100+Math.min(index,16)*65,t,.09,.035);return;}const count=Math.min(18,3+Math.ceil(amount/15));impact(context,t,.3);
 const notes=[784,988,1175,1568,1976,2350];
 for(let i=0;i<count;i++){const at=t+i*.075;chime(context,notes[i%6],at,.23,.055,'triangle');chime(context,notes[i%6]*2,at+.015,.18,.025);}
 const finish=t+count*.075;[1568,1976,2350,3136].forEach((f,i)=>chime(context,f,finish+i*.045,.75,.045));}
// 抽卡：轻快上扬，与金币声区分；可与到账声错开。
export function playCardSound(delay=0){if(context?.state!=='running')return;const t=context.currentTime+delay;[523,784,1047].forEach((f,i)=>chime(context,f,t+i*.065,.19,.085,'triangle'));}
export function playShuffleSound(){if(context?.state==='running')impact(context,context.currentTime,.07);}
export function playLossSound(amount=10){if(context?.state!=='running')return;const t=context.currentTime;impact(context,t,.25);const count=Math.min(8,3+Math.ceil(amount/50));for(let i=0;i<count;i++)chime(context,660*Math.pow(.8,i),t+i*.085,.26,.07,'triangle');chime(context,110,t+count*.085,.4,.06);}
