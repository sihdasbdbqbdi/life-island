// One continuous spline, parameterized by distance so tile boundaries never pause it.
export function pawnRoute(points) {
  const samples=[{...points[0],distance:0}],arrivals=[0];let distance=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
    for(let j=1;j<=24;j++){
      const t=j/24,t2=t*t,t3=t2*t;
      const coordinate=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3);
      const next={x:coordinate('x'),y:coordinate('y')},last=samples[samples.length-1];distance+=Math.hypot(next.x-last.x,next.y-last.y);samples.push({...next,distance});
    }
    arrivals.push(distance);
  }
  return {samples,arrivals,distance};
}
