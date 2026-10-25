/** GitHub Pages -> 隱藏的 Apps Script HTML Service RPC 橋接；不使用 CORS fetch。 */
(function(){
 'use strict';
 var endpoint=String(window.NIGHT_GAS_EXEC_URL||'').trim();
 var good=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
 var pending=new Map(),ready=false,remote=null,remoteOrigin='',frame=null,queue=[],seq=0;
 function configured(){return good.test(endpoint)&&endpoint.indexOf('PASTE_YOUR_DEPLOYMENT_ID')===-1;}
 var nonce='';
 if(window.crypto&&window.crypto.getRandomValues){
  var bytes=new Uint8Array(24);window.crypto.getRandomValues(bytes);
  nonce=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 }else{nonce=String(Date.now())+String(Math.random()).replace('0.','')+String(Math.random()).replace('0.','');}
 function status(msg,failed){
  var el=document.getElementById('backendStatus');
  if(!el){el=document.createElement('div');el.id='backendStatus';el.setAttribute('role','status');
   el.style.cssText='position:fixed;right:12px;bottom:15px;max-width:min(90vw,420px);z-index:9999;border-radius:10px;padding:10px 14px;font-size:13px;color:#fff;background:#403153;box-shadow:0 4px 20px #0008';
   document.body.appendChild(el);
  }
  el.textContent=msg;el.hidden=!msg;if(failed)el.style.background='#9b234b';
 }
 function validOrigin(origin){try{var u=new URL(origin);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com'));}catch(e){return false;}}
 function send(req){
  if(!remote){queue.push(req);return;}
  remote.postMessage({nightStoreBridge:'v96',nonce:nonce,type:'rpc',id:req.id,action:req.action,arg:req.arg},remoteOrigin);
 }
 window.addEventListener('message',function(ev){
  var d=ev.data;
  if(!d||d.nightStoreBridge!=='v96'||d.nonce!==nonce||!validOrigin(ev.origin))return;
  if(d.type==='ready'){
   if(!ready){ready=true;remote=ev.source;remoteOrigin=ev.origin;status('');
    var q=queue.splice(0);for(var i=0;i<q.length;i++)send(q[i]);
   }
   return;
  }
  if(d.type!=='result'||!ready||ev.source!==remote||ev.origin!==remoteOrigin)return;
  var rec=pending.get(d.id);if(!rec)return;
  clearTimeout(rec.timeout);pending.delete(d.id);
  if(d.error)rec.reject(Error(String(d.error)));
  else if(d.response&&d.response.error)rec.reject(Error(String(d.response.error)));
  else rec.resolve(d.response);
 });
 function start(){
  if(!configured()){
   status('GAS 網址未正確載入，請覆蓋新版 index.html 與 funtoys/index.html，並使用新版網址重新開啟。',true);return;
  }
  status('正在連接商城資料…');
  frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');frame.setAttribute('tabindex','-1');
  // 此頁僅執行 API 連線，不將 Google Apps Script 的介面嵌進可見購物畫面。
  frame.style.cssText='position:absolute;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  var u=new URL(endpoint);u.searchParams.set('bridge','1');u.searchParams.set('origin',location.origin);u.searchParams.set('nonce',nonce);
  frame.src=u.toString();document.body.appendChild(frame);
  setTimeout(function(){if(!ready)status('GAS 連線逾時：請確認 Code.gs 使用 V9.6 橋接、允許 https://jacknack901.github.io、重新部署新版本；部分瀏覽器可能封鎖第三方框架。',true);},16000);
 }
 window.NightBridge={
  rpc:function(action,arg){
   if(!configured())return Promise.reject(Error('尚未在 config.js 設定 GAS /exec 網址'));
   return new Promise(function(resolve,reject){
    var id=String(++seq)+'_'+nonce.slice(0,12);
    var rec={resolve:resolve,reject:reject};pending.set(id,rec);
    rec.timeout=setTimeout(function(){pending.delete(id);reject(Error('資料連線逾時，請重新整理後再試'));},120000);
    send({id:id,action:action,arg:arg||{}});
   });
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
