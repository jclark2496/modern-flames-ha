/*
 * modern-flames-card — "Studio" control panel for Modern Flames fireplaces (tuya-local).
 * Zero dependencies, no build step. MIT licence.
 *
 *   type: custom:modern-flames-card
 *   entity: climate.living_room_fireplace   # tuya-local climate entity
 *   name: Living Room                        # optional
 *   prefix: living_room_fireplace            # optional, if your entity ids differ
 *   demo: true                               # optional: no entities needed, nothing is sent to HA
 *   flame_style: glow                        # glow | shader | illustrated
 *   ...                                      # all options: see README.md
 */
const MF_VERSION = '0.1.0';
// <mf-fire>
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
// </mf-fire>
// <mf-stage>
const mfSvg = (o) => {
  // Crisp vector fire: layered outer / mid / inner tongues with gradient fills, plus an ember bed. No blur filters.
  const f = (n) => (+n).toFixed(2);
  const rgbArr = (s) => String(s).split(',').map(Number);
  const mix = (s, t, to = [255, 246, 228]) => rgbArr(s).map((v, i) => Math.round(v + (to[i] - v) * t)).join(',');
  const dark = (s, t) => rgbArr(s).map((v) => Math.round(v * (1 - t))).join(',');
  const id = 'mf' + String(o.uid || 'x').replace(/[^a-z0-9]/gi, '');
  const mini = /mf-orb/.test(o.cls || '');
  const live = o.realistic !== false && o.on;
  const B = 198, K = o.height || 0.86;
  // forked tongue in a 100x100 box, base at y=100; k leans the tips
  const tongue = (k) => `M50,100 C20,100 6,80 14,60 C20,44 33,38 ${36 + k},20 C${37 + k},12 ${35 + k},6 ${32 + k},0 C${46 + k},10 ${58 + k},22 ${62 + k * .6},36 C${64 + k * .6},28 ${66 + k * .6},22 ${66 + k * .5},14 C${78 + k * .4},28 90,46 86,64 C84,86 72,100 50,100 Z`;
  const core = (k) => `M50,100 C33,100 28,86 34,72 C39,61 ${46 + k * .4},54 ${48 + k * .5},36 C${56 + k * .4},50 67,62 66,78 C65,93 59,100 50,100 Z`;
  const morph = (fn, d, dl) => live ? `<animate attributeName="d" dur="${f(o.spd * d * 2.2)}s" begin="${f(-dl * 3)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.33;.66;1" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1" values="${fn(0)};${fn(-9)};${fn(7)};${fn(0)}"/>` : '';
  // [x, height, width, speed factor, delay]
  const T = mini
    ? [[150, 150, 120, 1.0, .2], [250, 140, 120, 1.1, .7], [200, 190, 130, .9, .45]]
    : [[14, 70, 56, .95, .1], [46, 118, 70, 1.1, .6], [80, 88, 58, .9, .3], [114, 150, 76, 1.15, .85], [150, 104, 62, 1.0, .5],
       [184, 170, 80, .92, .2], [220, 122, 66, 1.08, .7], [254, 156, 76, .96, .4], [290, 96, 60, 1.12, .9], [324, 138, 72, 1.0, .15],
       [358, 92, 60, 1.05, .55], [390, 64, 52, .97, .35]];
  const layer = (cls, fill, inset, fn) => T.map(([x, h, w, d, dl], i) => {
    const sx = (i % 2 ? -1 : 1) * w / 100, sy = h * K / 100;
    const [ix, iy, isx, isy] = inset;
    const anim = live ? `style="animation-duration:${f(o.spd * d * 1.6)}s;animation-delay:${f(-dl * 2)}s"` : '';
    return `<g class="mf-t ${cls}" ${anim}><path fill="url(#${id}${fill})" transform="translate(${f(x - sx * 50)},${f(B - h * K)}) scale(${f(sx)},${f(sy)}) translate(${ix},${iy}) scale(${isx},${isy})" d="${fn(0)}">${morph(fn, d, dl + i * .13)}</path></g>`;
  }).join('');
  const grad = (n, bot, top, ob = 1, ot = 1) => `<linearGradient id="${id}${n}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="rgb(${bot})" stop-opacity="${ob}"/><stop offset="1" stop-color="rgb(${top})" stop-opacity="${ot}"/></linearGradient>`;
  const bedTop = mini ? `M60,${B - 4} C110,${B - 14} 150,${B - 8} 200,${B - 13} C250,${B - 18} 290,${B - 6} 340,${B - 10} L340,220 L60,220 Z`
    : `M0,${B - 2} C30,${B - 12} 60,${B - 6} 92,${B - 11} C130,${B - 17} 160,${B - 5} 200,${B - 10} C240,${B - 15} 272,${B - 4} 310,${B - 11} C346,${B - 17} 372,${B - 6} 400,${B - 9} L400,220 L0,220 Z`;
  const G = mini ? [[120, 205, 4], [168, 210, 3], [205, 203, 4.5], [246, 209, 3], [285, 204, 4]]
    : [[24, 203, 2.2], [58, 209, 1.6], [90, 202, 2.6], [126, 208, 1.8], [160, 203, 2.4], [196, 209, 1.8], [230, 202, 2.6], [266, 208, 1.7], [300, 203, 2.4], [336, 209, 1.8], [372, 203, 2.2]];
  const glints = G.map(([x, y, r], i) => `<circle class="mf-e" cx="${x}" cy="${y}" r="${r}" fill="rgb(${mix(o.em, .7)})" ${live ? `style="animation-duration:${f(o.spd * (1.8 + (i % 3) * .5))}s;animation-delay:${f(-(i * .37) % 1.3)}s"` : ''}/>`).join('');
  return `<div class="mf-stage ${o.on ? '' : 'mf-is-off'} ${o.fx || ''} ${o.cls || ''} ${live ? '' : 'mf-static'}" style="--dl:${o.dl};--dla:${o.dla}">
    <div class="mf-dl"></div>
    <svg class="mf-svg" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" shape-rendering="geometricPrecision" aria-hidden="true">
      <defs>
        ${grad('o', dark(o.fl, .08), dark(o.fl, .38))}
        ${grad('m', mix(o.fl, .42), mix(o.fl, .06))}
        ${grad('i', mix(o.fl, .85), mix(o.fl, .5), 1, .9)}
        ${grad('b', dark(o.em, .62), mix(o.em, .12))}
        <radialGradient id="${id}h" cx="50%" cy="100%" r="60%"><stop offset="0" stop-color="rgb(${o.fl})" stop-opacity=".32"/><stop offset="1" stop-color="rgb(${o.fl})" stop-opacity="0"/></radialGradient>
        <radialGradient id="${id}eh" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgb(${o.em})" stop-opacity=".55"/><stop offset="1" stop-color="rgb(${o.em})" stop-opacity="0"/></radialGradient>
      </defs>
      <g class="mf-fx">
        <rect x="0" y="40" width="400" height="${B - 30}" fill="url(#${id}h)" opacity="${f(o.fla)}"/>
        <g opacity="${f(Math.max(.35, o.fla))}" ${o.fla > 0 ? '' : 'display="none"'}>
          ${layer('mf-o', 'o', [0, 0, 1, 1], tongue)}
          ${layer('mf-m', 'm', [17, 30, .66, .7], tongue)}
          ${layer('mf-i', 'i', [22, 26, .56, .74], core)}
        </g>
        <ellipse cx="200" cy="${B + 4}" rx="${mini ? 150 : 215}" ry="22" fill="url(#${id}eh)" opacity="${f(o.ema)}"/>
        <g opacity="${f(Math.max(.35, o.ema))}" ${o.ema > 0 ? '' : 'display="none"'}>
          <path d="${bedTop}" fill="url(#${id}b)"/>
          ${glints}
        </g>
      </g>
    </svg>
    <div class="mf-glass"></div>
  </div>`;
};

