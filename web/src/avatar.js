// All crop positions use a fixed 240px coordinate system, independent of screen size.
export function cropGeometry(width,height,zoom,pan){
 const scale=Math.max(240/width,240/height)*zoom,w=width*scale,h=height*scale;
 return {width:w,height:h,x:Math.max(-(w-240)/2,Math.min((w-240)/2,pan.x)),y:Math.max(-(h-240)/2,Math.min((h-240)/2,pan.y))};
}
