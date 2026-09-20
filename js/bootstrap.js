
window.__zusmoBanners = [
    { id:'default',   name:'Default',           img:'zusmo-asset/7dj8gw.jpg', video:'zusmo-asset/wdw2yd.mp4', price:0 },
    { id:'hellfire',  name:'Hellfire',           img:'zusmo-asset/avlyba.jpg', video:'zusmo-asset/bmr4h1.mp4', price:240 },
    { id:'akari',     name:'Akari',              img:'zusmo-asset/t8c2zi.jpg', video:'zusmo-asset/869yvj.mp4', price:180 },
    { id:'redspace',  name:'Red Space',          img:'zusmo-asset/s4g2sc.jpg', video:'zusmo-asset/lfow35.mp4', price:180 },
    { id:'eyegaze',   name:'Eye Gaze',           img:'zusmo-asset/cf0o3d.jpg', video:'zusmo-asset/z1y8m2.mp4', price:120 },
    { id:'sukuna',    name:'Sukuna',             img:'zusmo-asset/sydc3m.jpg', video:'zusmo-asset/myei3q.mp4', price:0 },
    { id:'mahkota',   name:'Crown Aesthetic',   img:'zusmo-asset/9ax0zw.jpg', video:'zusmo-asset/svyazq.mp4', price:40 },
    { id:'darkgothic',name:'Dark Gothic',        img:'zusmo-asset/jel2rt.jpg', video:'zusmo-asset/keln08.mp4', price:130 },
    { id:'nyx',       name:'Nyx',                img:'zusmo-asset/1ozx1z.jpg', video:'zusmo-asset/32yxwl.mp4', price:70 },
    { id:'spiderman', name:'Spiderman BND',      img:'zusmo-asset/3m55tl.jpg', video:'zusmo-asset/si463k.mp4', price:40 },
    { id:'spiderman2',name:'Spiderman BND 2',    img:'zusmo-asset/2a5q8p.jpg', video:'zusmo-asset/mru51x.mp4', price:90 },
    { id:'junko',     name:'Junko',              img:'zusmo-asset/zuj3oa.jpg', video:'zusmo-asset/pcpso7.mp4', price:140 },
    { id:'butterflies',name:'Butterflies',       img:'zusmo-asset/5mc9ui.jpg', video:'zusmo-asset/wnkc0o.mp4', price:85 },
    { id:'gojo',      name:'Gojo',               img:'zusmo-asset/1yjnsr.jpg', video:'zusmo-asset/cavx2i.mp4', price:140 },
    { id:'cr7',       name:'CR7',                img:'zusmo-asset/72wv8z.jpg', video:'zusmo-asset/fnddjw.mp4', price:120 },
    { id:'lm10',      name:'LM10',               img:'zusmo-asset/16tky1.jpg', video:'zusmo-asset/rhmwqn.mp4', price:120 }
  ];
try { document.documentElement.style.setProperty('--banner-ratio',localStorage.getItem('zusmo_settings_banner_ratio')==='16/9'?'16/9':'16/7'); } catch(e) {}
window.__zusmoRenderBanner = function(on){
  var wrap=document.querySelector('.hm-video-wrap');
  if(!wrap) return;
  var id='default'; try { id=localStorage.getItem('zusmo_settings_banner')||'default'; } catch(e) {}
  var data=window.__zusmoBanners.find(function(b){return b.id===id;})||window.__zusmoBanners[0];
  var key=data.id+':'+on;
  if(wrap.dataset.mediaKey===key) return;
  wrap.dataset.mediaKey=key;
  var previous=wrap.querySelector('video, img.hm-banner-img');
  var media=document.createElement(on?'video':'img');
  if(on){
    media.loop=true; media.muted=true; media.playsInline=true; media.autoplay=true;
    media.preload='auto'; media.poster=data.img; media.dataset.src=data.video;
  }else{media.className='hm-banner-img';media.alt='Banner '+data.name;media.decoding='async';}
  function commit(){
    if(wrap.dataset.mediaKey!==key) return;
    wrap.querySelectorAll('video, img.hm-banner-img').forEach(function(el){if(el.tagName==='VIDEO') el.pause();el.remove();});
    wrap.insertBefore(media,wrap.firstChild);
    if(on) media.play().catch(function(){});
  }
  if(on){
    media.onloadeddata=commit;
    media.onerror=function(){if(wrap.dataset.mediaKey===key){wrap.dataset.mediaKey='';window.__zusmoRenderBanner(false);}};
    media.src=data.video;
    // The matching poster is visible while the first video frame loads.
    if(!previous) commit();
  }else{
    media.onload=commit;
    media.src=data.img;
    if(!previous) commit();
  }
};
