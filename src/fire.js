// <mf-fire>: lightweight WebGL fire (noise-based). Capped at 30 fps, paused off-screen, hides itself without WebGL.
if (!customElements.get('mf-fire')) {
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 fl;uniform vec3 em;uniform float fa;uniform float ea;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/r;float asp=r.x/r.y;vec2 q=vec2(uv.x*asp,uv.y);
  float base=.12;float y=max(uv.y-base,0.);
  vec2 w=vec2(fbm(vec2(q.x*2.2,q.y*1.6-t*.9)),fbm(vec2(q.x*2.2+5.2,q.y*1.6-t*.9+1.3)));
  float tb=fbm(vec2(q.x*4.5+w.x*1.6,q.y*3.2-t*2.2+w.y*1.2))*.75+fbm(vec2(q.x*11.+w.y*2.,q.y*7.-t*3.4))*.25;
  float cl=.5+.5*sin(q.x*13.+w.x*4.+t*.6);
  float hc=(.3+.62*fbm(vec2(q.x*5.,t*.5)))*(.5+.5*cl);
  float g=1.-y/hc;
  float i=g-(tb-.42)*(.3+y*2.2);
  i*=smoothstep(-.02,.03,uv.y-base);
  i=clamp(i,0.,1.);
  float br=pow(i,1.25)*1.65;
  vec3 hot=mix(fl,vec3(1.,.94,.82),.6);
  vec3 c=mix(em*.8,fl,smoothstep(.1,.45,i));
  c=mix(c,hot,smoothstep(.6,.95,i)*smoothstep(.3,.0,y));
  c*=br;
  c*=fa;
  float bed=smoothstep(base+.02,base-.06,uv.y)*smoothstep(-.02,.05,uv.y);
  float e=fbm(vec2(q.x*14.+t*.15,q.y*26.+t*.4));
  vec3 ec=em*(.25+.55*e)*bed+mix(em,vec3(1.,.9,.72),.5)*pow(e,5.)*bed*2.;
  vec3 col=c+ec*ea;
  float al=clamp(max(col.r,max(col.g,col.b))*1.3,0.,1.);
  gl_FragColor=vec4(col,al);
}`;
  const rgb = (s) => String(s || '255,110,20').split(',').map((v) => (+v || 0) / 255);
  class MfFire extends HTMLElement {
    static get observedAttributes() { return ['fl', 'em', 'fa', 'ea', 'rate', 'static']; }
    connectedCallback() {
      if (this._gl) return;
      this.style.display = 'block';
      const cv = document.createElement('canvas');
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      this.appendChild(cv);
      const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
      if (!gl) { this.style.display = 'none'; this.dispatchEvent(new CustomEvent('mf-nogl', { bubbles: true })); return; }
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { this.style.display = 'none'; return; }
      gl.useProgram(pr);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this._u = Object.fromEntries(['r', 't', 'fl', 'em', 'fa', 'ea'].map((k) => [k, gl.getUniformLocation(pr, k)]));
      this._gl = gl; this._cv = cv; this._t = Math.random() * 50; this._last = 0; this._vis = true;
      this._io = new IntersectionObserver((es) => { this._vis = es.some((e) => e.isIntersecting); this._kick(); });
      this._io.observe(this);
      this._onvis = () => this._kick(); document.addEventListener('visibilitychange', this._onvis);
      this._kick(true);
    }
    disconnectedCallback() {
      cancelAnimationFrame(this._raf); this._raf = 0;
      this._io && this._io.disconnect(); document.removeEventListener('visibilitychange', this._onvis);
      const ext = this._gl && this._gl.getExtension('WEBGL_lose_context'); ext && ext.loseContext();
      this._gl = null; this.innerHTML = '';
    }
    attributeChangedCallback() { if (this._gl) this._kick(true); }
    _kick(force) {
      if (!this._gl) return;
      const still = this.hasAttribute('static');
      if (force || still) { this._draw(0); }
      if (still || !this._vis || document.hidden) { cancelAnimationFrame(this._raf); this._raf = 0; return; }
      if (!this._raf) this._raf = requestAnimationFrame((ts) => this._loop(ts));
    }
    _loop(ts) {
      this._raf = 0;
      if (!this._gl || !this._vis || document.hidden || this.hasAttribute('static')) return;
      const dt = this._last ? ts - this._last : 33;
      if (dt >= 33) { this._last = ts; this._draw(Math.min(dt, 100) / 1000); } // cap ~30 fps
      this._raf = requestAnimationFrame((t2) => this._loop(t2));
    }
    _draw(dt) {
      const gl = this._gl, cv = this._cv, u = this._u;
      const k = Math.min(window.devicePixelRatio || 1, 2) * 0.75; // render below native res; fire is soft by nature
      const w = Math.max(32, Math.round(this.clientWidth * k)), h = Math.max(32, Math.round(this.clientHeight * k));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      this._t += dt * (parseFloat(this.getAttribute('rate')) || 1);
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.r, w, h); gl.uniform1f(u.t, this._t);
      gl.uniform3fv(u.fl, rgb(this.getAttribute('fl'))); gl.uniform3fv(u.em, rgb(this.getAttribute('em')));
      gl.uniform1f(u.fa, parseFloat(this.getAttribute('fa') ?? 1)); gl.uniform1f(u.ea, parseFloat(this.getAttribute('ea') ?? 1));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }
  customElements.define('mf-fire', MfFire);
}
