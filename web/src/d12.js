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
export function rotate(q,v){const [x,y,z,w]=q,[a,b,c]=v;return [(w*w+x*x-y*y-z*z)*a+2*(x*y-w*z)*b+2*(x*z+w*y)*c,2*(x*y+w*z)*a+(w*w-x*x+y*y-z*z)*b+2*(y*z-w*x)*c,2*(x*z-w*y)*a+2*(y*z+w*x)*b+(w*w-x*x-y*y+z*z)*c];}
export function faceOrientation(value,sides=12){const list=diceFaces(sides),f=list[value-1]||list[0],z=[0,0,1],axis=cross(f.normal,z);let q;if(Math.hypot(...axis)<1e-6)q=f.normal[2]>0?[0,0,0,1]:qAxis([1,0,0],Math.PI);else q=qAxis(norm(axis),Math.acos(Math.min(1,Math.max(-1,dot(f.normal,z)))));const u=rotate(q,f.u);return qMultiply(qAxis(z,-Math.atan2(u[1],u[0])-.09),q);}
export function qSlerp(a,b,t){let cos=dot(a,b);if(cos<0){b=scale(b,-1);cos=-cos;}if(cos>.9995)return norm(add(scale(a,1-t),scale(b,t)));const theta=Math.acos(Math.min(1,cos));return add(scale(a,Math.sin((1-t)*theta)/Math.sin(theta)),scale(b,Math.sin(t*theta)/Math.sin(theta)));}
export const ROLL_MS=1800;
// 六面立方体与二十四面四角化立方体，共用真实面朝向计算。
function polyFace(points,value){const center=scale(points.reduce(add,[0,0,0]),1/points.length);let normal=norm(cross(sub(points[1],points[0]),sub(points[2],points[0])));if(dot(normal,center)<0)normal=scale(normal,-1);const u=norm(sub(points[0],center)),v=scale(cross(normal,u),-1);return {vertices:points,center,normal,u,v,value};}
const cube=[];for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const other=[0,1,2].filter(i=>i!==axis);const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const v=[0,0,0];v[axis]=sign;v[other[0]]=a;v[other[1]]=b;return v;});cube.push(polyFace(points,cube.length+1));}
const twentyFour=[];for(const f of cube){const tip=scale(f.normal,1.6);for(let i=0;i<4;i++)twentyFour.push(polyFace([f.vertices[i],f.vertices[(i+1)%4],tip],twentyFour.length+1));}
export const diceFaces=sides=>sides===6?cube:sides===24?twentyFour:D12_FACES;
