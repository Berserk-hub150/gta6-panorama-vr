const el=id=>document.getElementById(id),canvas=el("scene"),gl=canvas.getContext("webgl",{alpha:false,xrCompatible:true});
async function main(){
 if(!gl)throw Error("WebGL is unavailable in this browser.");
 function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
 const program=gl.createProgram();
 gl.attachShader(program,shader(gl.VERTEX_SHADER,"attribute vec2 p;varying vec2 xy;void main(){xy=p;gl_Position=vec4(p,0.,1.);}"));
 gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision highp float; varying vec2 xy; uniform mat3 rot;uniform vec4 lens;uniform sampler2D pano;
 void main(){vec3 d=normalize(rot*vec3((xy+lens.zw)/lens.xy,-1.));vec2 uv=vec2(fract(.5+atan(d.x,-d.z)/6.2831853),.5-asin(clamp(d.y,-1.,1.))/3.14159265);gl_FragColor=texture2D(pano,uv);}`));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
 const p=gl.getAttribLocation(program,"p");gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
 for(const key of [gl.TEXTURE_MAG_FILTER,gl.TEXTURE_MIN_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
 const mat=gl.getUniformLocation(program,"rot"),lens=gl.getUniformLocation(program,"lens");let yaw=0,pitch=0,session=null;
 function draw(rot,projection){gl.uniformMatrix3fv(mat,false,rot);gl.uniform4fv(lens,projection);gl.drawArrays(gl.TRIANGLES,0,3);}
 function flat(){if(session)return;const a=Math.cos(yaw),b=Math.sin(yaw),c=Math.cos(pitch),d=Math.sin(pitch);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
 draw([a,0,-b,b*d,c,a*d,b*c,-d,a*c],[canvas.height/canvas.width,1,0,0]);}
 function image(src,temporary=false){const im=new Image();im.onload=()=>{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);flat();if(temporary)URL.revokeObjectURL(src);};
 im.onerror=()=>{el("status").textContent="Could not read the panorama.";if(temporary)URL.revokeObjectURL(src);};im.src=src;}
 image("practice.jpg");el("file").onchange=()=>{const f=el("file").files[0];if(f)image(URL.createObjectURL(f),true);};
 function turn(x,y){yaw+=x;pitch=Math.max(-1.5,Math.min(1.5,pitch+y));flat();}
 canvas.style.touchAction="none";canvas.onpointerdown=e=>canvas.setPointerCapture(e.pointerId);
 canvas.onpointermove=e=>{if(canvas.hasPointerCapture(e.pointerId))turn(e.movementX*.006,e.movementY*.006);};
 canvas.onkeydown=e=>{const v={ArrowLeft:[.1,0],ArrowRight:[-.1,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.key];if(v){e.preventDefault();turn(...v);}};
 if(!navigator.xr||!await navigator.xr.isSessionSupported("immersive-vr")){el("status").textContent="Desktop view active. Immersive mode needs WebXR and a headset.";return;}
 el("vr").disabled=false;el("vr").onclick=async()=>{try{if(session){await session.end();return;}
 session=await navigator.xr.requestSession("immersive-vr");session.addEventListener("end",()=>{session=null;el("vr").textContent="Enter VR";flat();});
 await gl.makeXRCompatible();const layer=new XRWebGLLayer(session,gl);session.updateRenderState({baseLayer:layer});
 const space=await session.requestReferenceSpace("local");el("vr").textContent="Exit VR";
 function xr(t,frame){const pose=frame.getViewerPose(space);gl.bindFramebuffer(gl.FRAMEBUFFER,layer.framebuffer);
 if(pose)for(const view of pose.views){const v=layer.getViewport(view),m=view.transform.matrix,p=view.projectionMatrix;gl.viewport(v.x,v.y,v.width,v.height);
 draw([m[0],m[1],m[2],m[4],m[5],m[6],m[8],m[9],m[10]],[p[0],p[5],p[8],p[9]]);}frame.session.requestAnimationFrame(xr);}
 session.requestAnimationFrame(xr);}catch(e){el("status").textContent=e.message;if(session)await session.end();}};
}
main().catch(e=>el("status").textContent=e.message);