const mfStage = (o) => {
  // flame_style: glow (default) | shader | illustrated
  // intensity scales how bright the preview is (0.2-1.6); it never changes the fireplace itself
  const k = Math.max(0.2, Math.min(1.6, Number(o.intensity) || 1));
  o = {...o, fla: (o.fla * k).toFixed(2), ema: (o.ema * k).toFixed(2), dla: (o.dla * k).toFixed(2)};
  const style = ['glow', 'shader', 'illustrated'].includes(o.style) ? o.style : 'glow';
  if (style === 'illustrated') return mfSvg(o);
  const arr = (s) => String(s).split(',').map(Number);
  const mixw = (s, t) => arr(s).map((v) => Math.round(v + (255 - v) * t)).join(',');
  const live = o.realistic !== false && o.on;
  const rate = (1 / (o.spd || 1)).toFixed(2);
  const vars = `--fl:${o.fl};--fla:${o.fla};--em:${o.em};--ema:${o.ema};--dl:${o.dl};--dla:${o.dla};--flw:${mixw(o.fl, .45)};--emw:${mixw(o.em, .6)};--rate:${rate}`;
  const glow = `<div class="mf-glow"><i class="mf-g1"></i><i class="mf-g2"></i><i class="mf-g3"></i></div><div class="mf-eline"></div>`;
  let body = '';
  if (style === 'glow') body = glow;
  if (style === 'shader') body = `<mf-fire fl="${o.fl}" em="${o.em}" fa="${o.fla}" ea="${o.ema}" rate="${rate}" ${live ? '' : 'static'}></mf-fire>${glow}`;
  return `<div class="mf-stage mf-s-${style} ${o.on ? '' : 'mf-is-off'} ${o.fx || ''} ${o.cls || ''} ${live ? '' : 'mf-static'}" style="${vars}">
    <div class="mf-dl"></div><div class="mf-fx">${o.on ? body : ''}</div><div class="mf-glass"></div></div>`;
};
// </mf-stage>
const SCENES = ['Default', 'Rainbow fade', '3-color fade', 'Red fade', 'Green fade', 'Blue fade',
  'Rainbow jump', '3-color jump', 'Custom 1', 'Custom 2', 'Custom 3'];
