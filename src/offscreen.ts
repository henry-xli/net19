import { collect } from './collect';
import { isSnapshot, type Viewport } from './snapshot';
import { type Raster } from './render';

type Request = { target: string; type: string; html: string; css: string; images: Raster[]; original: string; viewport: Viewport };
let rendering: Promise<unknown> = Promise.resolve();

async function normalizeImage(data: string): Promise<string | null> {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > 60_000) return null;
  const bytes = Uint8Array.from(atob(data.slice(data.indexOf(',') + 1)), c => c.charCodeAt(0));
  if (bytes.length < 24 || ![137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return null;
  const view = new DataView(bytes.buffer);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (!width || !height || width > 1024 || height > 512 || width * height > 524288) return null;
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  try {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    const result = canvas.toDataURL('image/png');
    return result.length <= 50_000 ? result : null;
  } finally { bitmap.close(); }
}

async function rasterBackground(node: Element, view: Window): Promise<string|null> {
  const style=view.getComputedStyle(node),box=node.getBoundingClientRect();
  const match=style.backgroundImage.match(/^url\(["']?(data:image\/png;base64,[A-Za-z0-9+/=]+)["']?\)$/);
  if(!match||box.width<=0||box.height<=0||box.width>512||box.height>256)return null;
  const bytes=Uint8Array.from(atob(match[1].split(',')[1]),c=>c.charCodeAt(0));
  const image=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
  try {
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(box.width*2);canvas.height=Math.ceil(box.height*2);
  const ctx=canvas.getContext('2d')!;ctx.scale(2,2);
  const size=style.backgroundSize.split(' '),position=style.backgroundPosition.split(' ');
  const length=(value:string,range:number,fallback:number)=>value.endsWith('%')?parseFloat(value)*range/100:value.endsWith('px')?parseFloat(value):fallback;
  let width=length(size[0],box.width,image.width),height=length(size[1]??'auto',box.height,image.height);
  if(size[0]==='cover'||size[0]==='contain'){const factor=(size[0]==='cover'?Math.max:Math.min)(box.width/image.width,box.height/image.height);width=image.width*factor;height=image.height*factor;}
  else if(size[1]===undefined||size[1]==='auto')height=width*image.height/image.width;
  const x=length(position[0],box.width-width,0),y=length(position[1]??'0%',box.height-height,0);
  if(!Number.isFinite(width+height+x+y)||width<=0||height<=0)return null;
  if(style.backgroundRepeat==='no-repeat')ctx.drawImage(image,x,y,width,height);
  else {let count=0;const repeatX=style.backgroundRepeat!=='repeat-y',repeatY=style.backgroundRepeat!=='repeat-x';
    const startX=repeatX?x-Math.ceil(x/width)*width:x,startY=repeatY?y-Math.ceil(y/height)*height:y;
    for(let xx=startX;xx<box.width;xx+=width){for(let yy=startY;yy<box.height;yy+=height){if(count++>128)return null;ctx.drawImage(image,xx,yy,width,height);if(!repeatY)break;}if(!repeatX)break;}}
  const data=canvas.toDataURL('image/png');return data.length<=20_000?data:null;
  } finally {image.close();}
}

async function render(request: Request): Promise<unknown> {
  if (typeof request.html !== 'string' || request.html.length > 1_500_000 || typeof request.css !== 'string' || request.css.length > 2_000_000) return null;
  const viewport = { width: Math.max(320, Math.min(2560, request.viewport?.width || 1280)), height: Math.max(400, Math.min(1600, request.viewport?.height || 800)) };
  const frame = document.createElement('iframe');
  frame.sandbox.add('allow-same-origin'); // Deliberately no allow-scripts, forms, popups, downloads or navigation.
  frame.width = String(viewport.width); frame.height = String(viewport.height); frame.style.border = '0';
  const parsed = new DOMParser().parseFromString(request.html, 'text/html');
  const policy = parsed.createElement('meta'); policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
  parsed.head.prepend(policy);
  const style = parsed.createElement('style'); style.textContent = request.css.replace(/</g, '\\3c '); parsed.head.append(style);
  const raster = new Map<string, string>();
  for (const image of (request.images ?? []).slice(0, 6)) {
    try { const normalized = await normalizeImage(image.data); if (normalized) raster.set(image.id, normalized); } catch { /* Keep the other resources. */ }
  }
  style.textContent=style.textContent!.replace(/url\(["']?net19-image:((?:image|css)-\d+)["']?\)/g,(_match,id:string)=>raster.has(id)?`url("${raster.get(id)}")`:'none');
  for (const image of parsed.querySelectorAll<HTMLImageElement>('img[data-net19-image]')) {
    const data = raster.get(image.getAttribute('data-net19-image')!); if (data) image.src = data;
  }
  const loaded = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Archive measurement timed out')), 5000);
    frame.onload = () => { clearTimeout(timer); resolve(); };
  });
  frame.srcdoc = '<!doctype html>' + parsed.documentElement.outerHTML;
  document.body.append(frame);
  try {
    await loaded;
    const doc = frame.contentDocument!;
    const collected = collect(doc, viewport, request.original);
    const graphicsDeadline = performance.now() + 4000;
    let graphics = 0;
    for (const [i, node] of collected.elements.entries()) {
      if (performance.now() > graphicsDeadline || graphics >= 24) break;
      const key = node.getAttribute('data-net19-image');
      if (key && raster.has(key)) collected.snapshot.nodes[i].image = raster.get(key);
      try {
        const background = await rasterBackground(node, doc.defaultView!);
        if (background) {
          graphics++;
          const measured = collected.snapshot.nodes[i];
          if (measured.descriptor.kind === 'image') measured.image = background;
          else { measured.background = background; measured.icon = !node.textContent?.trim(); }
        }
      } catch { /* Unsupported background geometry keeps the current decoration. */ }
      // Rasterize small, sanitized inline SVG decorations. Only pixels cross into the
      // live page; SVG markup, selectors, handlers and links are never transferred.
      if (node.tagName.toLowerCase() === 'svg' && collected.snapshot.nodes[i].box.w <= 128 && collected.snapshot.nodes[i].box.h <= 128) {
        try {
          const clone = node.cloneNode(true) as SVGElement;
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const originals = [node, ...node.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
          for (const [j, child] of originals.entries()) {
            const computed = doc.defaultView!.getComputedStyle(child);
            for (const key of ['fill','stroke','stroke-width']) { const value = computed.getPropertyValue(key); if (value && !/url|[<>]/i.test(value)) copies[j].setAttribute(key,value); }
          }
          const box = collected.snapshot.nodes[i].box;
          clone.setAttribute('width',String(Math.ceil(box.w))); clone.setAttribute('height',String(Math.ceil(box.h)));
          const bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(clone));
          if (bytes.length > 30_000) continue;
          const image = new Image();
          await new Promise<void>((resolve,reject)=>{
            const timer=setTimeout(()=>reject(new Error('Icon decode timed out')),500);
            image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(new Error('Invalid icon'));};
            image.src='data:image/svg+xml;base64,'+btoa(String.fromCharCode(...bytes));
          });
          const canvas = document.createElement('canvas'); canvas.width = Math.ceil(box.w * 2); canvas.height = Math.ceil(box.h * 2);
          canvas.getContext('2d')!.drawImage(image,0,0,canvas.width,canvas.height);
          const data = canvas.toDataURL('image/png'); if (data.length < 10_000) { collected.snapshot.nodes[i].image = data; graphics++; }
        } catch { /* Keep the current decoration if it cannot be safely measured. */ }
      }
    }
    return isSnapshot(collected.snapshot) ? collected.snapshot : null;
  } finally { frame.remove(); }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.tab || message?.target !== 'offscreen' || message?.type !== 'RENDER') return;
  const task = rendering.catch(() => undefined).then(() => render(message));
  rendering = task;
  void task.then(respond, () => respond(null));
  return true;
});
