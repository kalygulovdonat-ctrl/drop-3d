// капля — «жидкость» целиком считается во фрагментном шейдере: лучи идут сквозь слитые сферы (raymarching).
import * as THREE from 'three';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 860px)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const $ = (id) => document.getElementById(id);

/* ---------- данные (заглушки) ---------- */
const PRODUCTS = [
  { id: 'rosa', name: 'Роса', type: 'Увлажняющая сыворотка', price: 2400, chips: ['Гиалуроновая кислота 2%', 'Бетаин', 'Пантенол'],
    text: 'Лёгкая, как вода. Впитывается за полминуты и держит влагу до вечера. Подходит под макияж и под SPF.' },
  { id: 'med', name: 'Мёд', type: 'Питательная сыворотка', price: 2900, chips: ['Сквалан', 'Церамиды', 'Масло овса'],
    text: 'Плотнее и теплее. Снимает стянутость после умывания, смягчает шелушения, не оставляет плёнки.' },
  { id: 'pion', name: 'Пион', type: 'Сыворотка для сияния', price: 3200, chips: ['Ниацинамид 5%', 'Витамин C', 'Экстракт пиона'],
    text: 'Выравнивает тон и возвращает коже свет. Первые изменения заметны на третьей неделе.' },
];
// цвета состояния: три тона «жидкости» и два — фона
const PAL = {
  hero: ['#f6c9d8', '#c9b6f2', '#ffe2c2', '#f8f0ea', '#e7d9f1'],
  rosa: ['#a6e6ea', '#5aa6e8', '#eafcff', '#ecf7f8', '#d3e4f6'],
  med: ['#ffd68a', '#f0953a', '#fff3d0', '#fcf2de', '#f5d9ba'],
  pion: ['#ffa3bf', '#de4f80', '#ffe4ec', '#fcebf0', '#f1cbdf'],
};
const rub = (n) => n.toLocaleString('ru-RU').replace(/ | /g, ' ') + ' ₽';

$('products').innerHTML = PRODUCTS.map((p, i) => `
  <section class="sec sec--prod" id="${p.id}" data-state="${p.id}">
    <article class="prod">
      <p class="cap prod__n"><span>0${i + 1} / 03</span><span>30 мл</span></p>
      <h2 class="prod__name">${p.name}</h2>
      <p class="prod__type">${p.type}</p>
      <ul class="chips">${p.chips.map((c) => `<li>${c}</li>`).join('')}</ul>
      <p>${p.text}</p>
      <div class="prod__buy"><span class="prod__price">${rub(p.price)}</span><button class="btn" type="button" data-add="${p.id}">В корзину</button></div>
    </article>
  </section>`).join('');

// корзина-счётчик (демо)
let bag = 0, toastT = 0;
const toast = (t) => { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2400); };
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  bag += 1; $('bagN').textContent = bag;
  toast(`«${PRODUCTS.find((p) => p.id === b.dataset.add).name}» в корзине`);
});
$('bag').addEventListener('click', () => toast(bag ? 'Демо: оформление заказа не подключено' : 'В корзине пока пусто'));

// подбор за три вопроса
const QUIZ = [
  ['Чего коже не хватает чаще всего?', ['Воды', 'Питания', 'Сияния']],
  ['Как она чувствует себя к вечеру?', ['Стянута', 'Шелушится', 'Выглядит тусклой']],
  ['Что важнее всего в уходе?', ['Лёгкость', 'Комфорт', 'Ровный тон']],
];
const quiz = { step: 0, score: [0, 0, 0], result: null };
function drawQuiz() {
  const box = $('quizBox');
  if (quiz.result) {
    const p = quiz.result;
    box.innerHTML = `<p class="cap">Ваша сыворотка</p><h2 class="quiz__res">${p.name}</h2><p>${p.type}. ${p.text}</p>
      <div class="actions"><button class="btn" type="button" data-add="${p.id}">В корзину · ${rub(p.price)}</button><button class="btn btn--line" type="button" id="quizAgain">Пройти заново</button></div>`;
    $('quizAgain').addEventListener('click', () => { quiz.step = 0; quiz.score = [0, 0, 0]; quiz.result = null; drawQuiz(); });
    return;
  }
  const [q, opts] = QUIZ[quiz.step];
  box.innerHTML = `<p class="cap">Подбор · вопрос ${quiz.step + 1} из 3</p><h2>${q}</h2>
    <div class="quiz__dots">${QUIZ.map((_, i) => `<i class="${i <= quiz.step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="opts">${opts.map((o, i) => `<button class="opt" type="button" data-o="${i}">${o}</button>`).join('')}</div>`;
}
$('quizBox').addEventListener('click', (e) => {
  const o = e.target.closest('.opt'); if (!o) return;
  quiz.score[+o.dataset.o] += 1; quiz.step += 1;
  if (quiz.step >= QUIZ.length) quiz.result = PRODUCTS[quiz.score.indexOf(Math.max(...quiz.score))];
  drawQuiz();
  const f = $('quizBox').querySelector('button'); if (f) f.focus({ preventScroll: true });
});
drawQuiz();

