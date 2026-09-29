const PHI=(1+Math.sqrt(5))/2;
export const add=(a,b)=>a.map((x,i)=>x+b[i]);
export const sub=(a,b)=>a.map((x,i)=>x-b[i]);
export const scale=(a,n)=>a.map(x=>x*n);
export const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>scale(a,1/Math.hypot(...a));
const vertices=[];
for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1])vertices.push([a,b,c]);
for(const a of [-1,1])for(const b of [-1,1])vertices.push([0,a/PHI,b*PHI],[a/PHI,b*PHI,0],[a*PHI,0,b/PHI]);
const faces=[],seen=new Set();
for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
  let n=cross(sub(vertices[j],vertices[i]),sub(vertices[k],vertices[i]));if(Math.hypot(...n)<1e-7)continue;n=norm(n);
  let d=dot(n,vertices[i]);if(d<0){n=scale(n,-1);d=-d;}
  if(vertices.some(v=>dot(n,v)>d+1e-6))continue;
  const indices=vertices.map((v,id)=>Math.abs(dot(n,v)-d)<1e-6?id:-1).filter(id=>id>=0);
  if(indices.length!==5)continue;const key=indices.join(',');if(seen.has(key))continue;seen.add(key);
  const center=scale(n,d),u=norm(sub(vertices[indices[0]],center)),v=cross(n,u);
  indices.sort((a,b)=>Math.atan2(dot(sub(vertices[a],center),v),dot(sub(vertices[a],center),u))-Math.atan2(dot(sub(vertices[b],center),v),dot(sub(vertices[b],center),u)));
  faces.push({normal:n,center,u,v:scale(v,-1),vertices:indices.map(id=>vertices[id]),value:faces.length+1});
}
export const D12_FACES=faces;
export function qMultiply(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
export function qAxis(axis,angle){const s=Math.sin(angle/2);return [...scale(axis,s),Math.cos(angle/2)];}
export function rotate(q,v){const u=q.slice(0,3),s=q[3];return add(add(scale(u,2*dot(u,v)),scale(v,s*s-dot(u,u))),scale(cross(u,v),2*s));}
export function faceOrientation(value){const f=faces[value-1]||faces[0],z=[0,0,1],axis=cross(f.normal,z);let q;if(Math.hypot(...axis)<1e-6)q=f.normal[2]>0?[0,0,0,1]:qAxis([1,0,0],Math.PI);else q=qAxis(norm(axis),Math.acos(Math.min(1,Math.max(-1,dot(f.normal,z)))));const u=rotate(q,f.u);return qMultiply(qAxis(z,-Math.atan2(u[1],u[0])-.09),q);}
export function qSlerp(a,b,t){let cos=dot(a,b);if(cos<0){b=scale(b,-1);cos=-cos;}if(cos>.9995)return norm(add(scale(a,1-t),scale(b,t)));const theta=Math.acos(Math.min(1,cos));return add(scale(a,Math.sin((1-t)*theta)/Math.sin(theta)),scale(b,Math.sin(t*theta)/Math.sin(theta)));}
export const ROLL_MS=1150;
