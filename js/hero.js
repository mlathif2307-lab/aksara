/* Animasi hero: buku 3D (three.js), HUD, pena tinta, hitung mundur, pre order */

const $=s=>document.querySelector(s),cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),rg=(v,a,b)=>cl((v-a)/(b-a)),lp=(a,b,t)=>a+(b-a)*t,eo=t=>1-Math.pow(1-t,3),ei=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const caps=[...document.querySelectorAll('#caps article')],legs=[...document.querySelectorAll('#legs path')];
const N=6,HD=['Draf Pertama','Penyuntingan Mendalam','Cetak Letterpress','Di Tangan Pembaca'];
let G=null;

/* ---------- scene ---------- */
function build(){
 const R=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true});
 R.setPixelRatio(Math.min(devicePixelRatio,2));R.outputEncoding=THREE.sRGBEncoding;R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
 const S=new THREE.Scene();S.background=new THREE.Color(0x0b0705);S.fog=new THREE.Fog(0x0b0705,10,24);
 const C=new THREE.PerspectiveCamera(38,1,.1,60);
 const tex=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return t};
 const M=o=>new THREE.MeshStandardMaterial(o);

 // meja kayu
 const wood=tex(1024,1024,(x,w,h)=>{x.fillStyle='#2b1a0f';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.strokeStyle=`rgba(${60+Math.random()*50|0},${30+Math.random()*25|0},12,${.15+Math.random()*.25})`;x.lineWidth=Math.random()*2+.4;const y=Math.random()*h;x.beginPath();x.moveTo(0,y);x.bezierCurveTo(w*.3,y+Math.random()*14-7,w*.6,y+Math.random()*14-7,w,y+Math.random()*10-5);x.stroke()}});
 wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(5,5);
 const desk=new THREE.Mesh(new THREE.PlaneGeometry(40,40),M({map:wood,roughness:.85}));desk.rotation.x=-Math.PI/2;desk.receiveShadow=true;S.add(desk);

 // lampu baca + cahaya pengisi
 S.add(new THREE.AmbientLight(0x4a3526,.9));
 const lamp=new THREE.PointLight(0xffc27a,1.7,22);lamp.position.set(3,5,2.5);lamp.castShadow=true;lamp.shadow.mapSize.set(1024,1024);S.add(lamp);
 const rim=new THREE.DirectionalLight(0x8fa0ff,.35);rim.position.set(-5,4,-4);S.add(rim);

 // sampul
 const cov=tex(512,680,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,'#4a1013');g.addColorStop(1,'#1b0507');x.fillStyle=g;x.fillRect(0,0,w,h);for(let i=0;i<2500;i++){x.fillStyle=`rgba(0,0,0,${Math.random()*.12})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}
  x.strokeStyle='#c9a45c';x.lineWidth=4;x.strokeRect(30,30,w-60,h-60);x.lineWidth=1.5;x.strokeRect(48,48,w-96,h-96);x.fillStyle='#d8b56a';x.textAlign='center';x.font='400 62px Michroma,Georgia,serif';x.fillText('AKSARA',w/2,h/2-10);x.fillRect(w/2-60,h/2+70,120,2);x.font='italic 20px Georgia,serif';x.fillText('Dari buku lahir pengetahuan',w/2,h-86)});
 const leather=M({color:0x2a0b0d,roughness:.6});
 const bk=new THREE.Group();S.add(bk);
 const bx=(w,h,d,m,x,y)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,0);return o};
 bk.add(bx(3.05,.05,4.05,leather,1.52,.025),bx(2.9,.3,3.9,M({color:0xe2d3b0,roughness:.9}),1.5,.2),bx(.08,.5,4.05,leather,-.03,.25));
 const cp=new THREE.Group();bk.add(cp);
 cp.add(bx(3.05,.05,4.05,[leather,leather,M({map:cov,roughness:.55,metalness:.15}),M({color:0x1a0a0a}),leather,leather],1.52,0));

 // lembar halaman (sisi balik digambar terputar 180° karena UV sisi bawah box)
 const page=(i,back)=>tex(512,680,(x,w,h)=>{x.fillStyle='#e8dbbd';x.fillRect(0,0,w,h);const g=x.createRadialGradient(w/2,h/2,h*.3,w/2,h/2,h*.85);g.addColorStop(0,'#0000');g.addColorStop(1,'#7a5a2a66');x.fillStyle=g;x.fillRect(0,0,w,h);
  if(back){x.translate(w,h);x.rotate(Math.PI)}
  const k=i*2+(back?1:0);x.fillStyle='#3b2a1a';x.textAlign='center';x.font='400 24px Michroma,Georgia,serif';x.fillText(HD[k%4].toUpperCase(),w/2,86);x.font='italic 20px Georgia,serif';x.fillText('Bab '+(k+1),w/2,120);
  let s=k*13+7;const r=()=>(s=s*16807%2147483647)/2147483647;x.fillStyle='#4a3524';x.globalAlpha=.55;for(let l=0;l<21;l++)x.fillRect(48,168+l*22,(w-96)*(l==20?.4:.8+r()*.18),5);x.globalAlpha=1;x.font='16px Georgia,serif';x.fillText(String(k+12),w/2,h-34)});
 const leaves=[];
 for(let i=0;i<N;i++){const e=M({color:0xe2d3b0,roughness:.9}),p=new THREE.Group(),m=new THREE.Mesh(new THREE.BoxGeometry(2.9,.01,3.9),[e,e,M({map:page(i,0),roughness:.9}),M({map:page(i,1),roughness:.9}),e,e]);m.position.x=1.47;p.add(m);bk.add(p);leaves.push(p)}
 bk.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});

 // debu kertas & percik tinta
 const n=600,pos=new Float32Array(n*3),col=new Float32Array(n*3),sp=new Float32Array(n);
 for(let i=0;i<n;i++){pos.set([Math.random()*16-8,Math.random()*8,Math.random()*12-6],i*3);sp[i]=.05+Math.random()*.2;const c=new THREE.Color(Math.random()<.7?0xe6cf9c:0xb23a2a);col.set([c.r,c.g,c.b],i*3)}
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(col,3));
 const dust=new THREE.Points(pg,new THREE.PointsMaterial({size:.05,vertexColors:true,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));S.add(dust);

 const P0=new THREE.Vector3(0,7.4,8.8),P1=new THREE.Vector3(.5,6.3,5.8),P2=new THREE.Vector3(-.2,4.9,4.3),T0=new THREE.Vector3(0,.2,0),T1=new THREE.Vector3(0,.9,0),T2=new THREE.Vector3(0,.8,.3),T=new THREE.Vector3();
 const size=()=>{R.setSize(innerWidth,innerHeight);C.aspect=innerWidth/innerHeight;C.updateProjectionMatrix()};size();addEventListener('resize',size);

 return (p,t,rise,open)=>{
  bk.position.set(lp(-1.5,0,open),rise*.9+Math.sin(t/1100)*.04*rise,0);bk.rotation.y=lp(-.6,0,eo(rg(p,.1,.5)));
  cp.rotation.z=open*Math.PI;cp.position.y=lp(.456,.035,open)+Math.sin(open*Math.PI)*.15;
  leaves.forEach((l,i)=>{const f=ei(rg(p,.52+i*.07,.63+i*.07));l.rotation.z=f*Math.PI;l.position.y=lp(.35+(N-i-1)*.012+.006,.07+i*.012,f)+Math.sin(f*Math.PI)*.4});
  const pa=eo(rg(p,0,.45)),pb=eo(rg(p,.5,1));C.position.lerpVectors(P0,P1,pa).lerp(P2,pb);T.lerpVectors(T0,T1,pa).lerp(T2,pb);
  const m=C.aspect<1?1+(1-C.aspect)*1.1:1;C.position.sub(T).multiplyScalar(m).add(T);C.lookAt(T);
  if(!RM){const a=pg.attributes.position;for(let i=0;i<n;i++){let y=a.getY(i)+sp[i]*.01;if(y>8)y=0;a.setY(i,y);a.setX(i,a.getX(i)+Math.sin(t/2000+i)*.0015)}a.needsUpdate=true}
  dust.material.opacity=lp(.9,.45,rg(p,0,.3));
  R.render(S,C)}}

/* ---------- gulir → adegan + HUD ---------- */
let st,span,sp=0,cur=-1;const t0=performance.now();
const meas=()=>{st=$('#stage');span=Math.max(1,st.offsetHeight-innerHeight)};meas();addEventListener('resize',meas);
const nib=$('#nib');
function frame(t){
 const y=scrollY-st.offsetTop,p=cl(y/span);sp=RM?p:sp+(p-sp)*.09;
 $('#gl').style.visibility=y<st.offsetHeight?'':'hidden';
 if(y<st.offsetHeight){
  const rise=eo(rg(sp,.12,.36)),open=ei(rg(sp,.34,.52)),clr=rg(sp,0,.12);
  const v=$('#veil').style;v.opacity=1-clr;v.transform=`translateY(${-clr*24}vh) scale(${1+clr*.25})`;
  const ti=eo(rg(sp,.1,.24)),to=rg(sp,.46,.56),h=$('#ttl').style;h.opacity=ti*(1-to);h.letterSpacing=lp(.6,.24,ti)+'em';h.filter=ti<.99?`blur(${(1-ti)*10}px)`:'';h.transform=`translateY(${-sp*6}vh)`;$('#sub').style.opacity=ti*(1-to);
  $('#hud').style.opacity=rg(sp,.04,.12);
  const secs=Math.floor((t-t0)/1000);$('#rt').textContent=String(secs/60|0).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  $('#ang').textContent=Math.round(open*178)+'°';
  const j=eo(rg(sp,.52,.98)),u=rg(sp,.52,.98)*4;$('#wc').textContent=Math.round(j*1e5).toLocaleString('id-ID');
  const s=sp<.52?-1:cl(Math.floor(u),0,3);if(s!==cur){cur=s;caps.forEach((c,i)=>c.classList.toggle('on',i==s))}
  $('#inkw').style.opacity=rg(sp,.5,.56)*(1-rg(sp,.99,1));
  legs.forEach((l,i)=>{const k=eo(cl(u-i));l.style.strokeDasharray='1 1';l.style.strokeDashoffset=1-k;if(i==cl(Math.floor(u),0,3)){const q=l.getPointAtLength(l.getTotalLength()*k);nib.setAttribute('transform',`translate(${q.x} ${q.y})`)}});
  if(G)G(sp,t,rise,open)}
 requestAnimationFrame(frame)}
try{document.fonts.load('40px Michroma').catch(()=>0).finally(()=>{try{G=build()}catch(e){console.warn('WebGL tidak tersedia',e)}})}catch(e){}
requestAnimationFrame(frame);

/* ---------- edisi, hitung mundur, pre order ---------- */
const ED=[['Edisi Naskah',240,['Sampul keras, kertas bone 80 gsm','Nomor edisi di halaman judul']],['Edisi Kolektor',360,['Jilid kain dengan tepi emas','Ilustrasi tinta, kotak penyimpanan']],['Edisi Arsip',540,['Faksimile naskah asli','Cetak letterpress, tanda tangan penulis']]];
$('#eds').innerHTML=ED.map(([n,p,l])=>`<article class="ed"><svg viewBox="0 0 200 200" aria-hidden="true">${Array.from({length:Math.ceil(p/120)},(_,k)=>`<ellipse cx="100" cy="100" rx="${36+k*16}" ry="${16+k*7}" fill="none" stroke="currentColor" transform="rotate(${-20+k*14} 100 100)"/>`).join('')}<circle cx="100" cy="100" r="8" fill="currentColor"/></svg><h3>${n}</h3><p class="n">${p}<span class="m"> halaman</span></p><ul style="list-style:none;padding:18px 0 0;margin:20px 0 0;border-top:1px solid #ffffff1a;color:#cfc3aa">${l.map(x=>`<li>${x}</li>`).join('')}</ul><button class="btn" data-e="${n}">Pre Order ${n}</button></article>`).join('');
document.addEventListener('click',e=>{const b=e.target.closest('[data-e]');if(!b)return;$('#sel').value=b.dataset.e;$('#po').scrollIntoView({behavior:RM?'auto':'smooth'})});
const tgt=new Date('2027-03-01T09:00:00+07:00').getTime();
function tick(){const s=Math.max(0,Math.floor((tgt-Date.now())/1000));$('#cd').innerHTML=[['Hari',s/86400|0],['Jam',s%86400/3600|0],['Menit',s%3600/60|0],['Detik',s%60]].map(([l,v])=>`<div><b>${String(v).padStart(2,'0')}</b><span class="m">${l}</span></div>`).join('');$('#cd').setAttribute('aria-label',`${s/86400|0} hari menuju jendela cetak berikutnya`)}
tick();setInterval(tick,1000);
$('#f').onsubmit=e=>{e.preventDefault();const f=e.target,s=$('#fs');
 if(!f.checkValidity()){s.textContent='Isi nama dan email dengan benar dulu ya.';f.reportValidity();return}
 const d=new FormData(f);location.href=`mailto:redaksi@aksara.example?subject=${encodeURIComponent('Pre Order: '+d.get('s'))}&body=${encodeURIComponent('Nama: '+d.get('n')+'\nEmail: '+d.get('e')+'\nEdisi: '+d.get('s'))}`;
 s.textContent='Aplikasi email kamu akan terbuka dengan pesan yang sudah terisi. Tinggal kirim.'};

