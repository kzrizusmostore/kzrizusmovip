'use strict';
const http=require('node:http');
const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=__dirname;
function requestLikes(uid){
  return new Promise((resolve,reject)=>{
    const url=new URL('https://two0likeapifreebyzexxyh4x.onrender.com/like');
    url.searchParams.set('key',process.env.LIKES_API_KEY||'20LikeFreeApiByzexxyh4x');url.searchParams.set('uid',uid);url.searchParams.set('region','id');
    const req=https.get(url,{headers:{Accept:'application/json'}},res=>{
      let body='';res.setEncoding('utf8');res.on('data',chunk=>{body+=chunk;if(body.length>1048576)req.destroy(new Error('Respons layanan terlalu besar.'));});
      res.on('end',()=>{try{const data=JSON.parse(body);resolve({status:res.statusCode,data});}catch(e){reject(new Error('Respons layanan tidak valid.'));}});
    });
    const timer=setTimeout(()=>req.destroy(new Error('Waktu tunggu layanan habis. Periksa jumlah like di game sebelum mencoba lagi.')),60000);
    req.on('close',()=>clearTimeout(timer));req.on('error',()=>{clearTimeout(timer);reject(new Error('Koneksi layanan terputus. Periksa jumlah like sebelum mencoba lagi.'));});
  });
}
function createServer(upstream=requestLikes){
  const pending=new Set();
  function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
  return http.createServer(async(req,res)=>{
    let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch(e){return json(res,400,{error:'URL tidak valid.'});}
    if(pathname==='/api/likes'||pathname==='/api/ff-likes/like'){
      let uid;
      if(pathname==='/api/ff-likes/like'){
        if(req.method!=='GET')return json(res,405,{error:'Metode tidak didukung.'});
        uid=new URL(req.url,'http://localhost').searchParams.get('uid');
      }else{
      if(req.method!=='POST')return json(res,405,{error:'Gunakan tombol Tambah like.'});
      let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>2048){json(res,413,{error:'Data terlalu panjang.'});req.resume();return;}}}catch(e){return;}
      try{uid=JSON.parse(raw).uid;}catch(e){return json(res,400,{error:'Data tidak valid.'});}
      }
      if(typeof uid!=='string'||! /^[1-9]\d{5,19}$/.test(uid))return json(res,400,{error:'UID Free Fire tidak valid.'});
      if(pending.has(uid))return json(res,409,{error:'UID ini sedang diproses. Tunggu hasilnya.'});
      pending.add(uid);
      try{const result=await upstream(uid);json(res,result.status||502,result.data);}catch(e){json(res,502,{error:e.message||'Layanan belum dapat dihubungi.'});}finally{pending.delete(uid);}return;
    }
    if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Metode tidak didukung.'});
    let file;if(pathname==='/'||pathname==='/index.html')file=path.join(ROOT,'index.html');
    else if(['/zusmo-asset/','/css/','/js/'].some(prefix=>pathname.startsWith(prefix))){
      let decoded;try{decoded=decodeURIComponent(pathname);}catch(e){return json(res,400,{error:'Path tidak valid.'});}
      const folder=pathname.split('/')[1];file=path.resolve(ROOT,'.'+decoded);
      if(!file.startsWith(path.join(ROOT,folder)+path.sep))return json(res,403,{error:'Akses ditolak.'});
      if((folder==='css'&&!file.endsWith('.css'))||(folder==='js'&&!file.endsWith('.js')))return json(res,403,{error:'Akses ditolak.'});
    }
    else return json(res,404,{error:'Halaman tidak ditemukan.'});
    fs.stat(file,(err,stat)=>{if(err||!stat.isFile())return json(res,404,{error:'File tidak ditemukan.'});
      const type={'.html':'text/html; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.mp3':'audio/mpeg','.m4a':'audio/mp4','.woff2':'font/woff2','.css':'text/css','.js':'text/javascript'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':pathname==='/'||pathname==='/index.html'?'no-cache':'public, max-age=86400','X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
    });
  });
}
if(require.main===module)createServer().listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Website berjalan di http://localhost:'+(process.env.PORT||3000)));
module.exports={createServer};