const TIMERS = ['cancel', '30m', '1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h'];
const PALETTE = [
  ['Amber', [255, 110, 20]], ['Ember', [255, 42, 0]], ['Gold', [255, 176, 40]], ['Rose', [255, 40, 120]],
  ['Violet', [150, 60, 255]], ['Ice', [40, 140, 255]], ['Teal', [0, 210, 180]], ['White', [255, 236, 210]],
];
const ZONES = [['flame', 'Flame'], ['embers', 'Embers'], ['downlight', 'Downlight']];
const SECTIONS = ['heat', 'target', 'colors', 'scene', 'speed', 'timer'];
const ENT_KEY = { flame: 'flame', embers: 'embers', downlight: 'downlight', scene: 'scene', flame_motor_speed: 'speed', timer: 'timer', time_remaining: 'remaining', sync_lights: 'sync' };
const toRgb = (v) => { if (Array.isArray(v)) return v.map(Number); const h = String(v || '').replace('#', ''); return h.length === 6 ? [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) : null; };
const TIMER_MIN = { cancel: 0, '30m': 30, '1h': 60, '2h': 120, '3h': 180, '4h': 240, '5h': 300, '6h': 360, '7h': 420, '8h': 480 };

class ModernFlamesCard extends HTMLElement {
  static getStubConfig() { return { entity: 'climate.living_room_fireplace', demo: false }; }

