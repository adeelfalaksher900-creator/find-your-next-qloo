// The geometry is generated from the MIT-licensed Anatomy kit. Only real
// selection counts drive the pads and carriage; motion does not invent scores.
const mounted=new Map();
let geometry;
const capped=value=>Math.min(4,Math.max(0,Math.floor(Number(value)||0)));
async function loadGeometry(){
  if(!geometry)geometry=fetch('/instrument/count-0.svg',{cache:'force-cache'}).then(async response=>{
    if(!response.ok)throw new Error('Instrument geometry unavailable');
    const svg=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
    if(svg.localName!=='svg'||svg.querySelector('parsererror')||svg.querySelectorAll('[data-instrument-pad]').length!==4||!svg.querySelector('[data-instrument-carriage]'))throw new Error('Invalid instrument geometry');
    // All paint comes from the external stylesheet under the site's CSP.
    svg.querySelectorAll('style').forEach(node=>node.remove());
    svg.classList.add('instrument-svg');svg.setAttribute('aria-hidden','true');svg.removeAttribute('role');svg.removeAttribute('aria-label');
    return svg;
  }).catch(error=>{geometry=null;throw error;});
  return (await geometry).cloneNode(true);
}
export function updateInstrument(fig,count,caption){mounted.get(fig)?.update(count,caption);}
export function disposeInstruments(root){for(const [fig,controller] of mounted)if(fig===root||root.contains(fig))controller.destroy();}
export function createInstrument(count=0,caption=''){
  const fig=document.createElement('figure'),scene=document.createElement('div'),text=document.createElement('figcaption');
  fig.className='instrument';scene.className='instrument-scene';scene.setAttribute('aria-hidden','true');text.className='instrument-caption';text.textContent=caption;fig.append(scene,text);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),animations=new Set();
  let selected=capped(count),shown=selected,svg=null,carriage=null,pads=[],visible=false,ready=false,destroyed=false,entered=false,fallback=null,pointerFrame=0;
  function stop(){for(const animation of animations)animation.cancel();animations.clear();}
  function animate(node,frames,options){
    if(motion.matches||!visible||document.hidden||typeof node.animate!=='function')return;
    const animation=node.animate(frames,options);animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
  }
  function position(value){return [Number(svg.dataset.stepX)*value,Number(svg.dataset.stepY)*value];}
  const translate=([x,y])=>`translate(${x}px, ${y}px)`;
  function paint(previous=selected,initial=false){
    if(!svg)return;
    const from=position(previous),to=position(selected);stop();
    carriage.setAttribute('transform',`translate(${to[0]} ${to[1]})`);
    pads.forEach((pad,index)=>{const active=index<selected,wasActive=index<previous;pad.toggleAttribute('data-active',active);pad.querySelector('.iso-solid')?.toggleAttribute('data-lit',active);
      if(active!==wasActive&&!initial)animate(pad,[{transform:'translateY(0)'},{transform:'translateY(4px)',offset:.35},{transform:'translateY(0)'}],{duration:360,easing:'ease-out',delay:index*24});
    });
    if(!initial&&previous!==selected)animate(carriage,[{transform:translate(from)},{transform:translate(to)}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
    fig.dataset.count=String(selected);shown=selected;
  }
  function entrance(){
    if(!svg||!ready||!visible||entered)return;entered=true;
    animate(svg,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:550,easing:'cubic-bezier(.2,.8,.2,1)'});
    // The carriage settles into its actual slot once; there is no perpetual loop.
    const target=position(selected);animate(carriage,[{transform:translate([target[0]-14,target[1]-7])},{transform:translate(target)}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  async function mount(){
    if(ready||destroyed)return;
    ready=true;
    try{const graphic=await loadGeometry();if(destroyed)return;svg=graphic;carriage=svg.querySelector('[data-instrument-carriage]');pads=[...svg.querySelectorAll('[data-instrument-pad]')];scene.replaceChildren(svg);paint(selected,true);fig.dataset.instrument='ready';entrance();}
    catch{if(destroyed)return;fallback=document.createElement('img');fallback.src=`/instrument/count-${selected}.svg`;fallback.alt='';fallback.width=520;fallback.height=280;scene.replaceChildren(fallback);fig.dataset.instrument='static';}
  }
  function resetTilt(){cancelAnimationFrame(pointerFrame);pointerFrame=0;scene.style.removeProperty('transform');}
  function pointerMove(event){
    if(motion.matches||!visible||event.pointerType==='touch')return;cancelAnimationFrame(pointerFrame);
    pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(destroyed)return;const box=scene.getBoundingClientRect();if(!box.width||!box.height)return;const x=Math.max(-1,Math.min(1,(event.clientX-box.left)/box.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-box.top)/box.height*2-1));scene.style.transform=`perspective(900px) rotateX(${-y*5}deg) rotateY(${x*6}deg)`;});
  }
  function visibility(){if(document.hidden){stop();resetTilt();}}
  function preference(){stop();resetTilt();paint(selected,true);}
  scene.addEventListener('pointermove',pointerMove,{passive:true});scene.addEventListener('pointerleave',resetTilt);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',preference);
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{for(const entry of entries){visible=entry.isIntersecting;if(visible){mount();entrance();}else{stop();resetTilt();}}},{rootMargin:'80px'}):null;
  if(observer)observer.observe(fig);else{visible=true;queueMicrotask(mount);}
  const controller={fig,text,update(value,caption){const previous=shown;selected=capped(value);if(caption!==undefined)text.textContent=caption;if(fallback)fallback.src=`/instrument/count-${selected}.svg`;paint(previous);},destroy(){if(destroyed)return;destroyed=true;stop();resetTilt();observer?.disconnect();scene.removeEventListener('pointermove',pointerMove);scene.removeEventListener('pointerleave',resetTilt);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',preference);mounted.delete(fig);fig.dataset.instrument='disposed';}};
  mounted.set(fig,controller);fig.dataset.count=String(selected);return controller;
}
