
var cidMediaAssets={banner:'',outfit:'',avatar:''};
var cidMediaGeneration=0;
function cidSelectPanel(name){
  document.querySelectorAll('#cekidffPlayer .cip-tabs [role="tab"]').forEach(function(tab){
    const selected=tab.id==='cipTab-'+name;
    tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
  });
  document.querySelectorAll('#cekidffPlayer [role="tabpanel"]').forEach(function(panel){panel.hidden=panel.id!=='cipPanel-'+name;});
  if(name==='detail'){
    const rows=document.getElementById('cidInfoRows');
    if(rows&&rows.style.display==='none') cidToggleInfoLengkap();
  }
}
(function(){
  const tabs=Array.from(document.querySelectorAll('#cekidffPlayer .cip-tabs [role="tab"]'));
  tabs.forEach(function(tab,index){tab.addEventListener('keydown',function(event){
    let next=index;
    if(event.key==='ArrowRight') next=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=tabs.length-1;
    else return;
    event.preventDefault();tabs[next].click();tabs[next].focus();
  });});
})();
function cidPrepareMedia(){
  cidMediaGeneration++;
  ['banner','outfit','avatar'].forEach(function(kind){
    cidMediaAssets[kind]='';
    const btn=document.getElementById('cipDownload-'+kind);
    btn.disabled=true;btn.removeAttribute('aria-busy');btn.innerHTML='<i class="fa-solid fa-download" aria-hidden="true"></i> Download '+kind;
    document.getElementById('cipStatus-'+kind).textContent='Menunggu gambar…';
    const link=document.getElementById('cipOriginal-'+kind);link.hidden=true;link.removeAttribute('href');
  });
  document.getElementById('cipAvatarFrame').innerHTML='<i class="fa-solid fa-user" aria-hidden="true"></i>';
  document.getElementById('cipAvatarMeta').textContent='Avatar yang digunakan pemain.';
  document.getElementById('cidBannerAvatar').innerHTML='';
  document.getElementById('cidOutfitFrame').innerHTML='';
}
function cidRenderAvatar(json){
  const frame=document.getElementById('cipAvatarFrame');
  const avatarId=cidPickIdCI(json,'headpic')||cidPickIdCI(json,'avatarid');
  if(!avatarId||!/^\d+$/.test(String(avatarId))||String(avatarId)==='0'){
    frame.innerHTML='<i class="fa-solid fa-user" aria-hidden="true"></i>';
    document.getElementById('cipAvatarMeta').textContent='Avatar tidak tersedia.';
    cidMediaError('avatar');return;
  }
  document.getElementById('cipAvatarMeta').textContent='Item ID · '+String(avatarId);
  frame.innerHTML='<img src="'+tffAttrEsc(tffItemIconUrl(avatarId))+'" alt="Avatar player" referrerpolicy="no-referrer" onload="cidMediaReady(\'avatar\',this)" onerror="this.hidden=true;cidMediaError(\'avatar\')">';
}
function cidMediaReady(kind,img){
  if(!img.isConnected||!img.naturalWidth) return;
  cidMediaAssets[kind]=img.currentSrc||img.src;
  document.getElementById('cipDownload-'+kind).disabled=false;
  document.getElementById('cipStatus-'+kind).textContent='';
}
function cidMediaError(kind){
  cidMediaAssets[kind]='';
  document.getElementById('cipDownload-'+kind).disabled=true;
  document.getElementById('cipStatus-'+kind).textContent='Gambar belum tersedia. Coba cari ulang player.';
}
async function cidDownloadMedia(kind){
  const url=cidMediaAssets[kind],btn=document.getElementById('cipDownload-'+kind);
  if(!url||!btn||btn.disabled) return;
  const generation=cidMediaGeneration,status=document.getElementById('cipStatus-'+kind),link=document.getElementById('cipOriginal-'+kind);
  const controller=new AbortController(),timer=setTimeout(function(){controller.abort();},30000);
  btn.disabled=true;btn.setAttribute('aria-busy','true');btn.innerHTML='<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyiapkan…';status.textContent='Menyiapkan gambar untuk diunduh…';link.hidden=true;
  try{
    const response=await fetch(url,{signal:controller.signal,referrerPolicy:'no-referrer'});
    if(!response.ok) throw new Error('Download failed');
    const blob=await response.blob();
    if(!blob.size||!/^image\//i.test(blob.type)) throw new Error('Invalid image');
    if(generation!==cidMediaGeneration) return;
    const ext=blob.type.includes('webp')?'webp':blob.type.includes('jpeg')?'jpg':'png';
    const objectUrl=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=objectUrl;anchor.download='ff-'+kind+'-'+Date.now()+'.'+ext;
    document.body.appendChild(anchor);anchor.click();anchor.remove();
    setTimeout(function(){URL.revokeObjectURL(objectUrl);},60000);
    status.textContent='Unduhan dimulai. Periksa folder Download.';
  }catch(error){
    if(generation!==cidMediaGeneration) return;
    status.textContent='Unduhan gagal. Coba lagi atau buka gambar asli untuk menyimpannya.';
    link.href=url;link.hidden=false;
  }finally{
    clearTimeout(timer);
    if(generation===cidMediaGeneration){btn.disabled=!cidMediaAssets[kind];btn.removeAttribute('aria-busy');btn.innerHTML='<i class="fa-solid fa-download" aria-hidden="true"></i> Download '+kind;}
  }
}