document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = document.querySelector(a.getAttribute('href')); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.25 });
document.querySelectorAll('.prod, .about').forEach((el) => io.observe(el));

/* ---------- скролл → состояние сцены ---------- */
const secs = [...document.querySelectorAll('.sec')];
// где стоит «жидкость»: смещение по x (в долях ширины) и насколько капли слиты
const POSE = { hero: [0.5, 0], rosa: [-0.5, 0], med: [0.5, 0], pion: [-0.5, 0], quiz: [0, 1], about: [0, 0.55] };
function sceneState() {
  const mid = innerHeight / 2; let a = secs[0], b = secs[0], f = 0;
  for (let i = 0; i < secs.length; i++) {
    const r = secs[i].getBoundingClientRect(), c = r.top + r.height / 2;
    if (c <= mid) { a = secs[i]; b = secs[Math.min(i + 1, secs.length - 1)]; const rb = b.getBoundingClientRect(), cb = rb.top + rb.height / 2; f = cb === c ? 0 : sstep(0.2, 0.8, (mid - c) / (cb - c)); }
  }
  return { a, b, f };
}
const stateOf = (s) => (s.id === 'quiz' && quiz.result ? quiz.result.id : s.dataset.state);
const poseOf = (s) => POSE[s.id] || POSE[s.dataset.state] || [0, 0];

/* ---------- сцена ---------- */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: false, powerPreference: 'high-performance' }); }
catch (e) { document.documentElement.classList.add('no-webgl'); document.body.classList.remove('is-loading'); }
if (renderer) init();

