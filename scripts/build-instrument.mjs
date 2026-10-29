import {writeFileSync} from 'node:fs';
import * as k from './vendor/iso-kit.mjs';

// A physical four-slot counter; its carriage represents only the selected count.
const width=520,height=280,base={x:-100,y:-52,w:200,d:104,r:7};
const P=k.fitProjection([...k.boxCorners(base,-15,24)],width,height,{pad:28,azimuth:42,elevation:30});
const S=(shape,tone='mid',lit=false)=>k.solidSvg(shape,{tone,lit,crease:'lo'});
const L=(path,tone='lo')=>k.lineSvg(path,{tone});
const dot=(x,y,z)=>k.dotsSvg([k.iso([x,y,z],P)],{size:.55,tone:'mid'});
function figure(count){
  const parts=[];
  for(const [x,y] of k.corners(base,18)){
    parts.push(S(k.slabOf({x:x-7,y:y-7,w:14,d:14,r:2},-15,4,P,3,.5),'lo'));
    parts.push(S(k.slabOf({x:x-5,y:y-5,w:10,d:10,r:2},-11,3,P,3,.5),'mid'));
  }
  parts.push(S(k.slabOf(base,-8,8,P,6,1.2),'mid'));
  parts.push(L(k.planOutline(k.insetPlan(base,4),0,P),'lo'));
  for(const [x,y] of k.corners(base,9))parts.push(dot(x,y,0));
  const panel={x:-83,y:-37,w:166,d:42,r:3};
  parts.push(S(k.slabOf(panel,0,3,P,4,.5),'mid'));
  parts.push(L(k.planOutline(k.insetPlan(panel,2),3,P),'faint'));
  for(const [x,y] of k.corners(panel,5))parts.push(dot(x,y,3));
  for(let i=0;i<4;i++){
    const x=-73+i*37;
    parts.push(S(k.slabOf({x,y:-29,w:28,d:26,r:2},3,3,P,3,.5),'mid'));
    parts.push(`<g data-instrument-pad="${i}"${i<count?' data-active="true"':''}>`);
    parts.push(S(k.slabOf({x:x+3,y:-26,w:22,d:20,r:2},6,3,P,3,.6),'hi',i<count));
    parts.push(L(k.planOutline({x:x+6,y:-23,w:16,d:14,r:1},9,P),'lo'));
    parts.push(dot(x+5,-27,6),dot(x+23,-27,6));
    parts.push('</g>');
  }
  const rail={x:-79,y:20,w:158,d:8,r:1};
  parts.push(S(k.slabOf({x:-84,y:14,w:168,d:22,r:3},0,2,P,4,.4),'mid'));
  parts.push(S(k.slabOf(rail,2,3,P,3,.3),'lo'));
  const ticks=k.topTicks(-70,70,35,1,16.5,2,[2,2],P);parts.push(L(ticks.major,'mid'));
  for(const x of [-80,80]){parts.push(S(k.slabOf({x:x-3,y:12,w:6,d:26,r:1},0,6,P,3,.4),'mid'));parts.push(dot(x,17,6),dot(x,32,6));}
  const x=-70+count*35;
  parts.push('<g data-instrument-carriage="true">');
  parts.push(S(k.slabOf({x:x-7,y:17,w:14,d:14,r:2},5,5,P,3,.6),'hi',true));
  parts.push(L(k.planOutline({x:x-4,y:20,w:8,d:8,r:1},10,P),'mid'));
  parts.push(dot(x-4,19,10),dot(x+4,19,10));
  parts.push('</g>');
  const css=`.iso-fill{fill:#eef2f7;stroke:none}.iso-shade{stroke:none}.iso-shade[data-shade="0"]{fill:#d5dee8}.iso-shade[data-shade="1"]{fill:#c7d3df}.iso-shade[data-shade="2"]{fill:#b9c8d8}.iso-shade[data-shade="3"]{fill:#dae2eb}.iso-top{fill:#f7f9fc;stroke:none}.iso-solid[data-lit]>.iso-top{fill:#94b6f5}.iso-solid[data-lit]>.iso-shade{fill:#708fcb}.iso-solid[data-lit]>.iso-fill{fill:#7393d1}.iso-line{fill:none;stroke:#8192a6;stroke-width:.65;stroke-linecap:round;stroke-linejoin:round}.iso-line[data-tone="hi"]{stroke:#455a72}.iso-line[data-tone="mid"]{stroke:#657a90}.iso-line[data-tone="lo"]{stroke:#95a5b7}.iso-line[data-tone="faint"]{stroke:#c3ceda}.iso-dots circle{fill:#667c92;stroke:none}.iso-solid[data-lit]>.iso-edge{stroke:#5379c0}`;
  const svg=k.figureSvg({width,height,label:'Four-position interest selection counter',body:parts});
  const a=k.iso([0,0,0],P),b=k.iso([35,0,0],P);
  return svg.replace('<svg ',`<svg data-step-x="${b[0]-a[0]}" data-step-y="${b[1]-a[1]}" `).replace(/(<svg[^>]*>)/,`$1<style>${css}</style>`);
}
for(let count=0;count<=4;count++)writeFileSync(new URL(`../public/instrument/count-${count}.svg`,import.meta.url),figure(count));
console.log('Built five count states for the interest selection instrument.');
