
const LIKES_STATE={busy:false};
function likesSwitchTab(name){
  ['free','paid'].forEach(function(key){const suffix=key==='free'?'Free':'Paid',active=key===name,tab=document.getElementById('likesTab'+suffix);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById('likesPanel'+suffix).hidden=!active;});
}
function likesStatus(message,type){const el=document.getElementById('likesStatus');el.hidden=false;el.className='likes-status '+(type||'');el.textContent=message;}
function likesNumber(value){
  if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
  const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:null;
}
function likesParseResult(data,uid){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Hasil layanan belum dapat dibaca.');
  const status=Number(data.status),before=likesNumber(data.LikesbeforeCommand),after=likesNumber(data.LikesafterCommand),added=likesNumber(data.LikesGivenByAPI);
  if(![1,2].includes(status)||before===null||after===null||added===null){
    const detail=data.error||data.message;
    throw new Error(typeof detail==='string'?detail.slice(0,250):'Like belum dapat diproses. Periksa UID atau coba lagi nanti.');
  }
  if(data.UID!=null&&String(data.UID)!==uid)throw new Error('UID pada hasil tidak cocok. Hasil tidak ditampilkan.');
  return {nickname:String(data.PlayerNickname||'Pemain Free Fire'),uid:uid,level:likesNumber(data.Level),region:String(data.Region||'ID'),before:before,after:after,added:added,status:status,used:likesNumber(data.used),remaining:likesNumber(data.remaining),limit:likesNumber(data.daily_limit)};
}
function likesRender(result){
  const fmt=function(n){return n.toLocaleString('id-ID');},set=function(id,text){document.getElementById(id).textContent=text;};
  set('likesNickname',result.nickname);set('likesAccountMeta','UID '+result.uid+(result.level!==null?' · Level '+result.level:'')+' · '+result.region);
  set('likesBefore',fmt(result.before));set('likesAfter',fmt(result.after));set('likesAdded','+'+fmt(result.added));
  const quota=result.used!==null&&result.remaining!==null&&result.limit!==null;document.getElementById('likesQuota').hidden=!quota;
  if(quota){set('likesUsed',fmt(result.used));set('likesRemaining',fmt(result.remaining));set('likesDailyLimit',fmt(result.limit));}
  document.getElementById('likesResult').hidden=false;
  likesStatus(result.added>0?'Like berhasil ditambahkan.':'Belum ada like yang ditambahkan untuk akun ini.',result.added>0?'success':'');
}
async function likesSubmit(){
  if(LIKES_STATE.busy)return;
  const input=document.getElementById('likesUidInput'),button=document.getElementById('likesSubmitBtn'),uid=input.value.trim();
  document.getElementById('likesResult').hidden=true;
  if(!/^[1-9]\d{5,19}$/.test(uid)){input.setAttribute('aria-invalid','true');likesStatus('Masukkan UID Free Fire yang valid.','error');input.focus();return;}
  input.removeAttribute('aria-invalid');LIKES_STATE.busy=true;button.disabled=true;input.readOnly=true;button.setAttribute('aria-busy','true');
  const original=button.innerHTML;button.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>Memproses…';likesStatus('Sedang memproses like…');
  try{
    if(!/^https?:$/.test(location.protocol))throw new Error('Buka versi website untuk menggunakan Like Gratis. Fitur ini tidak tersedia dari file HTML lokal.');
    // Netlify forwards this same-origin route. Send each action only once.
    const query=new URLSearchParams({key:'20LikeFreeApiByzexxyh4x',uid:uid,region:'id',_request:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)});
    const response=await zsFetchTimeout('/api/ff-likes/like?'+query.toString(),{method:'GET',headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'},65000);
    if(response.status===404||response.status===405)throw new Error('Like Gratis belum tersedia. Silakan hubungi admin.');
    if([502,503,504].includes(response.status))throw new Error('Layanan belum memberikan hasil. Periksa jumlah like di game sebelum mencoba lagi.');
    if(!response.ok){let detail;try{detail=await response.json();}catch(e){}throw new Error(detail&&typeof detail.error==='string'?detail.error:response.status===429?'Batas layanan tercapai. Coba lagi nanti.':'Layanan sedang tidak tersedia. Coba lagi nanti.');}
    let data;try{data=await response.json();}catch(e){throw new Error('Respons layanan belum dapat dibaca. Coba lagi nanti.');}
    likesRender(likesParseResult(data,uid));
  }catch(e){
    likesStatus(e&&e.name==='AbortError'?'Waktu tunggu habis. Periksa jumlah like di game sebelum mencoba lagi.':e instanceof TypeError?'Koneksi terputus. Periksa jumlah like di game sebelum mencoba lagi.':e.message||'Like belum dapat diproses.','error');
  }finally{LIKES_STATE.busy=false;button.disabled=false;input.readOnly=false;button.removeAttribute('aria-busy');button.innerHTML=original;}
}
document.addEventListener('DOMContentLoaded',function(){
  const paidInput=document.getElementById('slIdInput');paidInput.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');this.removeAttribute('aria-invalid');document.getElementById('likesPaidError').hidden=true;});
  const input=document.getElementById('likesUidInput');input.addEventListener('input',function(){this.value=this.value.replace(/\D/g,'');this.removeAttribute('aria-invalid');document.getElementById('likesResult').hidden=true;document.getElementById('likesStatus').hidden=true;});
  const tabs=[document.getElementById('likesTabFree'),document.getElementById('likesTabPaid')];tabs.forEach(function(tab,index){tab.addEventListener('keydown',function(e){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-index;likesSwitchTab(next?'paid':'free');tabs[next].focus();});});
});