function init() {
  const QUALITY = small ? 0.62 : 0.8; // шейдер тяжёлый — считаем в меньшем разрешении
  const setSize = () => { renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5) * QUALITY); renderer.setSize(innerWidth, innerHeight, false); };
  setSize();
  const col = (h) => new THREE.Color(h);
  const U = {
    uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uMerge: { value: 0 }, uShift: { value: 0 }, uZoom: { value: 1 }, uLift: { value: 0 }, uMouse: { value: new THREE.Vector2(9, 9) },
    uC1: { value: col(PAL.hero[0]) }, uC2: { value: col(PAL.hero[1]) }, uC3: { value: col(PAL.hero[2]) }, uB1: { value: col(PAL.hero[3]) }, uB2: { value: col(PAL.hero[4]) },
  };
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: U, depthTest: false,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `
      precision highp float;
      uniform vec2 uRes, uMouse; uniform float uTime, uMerge, uShift, uZoom, uLift; uniform vec3 uC1, uC2, uC3, uB1, uB2;
      float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
      float map(vec3 p){
        p.x -= uShift; p.y -= uLift;
        float t = uTime * .33, s = 1. - uMerge;
        float d = length(p - s * vec3(sin(t * 1.1) * .9, cos(t * .9) * .55, sin(t * .7) * .5)) - mix(.8, 1.3, uMerge);
        d = smin(d, length(p - s * vec3(cos(t * .8 + 1.) * 1.35, sin(t * 1.2 + 2.) * .8, cos(t * .6) * .6)) - .56, .6);
        d = smin(d, length(p - s * vec3(sin(t * .6 + 3.) * 1.1, cos(t * .7 + 1.) * 1.05, sin(t * .9 + 2.) * .4)) - .48, .6);
        d = smin(d, length(p - s * vec3(cos(t * 1.3 + 4.) * .7, sin(t * .5 + 5.) * 1.25, cos(t * 1.1 + 1.) * .5)) - .4, .6);
        d = smin(d, length(p - s * vec3(sin(t * .9 + 5.) * 1.55, cos(t * 1.4 + 3.) * .4, sin(t * .5 + 4.) * .7)) - .33, .6);
        d = smin(d, length(p - vec3(uMouse.x - uShift, uMouse.y - uLift, .25)) - .3, .65);
        return d + sin(p.x * 5. + uTime) * sin(p.y * 5. - uTime * .8) * sin(p.z * 5.) * .012;
      }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 uv = (gl_FragCoord.xy * 2. - uRes) / uRes.y;
        vec3 ro = vec3(0., 0., 4.8), rd = normalize(vec3(uv, -1.9 * uZoom));
        float t = 1.6, minD = 9.; bool hit = false;
        for (int i = 0; i < 56; i++) {
          float d = map(ro + rd * t); minD = min(minD, d);
          if (d < .0025) { hit = true; break; }
          t += d * .92; if (t > 9.) break;
        }
        float gy = gl_FragCoord.y / uRes.y;
        vec3 bg = mix(uB2, uB1, smoothstep(0., 1., gy + uv.x * .12));
        bg = mix(bg, uC1, exp(-minD * 5.) * .28);
        vec3 col = bg;
        if (hit) {
          vec3 p = ro + rd * t; vec2 e = vec2(.004, 0.);
          vec3 n = normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
          float fres = pow(1. - max(dot(n, -rd), 0.), 2.6);
          vec3 base = mix(uC2, uC1, smoothstep(-.7, .8, n.y));
          base = mix(base, uC3, smoothstep(.1, 1., n.x * .6 + n.z * .5));
          vec3 r = reflect(rd, n);
          vec3 env = mix(uB2 * .82, vec3(1.), smoothstep(-.3, .9, r.y));
          float spec = pow(max(dot(r, normalize(vec3(.45, .8, .5))), 0.), 70.) + .45 * pow(max(dot(r, normalize(vec3(-.7, .35, .55))), 0.), 22.);
          col = mix(base, env, .22 + fres * .62) + spec * .85;
          col = mix(col, bg, smoothstep(.0, 1., fres) * .18);
        }
        col += (hash(gl_FragCoord.xy + uTime) - .5) / 160.;
        gl_FragColor = vec4(col, 1.);
      }`,
  })));

  const mouse = { x: 9, y: 9, sx: 0, sy: 0, seen: false };
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -((e.clientY / innerHeight) * 2 - 1); mouse.seen = true; }, { passive: true });
  addEventListener('resize', setSize);

  const cur = { shift: 0, merge: 0 }, tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const clock = new THREE.Clock(); let started = false, lastTone = '';
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (document.hidden) return;
    const k = (r) => (reduceMotion ? 1 : 1 - Math.exp(-dt * r));
    const { a, b, f } = sceneState();
    const pa = PAL[stateOf(a)] || PAL.hero, pb = PAL[stateOf(b)] || PAL.hero;
    ['uC1', 'uC2', 'uC3', 'uB1', 'uB2'].forEach((n, i) => { tmpA.set(pa[i]); tmpB.set(pb[i]); U[n].value.lerp(tmpA.lerp(tmpB, f), k(3.5)); });
    const A = poseOf(a), B = poseOf(b), aspect = innerWidth / innerHeight, portrait = aspect < 0.85;
    cur.shift = lerp(cur.shift, portrait ? 0 : lerp(A[0], B[0], f) * aspect * 1.25, k(3));
    cur.merge = lerp(cur.merge, lerp(A[1], B[1], f), k(3));
    U.uShift.value = cur.shift; U.uMerge.value = cur.merge;
    U.uZoom.value = portrait ? 0.8 : 1; U.uLift.value = portrait ? 1.35 : 0;
    U.uTime.value = reduceMotion ? 4 : clock.elapsedTime;
    renderer.getDrawingBufferSize(U.uRes.value);
    // курсор — ещё одна капля, которая сливается с остальными
    mouse.sx = lerp(mouse.sx, mouse.x, k(5)); mouse.sy = lerp(mouse.sy, mouse.y, k(5));
    const reach = 4.8 / (1.9 * U.uZoom.value);
    if (mouse.seen) U.uMouse.value.set(mouse.sx * aspect * reach, mouse.sy * reach); else U.uMouse.value.set(cur.shift, U.uLift.value);
    // на телефоне текст внизу — поднимаем сцену фоном страницы
    const tone = '#' + U.uB1.value.getHexString();
    if (tone !== lastTone) { document.documentElement.style.setProperty('--bg', tone); lastTone = tone; }
    renderer.render(scene, camera);
    if (!started) { started = true; document.body.classList.remove('is-loading'); }
  }
  frame();
}
