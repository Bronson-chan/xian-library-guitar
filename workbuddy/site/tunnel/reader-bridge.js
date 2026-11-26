// One reusable workbench reader. Preparing never marks a song seen or practised.
let frame,host,pending,ready=false,visible=false,current,queued,timer,request=0;
const origin=location.origin;
function ensure(song){
 if(frame)return;
 host=document.createElement('section');host.id='cover-reader';host.hidden=true;host.setAttribute('role','dialog');host.setAttribute('aria-label','吉他谱阅读');
 host.innerHTML='<div class="reader-pending"><div><button type="button">‹ 返回封面</button><b></b></div><img alt="吉他谱"></div><iframe title="吉他谱工作台阅读器"></iframe>';
 document.body.append(host);frame=host.querySelector('iframe');pending=host.querySelector('.reader-pending');
 pending.querySelector('button').addEventListener('click',()=>closeReader());
 frame.src=new URL('../workbench.html#prepare='+song.i,document.baseURI).href;
}
export function prepareReader(song){
 queued=song;clearTimeout(timer);
 timer=setTimeout(()=>{if(!queued)return;ensure(queued);if(ready)frame.contentWindow.postMessage({type:'XIAN_PREPARE_SCORE',id:queued.i},origin);},140);
}
export function openReader(song){
 if(!song)return;clearTimeout(timer);queued=current=song;ensure(song);
 request++;visible=true;host.hidden=false;host.classList.remove('reader-ready');
 pending.querySelector('b').textContent=song.t+' · '+song.a;
 pending.querySelector('img').src=new URL('../score-preview/'+song.i+'.webp',document.baseURI).href;
 document.body.style.overflow='hidden';
 dispatchEvent(new CustomEvent('xian-cover-active',{detail:false}));
 if(!history.state?.coverReader)history.pushState({coverReader:true},'','#reader='+song.i);
 if(ready)frame.contentWindow.postMessage({type:'XIAN_OPEN_SCORE',id:song.i,request},origin);
}
export function closeReader(fromHistory=false){
 if(!visible)return;visible=false;host.hidden=true;document.body.style.overflow='';
 pending.querySelector('img').removeAttribute('src');
 frame.contentWindow.postMessage({type:'XIAN_HIDE_READER'},origin);
 dispatchEvent(new CustomEvent('xian-cover-active',{detail:true}));
 document.getElementById('open').focus({preventScroll:true});
 if(!fromHistory&&history.state?.coverReader)history.back();
}
addEventListener('message',event=>{
 if(event.origin!==origin||event.source!==frame?.contentWindow)return;
 if(event.data?.type==='XIAN_READER_READY'){
  ready=true;
  if(visible)frame.contentWindow.postMessage({type:'XIAN_OPEN_SCORE',id:current.i,request},origin);
  else if(queued)frame.contentWindow.postMessage({type:'XIAN_PREPARE_SCORE',id:queued.i},origin);
 }else if(event.data?.type==='XIAN_SCORE_READY'&&visible&&event.data.request===request){
  host.classList.add('reader-ready');pending.querySelector('img').removeAttribute('src');frame.focus();
 }else if(event.data?.type==='XIAN_RETURN_COVER')closeReader();
});
addEventListener('popstate',()=>{if(visible&&!history.state?.coverReader)closeReader(true);});
addEventListener('pagehide',()=>clearTimeout(timer));
