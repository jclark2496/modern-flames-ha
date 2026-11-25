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
