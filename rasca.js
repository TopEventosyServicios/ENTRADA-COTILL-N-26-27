(() => {
  'use strict';
  const zone=document.getElementById('scratch-zone');
  const canvas=document.getElementById('scratch-cover');
  const message=document.getElementById('scratch-message');
  const back=document.getElementById('ticket-back');
  const ticket=document.getElementById('ticket');
  const status=document.getElementById('scratch-status');
  if(!zone||!canvas||!message)return;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const fullMessage='CUANDO LA COMPRES, RASCA TU ENTRADA Y DESCUBRE SI TIENES PREMIO.';
  let width=0,height=0,ratio=1,strokes=[],pointer=null,revealed=false,lastCheck=0;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function isAvailable(){return back.getAttribute('aria-hidden')==='false'&&!back.hasAttribute('inert')&&!ticket.hasAttribute('inert');}
  function setRevealed(){
    if(revealed)return;
    revealed=true;pointer=null;zone.dataset.revealed='true';zone.dataset.erased='1.000';
    zone.setAttribute('aria-expanded','true');zone.setAttribute('aria-disabled','true');
    zone.setAttribute('aria-label','Mensaje descubierto. '+fullMessage);
    message.setAttribute('aria-hidden','false');
    status.textContent=fullMessage;
  }
  function seededRandom(){let seed=67262027;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
  function drawFoil(){
    if(!ctx||width<1||height<1)return;
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,width,height);
    const metal=ctx.createLinearGradient(0,0,width,height*.65);
    [[0,'#8e6329'],[.16,'#d2aa56'],[.33,'#f5d78e'],[.44,'#c19745'],[.6,'#f7df9d'],[.75,'#b88c3b'],[1,'#e3bd6a']].forEach(([p,c])=>metal.addColorStop(p,c));
    ctx.fillStyle=metal;ctx.fillRect(0,0,width,height);
    const random=seededRandom();
    for(let i=0;i<Math.ceil(width*height/12);i++){
      const x=random()*width,y=random()*height,size=.25+random()*.75;
      ctx.fillStyle=random()>.45?`rgba(255,245,203,${.12+random()*.24})`:`rgba(91,56,15,${.06+random()*.18})`;
      ctx.fillRect(x,y,size*(1+random()*3),size);
    }
    ctx.lineWidth=.35;
    for(let y=1;y<height;y+=1.35){ctx.strokeStyle=y%3<1.2?'#ffefb621':'#543c1710';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y-1.3);ctx.stroke();}
    const inset=Math.max(3,width*.014);ctx.strokeStyle='#fff2bc9c';ctx.lineWidth=.7;ctx.strokeRect(inset,inset,width-inset*2,height-inset*2);
    ctx.strokeStyle='#7e57284a';ctx.strokeRect(inset+1.5,inset+1.5,width-(inset+1.5)*2,height-(inset+1.5)*2);
    ctx.textAlign='center';ctx.textBaseline='middle';
    const title=Math.min(width*.071,height*.34);
    ctx.font=`700 ${title}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle='#fff1bf99';ctx.fillText('RASCA AQUÍ',width/2,height*.43+1);
    ctx.fillStyle='#5e411a';ctx.fillText('RASCA AQUÍ',width/2,height*.43);
    ctx.font=`${Math.max(6.5,width*.026)}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle='#745222';ctx.fillText('DESLIZA EL DEDO PARA DESCUBRIR',width/2,height*.73);
  }
  function eraseSegment(segment){
    if(!ctx)return;
    const [ax,ay,bx,by]=segment,x0=ax*width,y0=ay*height,x1=bx*width,y1=by*height;
    const radius=Math.min(width*.045,height*.31);
    ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1;ctx.strokeStyle='#000';ctx.fillStyle='#000';
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=radius*2;
    ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
    ctx.beginPath();ctx.arc(x1,y1,radius,0,Math.PI*2);ctx.fill();
    const length=Math.hypot(x1-x0,y1-y0),count=Math.max(1,Math.ceil(length/Math.max(2,radius*.4)));
    for(let i=0;i<=count;i++){
      const t=i/count,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;
      for(let n=0;n<7;n++){
        const a=(n*2.399+i*1.73),r=radius*(.95+((i+n)%4)*.055);
        ctx.globalAlpha=.24+(n%3)*.13;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,Math.max(.6,radius*.08),0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }
  function resize(){
    const w=zone.clientWidth,h=zone.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    if(w<1||h<1||(w===width&&h===height&&dpr===ratio))return;
    width=w;height=h;ratio=dpr;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    if(!ctx){setRevealed();return;}
    ctx.setTransform(dpr,0,0,dpr,0,0);drawFoil();
    for(const segment of strokes)eraseSegment(segment);
  }
  function reset(){
    pointer=null;strokes=[];revealed=false;lastCheck=0;
    zone.dataset.revealed='false';zone.dataset.erased='0.000';
    zone.setAttribute('aria-expanded','false');zone.removeAttribute('aria-disabled');
    zone.setAttribute('aria-label','Rasca aquí con el dedo para descubrir el mensaje. Con teclado, pulsa Enter.');
    message.setAttribute('aria-hidden','true');status.textContent='';
    resize();drawFoil();if(!ctx)setRevealed();
  }
  function readErased(force=false){
    if(revealed||!ctx||!width||!height)return;
    const now=performance.now();if(!force&&now-lastCheck<100)return;lastCheck=now;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let cleared=0,total=0;
    const step=Math.max(3,Math.round(canvas.width/120));
    for(let y=0;y<canvas.height;y+=step)for(let x=0;x<canvas.width;x+=step){total++;if(data[(y*canvas.width+x)*4+3]<96)cleared++;}
    const fraction=cleared/total;zone.dataset.erased=fraction.toFixed(3);
    if(fraction>=.47)setRevealed();
  }
  function position(event){const r=zone.getBoundingClientRect();return [clamp((event.clientX-r.left)/r.width),clamp((event.clientY-r.top)/r.height)];}
  zone.addEventListener('pointerdown',event=>{
    if(!isAvailable()||revealed||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();resize();
    pointer={id:event.pointerId,point:position(event)};zone.setPointerCapture(event.pointerId);
    const segment=[...pointer.point,...pointer.point];strokes.push(segment);eraseSegment(segment);readErased();
  });
  zone.addEventListener('pointermove',event=>{
    if(!pointer||event.pointerId!==pointer.id||revealed)return;
    event.preventDefault();
    const events=event.getCoalescedEvents?event.getCoalescedEvents():[event];
    for(const sample of events.length?events:[event]){
      const p=position(sample),segment=[...pointer.point,...p];strokes.push(segment);eraseSegment(segment);pointer.point=p;
    }
    readErased();
  });
  function endPointer(event){
    if(!pointer||event.pointerId!==pointer.id)return;
    pointer=null;if(zone.hasPointerCapture(event.pointerId))zone.releasePointerCapture(event.pointerId);readErased(true);
  }
  zone.addEventListener('pointerup',endPointer);zone.addEventListener('pointercancel',endPointer);
  zone.addEventListener('lostpointercapture',()=>{pointer=null;});
  zone.addEventListener('keydown',event=>{if(isAvailable()&&['Enter',' '].includes(event.key)){event.preventDefault();setRevealed();}});
  zone.addEventListener('click',event=>{if(event.detail===0&&isAvailable())setRevealed();});
  window.addEventListener('cotillon:reset',reset);
  window.addEventListener('resize',resize,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(zone);
  reset();
})();
