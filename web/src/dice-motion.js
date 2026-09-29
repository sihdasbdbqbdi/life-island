import {qMultiply,qAxis,norm,scale} from './d12.js';
export const CHARGE_MS=1500;
export function aimAngle(x,y){return Math.hypot(x,y)>=14?Math.atan2(-y,-x):null;}
export function rollEase(progress){const t=Math.max(0,Math.min(1,progress));return 1-(1-t)**4;}
// Reflect travel at the board edge without pulling toward any stopping point.
export function reflectedPosition(start,travel,bound){
 if(bound<=0)return {position:0,direction:1};
 const width=bound*2,period=width*2,u=((start+bound+travel)%period+period)%period;
 return {position:(u<=width?u:period-u)-bound,direction:u<width?1:-1};
}
// One continuous rotation: bake the result into the whole throw, never align it late.
export function createRollOrientation(from,target,power=0){
 let relative=norm(qMultiply(target,[-from[0],-from[1],-from[2],from[3]]));
 if(relative[3]<0)relative=scale(relative,-1);
 const angle=2*Math.acos(Math.max(-1,Math.min(1,relative[3])));
 const axis=Math.hypot(...relative.slice(0,3))<1e-8?norm([.7,1,.35]):norm(relative.slice(0,3));
 const total=Math.PI*(8+Math.round(Math.max(0,Math.min(1,power))*6)*2)+angle;
 return progress=>{const t=Math.max(0,Math.min(1,progress));return qMultiply(qAxis(axis,total*rollEase(t)),from);};
}
