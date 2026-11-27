import {glassVertex,glassFragment} from './vendor/glass/LiquidGlassNavigationEngine.js?optics=1';

// Reuse the tunnel's optical shader on a small crop of the DOM-based cover flow.
export function createAlbumGlass(){
 const canvas=document.createElement('canvas');
 canvas.className='jacket-optics';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});
 if(!gl)return null;
 function compile(type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
  return shader;
 }
 const program=gl.createProgram();
 const vertex=compile(gl.VERTEX_SHADER,glassVertex),fragment=compile(gl.FRAGMENT_SHADER,glassFragment);
 gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 const u=Object.fromEntries(['uBgTex','uResolution','uDpr','uPanelRect','uCornerRad','uOpen','uRippleAge'].map(key=>[key,gl.getUniformLocation(program,key)]));
 const attribute=gl.getAttribLocation(program,'aPos');
 const sample=document.createElement('canvas'),ctx=sample.getContext('2d');
 let previous;

 function render(panel,flow,cards){
  const rect=panel.getBoundingClientRect();if(rect.width<20||rect.height<20||gl.isContextLost())return;
  const scale=Math.min(1,650/rect.width),w=Math.round(rect.width*scale),h=Math.round(rect.height*scale);
  sample.width=canvas.width=w;sample.height=canvas.height=h;
  ctx.scale(scale,scale);ctx.translate(-rect.left,-rect.top);
  const base=ctx.createRadialGradient(rect.left+rect.width/2,rect.top+rect.height/2,4,rect.left+rect.width/2,rect.top+rect.height/2,rect.width*.66);
  base.addColorStop(0,'#343443');base.addColorStop(1,'#101119');ctx.fillStyle=base;ctx.fillRect(rect.left,rect.top,rect.width,rect.height);
  const stage=flow.getBoundingClientRect(),style=getComputedStyle(flow),distance=parseFloat(style.perspective);
  const [ox,oy]=style.perspectiveOrigin.split(' ').map(parseFloat);
  for(const {card,front,back} of [...cards].sort((a,b)=>Number(a.card.style.zIndex)-Number(b.card.style.zIndex))){
   if(back===panel)continue;
   const image=front.querySelector('img');if(!image?.complete||!image.naturalWidth)continue;
   const bounds=front.getBoundingClientRect();if(bounds.right<rect.left||bounds.left>rect.right)continue;
   const matrix=new DOMMatrix(getComputedStyle(card).transform),size=card.offsetWidth;
   const centerX=card.offsetLeft+size/2,centerY=card.offsetTop+size/2;
   const project=(x,y)=>{
    const point=matrix.transformPoint(new DOMPoint(x,y,0));
    const ratio=distance/(distance-point.z);
    return [stage.left+ox+(centerX+point.x-ox)*ratio,stage.top+oy+(centerY+point.y-oy)*ratio];
   };
   for(let i=0;i<24;i++){
    const x=(i/24-.5)*size,next=((i+1)/24-.5)*size;
    const [left,top]=project(x,-size/2),[right]=project(next,-size/2),[,bottom]=project(x,size/2);
    if(right<=left)continue;
    ctx.drawImage(image,i*image.naturalWidth/24,0,image.naturalWidth/24,image.naturalHeight,left,top,right-left+1,bottom-top);
   }
  }
  gl.viewport(0,0,w,h);gl.useProgram(program);
  gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,sample);
  gl.uniform1i(u.uBgTex,0);gl.uniform2f(u.uResolution,w,h);gl.uniform1f(u.uDpr,scale);
  gl.uniform4f(u.uPanelRect,0,0,w,h);gl.uniform1f(u.uCornerRad,23*scale);gl.uniform1f(u.uOpen,1);gl.uniform1f(u.uRippleAge,-1);
  gl.drawArrays(gl.TRIANGLES,0,6);
  if(previous!==panel){previous?.classList.remove('has-optics');panel.prepend(canvas);previous=panel;}
  panel.classList.add('has-optics');
 }
 return {render};
}