  setConfig(config) {
    if (!config.entity && !config.demo) throw new Error('Set entity: climate.<your_fireplace> (or demo: true)');
    this._config = { ...config };
    const show = (config.show || (config.compact ? ['heat', 'target', 'speed', 'timer'] : SECTIONS)).map(x => x === 'colours' ? 'colors' : x);
    this._show = new Set(show);
    this._prefix = config.prefix || (config.entity ? config.entity.split('.')[1] : 'demo_fireplace');
    if (config.demo) {
      this._demo = {
        on: true, fan: config.demo_heat || 'low', cur: 73, tgt: 74, scene: config.demo_scene || 'Default', speed: '3', timer: '2h', rem: 104, sync: false,
        zones: { flame: [255, 110, 20], embers: [255, 42, 0], downlight: [255, 176, 40] },
        bri: { flame: 255, embers: 255, downlight: 200 },
      };
    }
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._demo) { if (!this._drawn) this._render(); return; }
    // Only redraw when one of this fireplace's entities changed, so the flames don't restart.
    const extra = Object.values(this._config.entities || {});
    const sig = Object.keys(hass.states).filter(k => k.split('.')[1].startsWith(this._prefix) || extra.includes(k))
      .map(k => k + hass.states[k].last_updated).join('|');
    if (sig === this._sig) return;
    this._sig = sig; this._render();
  }
  getCardSize() { return 7; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  /* ---------- state ---------- */
  _id(d, x) {
    const e = this._config.entities || {};
    if (x && e[ENT_KEY[x]]) return e[ENT_KEY[x]];
    return x ? `${d}.${this._prefix}_${x}` : (this._config.entity || `${d}.${this._prefix}`);
  }
  _st(d, x) { return this._hass && this._hass.states[this._id(d, x)]; }
  _model() {
    if (this._demo) {
      const d = this._demo;
      return {
        name: this._config.name || 'Living Room', on: d.on, fan: d.fan, heat: d.on && d.fan !== 'off', cur: d.cur, tgt: d.on && d.fan !== 'off' ? d.tgt : null, min: 50, max: 85,
        scene: d.scene, speed: d.speed, timer: d.timer, rem: d.rem, sync: d.sync,
        zones: Object.fromEntries(ZONES.map(([z]) => [z, { on: d.on && d.bri[z] > 0, rgb: d.zones[z], bri: d.bri[z] }])),
        unit: '°F', ok: true,
      };
    }
    const c = this._st('climate');
    if (!c) return { ok: false };
    const on = !['off', 'unavailable', 'unknown'].includes(c.state);
    const fan = c.attributes.fan_mode || 'off';
    const zones = {};
    for (const [z] of ZONES) {
      const l = this._st('light', z);
      zones[z] = { on: on && l && l.state === 'on', rgb: (l && l.attributes.rgb_color) || [255, 110, 30], bri: (l && l.attributes.brightness) || 0 };
      const fixed = toRgb((this._config.colors || {})[z]); if (fixed) zones[z].rgb = fixed;
    }
    const sel = (x, dflt) => { const s = this._st('select', x); return s ? s.state : dflt; };
    const rem = this._st('sensor', 'time_remaining');
    const sync = this._st('switch', 'sync_lights');
    return {
      ok: true, name: this._config.name || (c.attributes.friendly_name || 'Fireplace').replace(/\s*fireplace$/i, ''),
      on, fan, heat: on && (c.state === 'heat' || fan !== 'off'), cur: c.attributes.current_temperature, tgt: c.attributes.temperature,
      min: c.attributes.min_temp || 50, max: c.attributes.max_temp || 85,
      scene: sel('scene', 'Default'), speed: sel('flame_motor_speed', '3'), timer: sel('timer', 'cancel'),
      rem: rem ? parseInt(rem.state) || 0 : 0, sync: sync && sync.state === 'on', zones,
      unit: (this._hass.config.unit_system && this._hass.config.unit_system.temperature) || '°F',
    };
  }

  /* ---------- actions (demo mode never calls HA) ---------- */
  _call(domain, service, data, demoFn) {
    if (this._demo) { demoFn && demoFn(this._demo); this._render(); return; }
    this._hass.callService(domain, service, data);
  }
  _power(m) { this._call('climate', 'set_hvac_mode', { entity_id: this._id('climate'), hvac_mode: m.on ? 'off' : 'fan_only' }, d => { d.on = !d.on; if (!d.on) d.fan = 'off'; }); }
  _heat(fan) { this._call('climate', 'set_fan_mode', { entity_id: this._id('climate'), fan_mode: fan }, d => { d.fan = fan; d.on = true; }); }
  _temp(m, delta) {
    if (m.tgt == null) return;
    const t = Math.min(m.max || 85, Math.max(m.min || 50, Math.round(m.tgt + delta)));
    this._call('climate', 'set_temperature', { entity_id: this._id('climate'), temperature: t }, d => { d.tgt = t; });
  }
  _select(x, option) {
    this._call('select', 'select_option', { entity_id: this._id('select', x), option }, d => {
      if (x === 'scene') d.scene = option; if (x === 'flame_motor_speed') d.speed = option;
      if (x === 'timer') { d.timer = option; d.rem = TIMER_MIN[option]; }
    });
  }
  _color(z, rgb) {
    this._call('light', 'turn_on', { entity_id: this._id('light', z), rgb_color: rgb }, d => {
      for (const t of (d.sync ? ZONES.map(q => q[0]) : [z])) { d.zones[t] = rgb; if (!d.bri[t]) d.bri[t] = 255; }
    });
  }
  _more(id) {
    if (this._demo) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: id }, bubbles: true, composed: true }));
  }

  /* ---------- view ---------- */
  _render() {
    if (!this.shadowRoot || !this._config) return;
    if (!this._demo && !this._hass) return;
    const m = this._model();
    if (!m.ok) { this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px">Entity not found: ${this._id('climate')}</div></ha-card>`; return; }
    const rgb = z => m.zones[z].rgb.join(',');
    const a = z => (m.zones[z].on ? Math.max(0.25, m.zones[z].bri / 255) : 0).toFixed(2);
    const cfg = this._config, sh = (k) => this._show.has(k);
    const spd = cfg.speed_sync === false ? 1.3 : ({ 1: 1.7, 2: 1.3, 3: 1.0, 4: 0.72 }[m.speed] || 1);
    const pair = (a, b) => [a, b].filter(Boolean);
    const fx = /fade/i.test(m.scene) ? 'fade' : /jump/i.test(m.scene) ? 'jump' : '';
    const remTxt = m.rem > 0 ? (m.rem >= 60 ? `${Math.floor(m.rem / 60)}h ${String(m.rem % 60).padStart(2, '0')}m` : `${m.rem}m`) : '';
    const status = !m.on ? 'Off' : m.heat ? `Heating · ${m.fan === 'high' ? 'High' : 'Low'}` : 'Flames only';
    const near = (c1, c2) => c1.every((v, i) => Math.abs(v - c2[i]) < 24);
    this.shadowRoot.innerHTML = `
<style>
  :host{--mf-bg:var(--mf-card-bg,#141117);--mf-fg:var(--mf-text,#f6efe9);--mf-dim:rgba(246,239,233,.6);--mf-line:rgba(255,255,255,.08)}
  ha-card{background:var(--mf-bg);color:var(--mf-fg);border-radius:${cfg.radius || 'var(--mf-radius, 28px)'};overflow:hidden;border:1px solid var(--mf-line);
    box-shadow:${m.on ? `0 24px 60px -24px rgba(${rgb('embers')},.6)` : 'none'};font-family:var(--ha-font-family-body,Roboto,system-ui,sans-serif)}
  .stage-wrap{position:relative;height:${cfg.compact ? 150 : 230}px}
  .stage-wrap .mf-stage{position:absolute;inset:0}
  /* <mf-css> */
  .mf-stage{position:relative;overflow:hidden;background:linear-gradient(180deg,#151217 0%,#09080a 100%);}
  .mf-dl{position:absolute;left:0;right:0;top:0;height:70%;pointer-events:none;background:radial-gradient(50% 100% at 50% -12%, rgba(var(--dl),calc(.5*var(--dla))) 0%, rgba(var(--dl),calc(.12*var(--dla))) 50%, transparent 78%);}
  .mf-svg{position:absolute;left:0;right:0;bottom:0;width:100%;height:100%;display:block;}
  .mf-t{transform-box:fill-box;transform-origin:50% 100%;animation-name:mf-sway;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate;}
  .mf-e{animation-name:mf-twinkle;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate;}
  .mf-glass{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 72%, rgba(255,255,255,.03) 100%);}
  .mf-is-off .mf-svg,.mf-is-off .mf-dl{opacity:0;}
  .mf-is-off{background:linear-gradient(180deg,#19181b 0%,#0e0d10 100%) !important;}
  .mf-fx{position:absolute;inset:0;}
  .mf-fade .mf-fx{animation:mf-hue 9s linear infinite;}
  .mf-jump .mf-fx{animation:mf-hue 6s steps(6) infinite;}
  .mf-static .mf-t,.mf-static .mf-e,.mf-static .mf-fx{animation:none !important;}
  @keyframes mf-sway{0%{transform:scaleY(.9) skewX(0deg)}50%{transform:scaleY(1.04) skewX(-3deg)}100%{transform:scaleY(.96) skewX(2.5deg)}}
  @keyframes mf-twinkle{0%{opacity:.35}100%{opacity:1}}
  @keyframes mf-hue{to{filter:hue-rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){.mf-t,.mf-e,.mf-fx{animation:none !important}}

  /* glow */
  .mf-glow{position:absolute;inset:0;overflow:hidden;}
  .mf-glow i{position:absolute;border-radius:50%;will-change:transform;}
  .mf-g1{width:130%;height:150%;left:-15%;bottom:-88%;background:radial-gradient(closest-side, rgba(var(--fl),calc(.85*var(--fla))), rgba(var(--fl),calc(.25*var(--fla))) 55%, rgba(var(--fl),0));animation:mf-d1 calc(16s / var(--rate)) ease-in-out infinite alternate;}
  .mf-g2{width:85%;height:120%;left:-22%;bottom:-70%;background:radial-gradient(closest-side, rgba(var(--em),calc(.8*var(--ema))), rgba(var(--em),0));animation:mf-d2 calc(21s / var(--rate)) ease-in-out infinite alternate;}
  .mf-g3{width:80%;height:115%;right:-20%;bottom:-68%;background:radial-gradient(closest-side, rgba(var(--flw),calc(.55*var(--fla))), rgba(var(--flw),0));animation:mf-d3 calc(18s / var(--rate)) ease-in-out infinite alternate;}
  .mf-eline{position:absolute;left:10%;right:10%;bottom:15%;height:2px;border-radius:2px;opacity:var(--ema);
    background:linear-gradient(90deg, rgba(var(--em),0), rgba(var(--em),.95) 22%, rgb(var(--emw)) 50%, rgba(var(--em),.95) 78%, rgba(var(--em),0));
    box-shadow:0 0 14px 1px rgba(var(--em),.6), 0 -6px 24px rgba(var(--em),.25);animation:mf-breathe calc(5s / var(--rate)) ease-in-out infinite alternate;}
  @keyframes mf-d1{0%{transform:translate(-4%,0) scale(1)}100%{transform:translate(4%,-4%) scale(1.08)}}
  @keyframes mf-d2{0%{transform:translate(0,0) scale(1)}100%{transform:translate(18%,-6%) scale(1.12)}}
  @keyframes mf-d3{0%{transform:translate(0,-3%) scale(1.05)}100%{transform:translate(-20%,2%) scale(.95)}}
  @keyframes mf-breathe{0%{opacity:calc(.7*var(--ema))}100%{opacity:var(--ema)}}
  /* shader */
  .mf-s-shader mf-fire{position:absolute;inset:0;display:block;}
  .mf-s-shader mf-fire:not([style*="none"]) ~ .mf-glow,.mf-s-shader mf-fire:not([style*="none"]) ~ .mf-eline{display:none}
  .mf-static .mf-glow i,.mf-static .mf-eline{animation:none !important;}
  @media (prefers-reduced-motion: reduce){.mf-glow i,.mf-eline{animation:none !important}}
  /* </mf-css> */
  .hdr{position:absolute;inset:0 0 auto 0;display:flex;justify-content:space-between;padding:18px 20px;text-shadow:0 1px 10px rgba(0,0,0,.6)}
  .t{font-size:21px;font-weight:700}.s{font-size:12.5px;color:var(--mf-dim);margin-top:3px}
  .temp{text-align:right;font-size:34px;font-weight:300;line-height:1}.temp small{display:block;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:var(--mf-dim);margin-top:5px;font-weight:600}
  .pwr{position:absolute;right:16px;bottom:14px;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;display:grid;place-items:center;
    background:${m.on ? `rgba(${rgb('flame')},.9)` : 'rgba(255,255,255,.12)'};color:${m.on ? '#1a0d05' : '#fff'};box-shadow:${m.on ? `0 0 24px rgba(${rgb('flame')},.8)` : 'none'}}
  .pwr ha-icon{--mdc-icon-size:26px}
  .badge{position:absolute;left:18px;bottom:16px;display:flex;gap:6px}
  .badge span{font-size:11px;font-weight:700;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,.5);backdrop-filter:blur(6px)}
  .body{padding:16px 18px 18px;display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
  .body>*,.two>*{min-width:0}
  .lbl{font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--mf-dim);font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between}
  .seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;background:rgba(255,255,255,.06);border-radius:14px;padding:4px;gap:4px}
  .seg button{border:none;background:transparent;color:var(--mf-fg);font:inherit;font-size:13px;font-weight:600;padding:9px 0;border-radius:10px;cursor:pointer;opacity:.8}
  .seg button.on{background:rgba(255,255,255,.14);opacity:1}
  .seg.heat button.on{background:linear-gradient(160deg,#ff7a2f,#e2361a);color:#fff}
  .row{display:flex;align-items:center;gap:10px}
  .zone{display:grid;grid-template-columns:86px 1fr;align-items:center;gap:8px;margin-bottom:8px}
  .zn{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
  .zn i{width:12px;height:12px;border-radius:50%;display:inline-block}
  .sw{display:flex;gap:7px;flex-wrap:wrap}
  .sw button{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
  .sw button.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.15)}
  .step{display:flex;align-items:center;gap:12px}
  .step button{width:38px;height:38px;border-radius:12px;border:none;background:rgba(255,255,255,.08);color:var(--mf-fg);font-size:20px;cursor:pointer}
  .step b{font-size:22px;font-weight:600;min-width:58px;text-align:center}
  .chips{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .chips button{flex:0 0 auto;border:1px solid var(--mf-line);background:rgba(255,255,255,.04);color:var(--mf-fg);font:inherit;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:999px;cursor:pointer}
  .chips button.on{background:rgba(${rgb('embers')},.25);border-color:rgba(${rgb('embers')},.7)}
  .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}
  .two.one{grid-template-columns:minmax(0,1fr)}
  .dis{opacity:.4;pointer-events:none}
</style>
<ha-card>
  <div class="stage-wrap">
    ${mfStage({fl: rgb('flame'), fla: a('flame'), em: rgb('embers'), ema: a('embers'), dl: rgb('downlight'), dla: a('downlight'), spd, on: m.on, fx: fx ? 'mf-' + fx : '', uid: this._prefix, realistic: cfg.realistic !== false, style: cfg.flame_style || 'glow', intensity: cfg.intensity})}
    <div class="hdr"><div><div class="t">${m.name}</div><div class="s">${status}${m.on ? ' · ' + m.scene : ''}</div></div>
      <div class="temp">${m.cur != null ? Math.round(m.cur) + '°' : '—'}<small>room</small></div></div>
    <div class="badge">${remTxt ? `<span>⏱ ${remTxt}</span>` : ''}${this._demo ? '<span>DEMO</span>' : ''}</div>
    <button class="pwr" data-a="power" title="Power"><ha-icon icon="mdi:power"></ha-icon></button>
  </div>
  ${this._show.size ? `<div class="body">${[
    (() => { const h = sh('heat') && `<div><div class="lbl">Heat</div>
        <div class="seg heat">${['off', 'low', 'high'].map(f => `<button data-a="heat" data-v="${f}" class="${m.fan === f ? 'on' : ''}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div></div>`;
      const t = sh('target') && `<div><div class="lbl"><span>Target</span><span>${m.tgt == null ? (m.heat ? '' : 'heat off') : `${m.min ?? 50}–${m.max ?? 85}°`}</span></div>
        <div class="step ${m.tgt == null ? 'dis' : ''}"><button data-a="temp" data-v="-1">−</button><b>${m.tgt != null ? Math.round(m.tgt) + '°' : '—'}</b><button data-a="temp" data-v="1">+</button></div></div>`;
      const p = pair(h, t); return p.length ? `<div class="two ${p.length === 1 ? 'one' : ''} ${m.on ? '' : 'dis'}">${p.join('')}</div>` : ''; })(),
    sh('colors') ? `<div class="${m.on ? '' : 'dis'}"><div class="lbl"><span>Colours</span><span>${m.sync ? 'synced' : ''}</span></div>
      ${ZONES.map(([z, label]) => `<div class="zone"><div class="zn" data-a="more" data-v="${this._id('light', z)}"><i style="background:${m.zones[z].on ? `rgb(${rgb(z)})` : 'transparent'};box-shadow:0 0 8px rgba(${rgb(z)},.8);border:1px solid rgba(255,255,255,.3)"></i>${label}</div>
        <div class="sw">${PALETTE.map(([n, c]) => `<button title="${n}" data-a="color" data-z="${z}" data-v="${c.join(',')}" class="${near(m.zones[z].rgb, c) ? 'on' : ''}" style="background:rgb(${c.join(',')})"></button>`).join('')}</div></div>`).join('')}
    </div>` : '',
    sh('scene') ? `<div class="${m.on ? '' : 'dis'}"><div class="lbl">Scene</div>
      <div class="chips">${SCENES.map(s => `<button data-a="scene" data-v="${s}" class="${m.scene === s ? 'on' : ''}">${s}</button>`).join('')}</div></div>` : '',
    (() => { const sp = sh('speed') && `<div><div class="lbl">Flame speed</div><div class="seg">${['1', '2', '3', '4'].map(v => `<button data-a="speed" data-v="${v}" class="${m.speed === v ? 'on' : ''}">${v}</button>`).join('')}</div></div>`;
      const ti = sh('timer') && `<div><div class="lbl"><span>Timer</span><span>${remTxt}</span></div><div class="seg">${['cancel', '1h', '2h', '4h'].map(v => `<button data-a="timer" data-v="${v}" class="${m.timer === v ? 'on' : ''}">${v === 'cancel' ? 'Off' : v}</button>`).join('')}</div></div>`;
      const p = pair(sp, ti); return p.length ? `<div class="two ${p.length === 1 ? 'one' : ''} ${m.on ? '' : 'dis'}">${p.join('')}</div>` : ''; })(),
  ].filter(Boolean).join('')}</div>` : ''}
</ha-card>`;
    this._drawn = true;
    this.shadowRoot.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', ev => {
      ev.stopPropagation();
      const { a, v, z } = el.dataset;
      if (a === 'power') this._power(m);
      else if (a === 'heat') this._heat(v);
      else if (a === 'temp') this._temp(m, Number(v));
      else if (a === 'color') this._color(z, v.split(',').map(Number));
      else if (a === 'scene') this._select('scene', v);
      else if (a === 'speed') this._select('flame_motor_speed', v);
      else if (a === 'timer') this._select('timer', v);
      else if (a === 'more') this._more(v);
    }));
  }
}

if (!customElements.get('modern-flames-card')) customElements.define('modern-flames-card', ModernFlamesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'modern-flames-card', name: 'Modern Flames Card', description: 'Animated flame preview and full controls for Modern Flames fireplaces (tuya-local).', preview: true });
console.info(`%c MODERN-FLAMES-CARD %c ${MF_VERSION} `, 'background:#e2361a;color:#fff;font-weight:700', 'background:#222;color:#fff');
