/* Quran data, page rendering, tajweed rules and recitation player. */
const RULES = [
  { key: 'ham_wasl', name: 'همزة الوصل', color: '#9a9a9a', desc: 'همزة تُنطق عند البدء بالكلمة، وتسقط في النطق عند وصلها بما قبلها.' },
  { key: 'laam_shamsiyah', name: 'اللام الشمسية', color: '#9a9a9a', desc: 'لام «ال» تُكتب ولا تُنطق، وتُدغم في الحرف الشمسي بعدها فيُنطق مشدّداً.' },
  { key: 'slnt', name: 'حرف لا يُنطق', color: '#9a9a9a', desc: 'حرف مكتوب في رسم المصحف ولا يُلفظ عند القراءة.' },
  { key: 'madda_normal', name: 'المد الطبيعي', color: '#b58400', desc: 'يُمدّ بمقدار حركتين، وهو حرف المد الذي لم يأتِ بعده همز ولا سكون.' },
  { key: 'madda_permissible', name: 'المد العارض للسكون ومد اللين', color: '#e0701c', desc: 'حرف مد أو لين بعده حرف سُكّن لأجل الوقف، ويجوز مدّه حركتين أو أربعاً أو ستاً.' },
  { key: 'madda_obligatory', name: 'المد المتصل والمنفصل', color: '#d42020', desc: 'المتصل: حرف مد بعده همز في الكلمة نفسها. المنفصل: حرف مد في آخر الكلمة وهمز في أول الكلمة التالية. ويُمدّان أربع أو خمس حركات.' },
  { key: 'madda_necessary', name: 'المد اللازم', color: '#8f0f0f', desc: 'حرف مد بعده سكون أصلي، ويُمدّ ست حركات لزوماً، مثل: «الضّالّين» و«الٓمٓ».' },
  { key: 'qalaqah', name: 'القلقلة', color: '#1f5fd1', desc: 'اضطراب في الصوت عند النطق بأحد حروف «قطب جد» ساكناً حتى يُسمع له نبرة قوية.' },
  { key: 'ghunnah', name: 'الغنة', color: '#178a3a', desc: 'صوت يخرج من الأنف في النون والميم المشدّدتين، ويُمدّ بمقدار حركتين.' },
  { key: 'ikhafa', name: 'الإخفاء الحقيقي', color: '#6b3db3', desc: 'نون ساكنة أو تنوين بعدها أحد حروف الإخفاء الخمسة عشر، فتُنطق النون بين الإظهار والإدغام مع غنة.' },
  { key: 'ikhafa_shafawi', name: 'الإخفاء الشفوي', color: '#a4389f', desc: 'ميم ساكنة بعدها باء، فتُخفى الميم مع غنة بمقدار حركتين.' },
  { key: 'idgham_ghunnah', name: 'الإدغام بغنة', color: '#0b857f', desc: 'نون ساكنة أو تنوين بعدها أحد حروف «ينمو»، فتُدغم النون فيما بعدها مع غنة.' },
  { key: 'idgham_wo_ghunnah', name: 'الإدغام بلا غنة', color: '#6f6f6f', desc: 'نون ساكنة أو تنوين بعدها لام أو راء، فتُدغم إدغاماً كاملاً بلا غنة.' },
  { key: 'idgham_shafawi', name: 'إدغام المثلين الصغير (الشفوي)', color: '#2f9a63', desc: 'ميم ساكنة بعدها ميم متحركة، فتُدغمان ميماً واحدة مشدّدة مع غنة.' },
  { key: 'iqlab', name: 'الإقلاب', color: '#0c7cbc', desc: 'نون ساكنة أو تنوين بعدها باء، فتُقلب النون ميماً مخفاة مع غنة.' },
  { key: 'idgham_mutajanisayn', name: 'إدغام المتجانسين', color: '#8a6a3a', desc: 'حرفان اتفقا في المخرج واختلفا في الصفة، والأول ساكن، مثل: «قد تّبيّن».' },
  { key: 'idgham_mutaqaribayn', name: 'إدغام المتقاربين', color: '#8a6a3a', desc: 'حرفان تقاربا في المخرج والصفة، والأول ساكن، مثل: «ألم نخلقكّم».' },
  { key: 'tafkhim', name: 'التفخيم', color: null, desc: '' },
  { key: 'tarqiq', name: 'الترقيق', color: null, desc: '' },
];
const RULE_PRIORITY = [6, 5, 4, 3, 7, 14, 11, 13, 12, 15, 16, 9, 10, 8, 0, 1, 2];
const TEACH_RULES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 1];

const RECITERS = [
  { id: 'MaherAlMuaiqly128kbps', name: 'ماهر المعيقلي' },
  { id: 'Husary_Muallim_128kbps', name: 'الحصري (المعلّم)' },
  { id: 'Husary_128kbps', name: 'محمود خليل الحصري' },
  { id: 'Minshawy_Murattal_128kbps', name: 'محمد صديق المنشاوي' },
  { id: 'Alafasy_128kbps', name: 'مشاري العفاسي' },
  { id: 'Abdul_Basit_Murattal_192kbps', name: 'عبد الباسط عبد الصمد' },
  { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'عبد الرحمن السديس' },
  { id: 'Saood_ash-Shuraym_128kbps', name: 'سعود الشريم' },
  { id: 'Yasser_Ad-Dussary_128kbps', name: 'ياسر الدوسري' },
  { id: 'Nasser_Alqatami_128kbps', name: 'ناصر القطامي' },
  { id: 'Abu_Bakr_Ash-Shaatree_128kbps', name: 'أبو بكر الشاطري' },
];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = n => String(n).replace(/\d/g, d => AR_DIGITS[d]);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Q = {
  meta: null,
  chunks: {},
  async init() {
    const r = await fetch('data/meta.json');
    this.meta = await r.json();
  },
  sura(n) { return this.meta.suras[n - 1]; },
  suraName(n) { return this.meta.suras[n - 1]?.name || ''; },
  ayahCount(n) { return this.meta.suras[n - 1]?.ayahs || 0; },
  pageOf(s, a) { return this.meta.ap[s - 1]?.[a - 1]; },
  chunkId(p) { return Math.floor((p - 1) / this.meta.chunk); },
  async loadPage(p) {
    const c = this.chunkId(p);
    if (!this.chunks[c]) {
      this.chunks[c] = fetch('data/p/' + String(c).padStart(2, '0') + '.json').then(r => {
        if (!r.ok) throw new Error('page data');
        return r.json();
      }).catch(e => { delete this.chunks[c]; throw e; });
    }
    const ch = await this.chunks[c];
    return { lines: ch.pages[p], chunk: ch };
  },
  async ayah(key) {
    const [s, a] = key.split(':').map(Number);
    const { chunk } = await this.loadPage(this.pageOf(s, a));
    const info = chunk.ayahs[key] || {};
    return { ...info, tad: info.d != null ? chunk.tad[info.d] : null };
  },
  // expand [[s,a1,a2],...] -> ordered ayah keys
  keysOf(segs) {
    const out = [];
    (segs || []).forEach(([s, a1, a2]) => { for (let a = a1; a <= a2; a++) out.push(s + ':' + a); });
    return out;
  },
  pagesOf(segs) {
    const set = new Set();
    this.keysOf(segs).forEach(k => { const [s, a] = k.split(':').map(Number); const p = this.pageOf(s, a); if (p) set.add(p); });
    return [...set].sort((x, y) => x - y);
  },
  segLabel(segs) {
    return (segs || []).map(([s, a1, a2]) => `${this.suraName(s)} ${toAr(a1)}${a2 !== a1 ? '–' + toAr(a2) : ''}`).join('، ');
  },
  // words of an ayah (after its page chunk is loaded)
  async ayahWords(key) {
    const [s, a] = key.split(':').map(Number);
    const { lines } = await this.loadPage(this.pageOf(s, a));
    const words = [];
    lines.forEach(line => line.forEach(t => { if (t[0] === 'w' && t[1] === s && t[2] === a) words.push({ t: t[3], j: t[4] || null }); }));
    return words;
  },
  ayahText(words) { return words.map(w => w.t).join(' '); },
};

function wordRules(j) {
  const set = new Set();
  (j || []).forEach(seg => seg[2].forEach(r => { if (RULES[r].color) set.add(r); }));
  return [...set];
}
function segColor(rules) {
  for (const r of RULE_PRIORITY) if (rules.includes(r) && RULES[r].color) return RULES[r].color;
  return null;
}
// tajweed-coloured inner HTML for a word; optional onlyRule to colour just one rule
function tajweedHTML(text, j, onlyRule) {
  if (!j) return esc(text);
  let html = '', pos = 0;
  j.forEach(([s, e, rules]) => {
    if (s > pos) html += esc(text.slice(pos, s));
    const col = onlyRule != null ? (rules.includes(onlyRule) ? RULES[onlyRule].color : null) : segColor(rules);
    const part = text.slice(s, e);
    html += col ? `<span style="color:${col}">${esc(part)}</span>` : esc(part);
    pos = e;
  });
  if (pos < text.length) html += esc(text.slice(pos));
  return html;
}

/* Render one mushaf page into `host`. opts: {portion:Set of keys|null, tajweed, gharibSet:Map key->Set(idx), onWord} */
async function renderMushafPage(host, pageNo, opts) {
  const { lines, chunk } = await Q.loadPage(pageNo);
  const pageEl = document.createElement('div');
  pageEl.className = 'mushaf';
  const firstAyah = lines.flat().find(t => t[0] === 'w');
  const juz = firstAyah ? '' : '';
  const suraHere = firstAyah ? Q.suraName(firstAyah[1]) : '';
  pageEl.innerHTML = `<div class="hdr"><span>${esc(suraHere ? 'سورة ' + suraHere : '')}</span><span>${juz}</span></div>`;
  const centered = pageNo <= 2;
  const counters = {};
  const tokens = [];
  lines.forEach(line => {
    const ln = document.createElement('div');
    ln.className = 'ln';
    if (line.length === 1 && line[0][0] === 'title') {
      ln.classList.add('title');
      ln.innerHTML = `<div class="sura-title">سورة ${esc(line[0][2])}</div>`;
      pageEl.appendChild(ln); return;
    }
    if (line.length === 1 && line[0][0] === 'basmala') {
      ln.classList.add('basmala');
      ln.innerHTML = `<span class="w bs">${esc(line[0][2])}</span>`;
      pageEl.appendChild(ln); return;
    }
    if (centered) ln.classList.add('center');
    line.forEach(t => {
      const [kind, s, a, text, j] = t;
      if (kind === 'title' || kind === 'basmala') return;
      const key = s + ':' + a;
      const el = document.createElement('span');
      el.dataset.k = key;
      if (kind === 'w') {
        const idx = counters[key] = (counters[key] ?? -1) + 1;
        el.className = 'w';
        el.dataset.i = idx;
        el.innerHTML = opts.tajweed ? tajweedHTML(text, j) : esc(text);
        const info = chunk.ayahs[key];
        if (info && info.g && info.g.some(g => g.w.includes(idx))) el.classList.add('gh');
      } else if (kind === 'end') {
        el.className = 'end'; el.textContent = text;
      } else { el.className = 'hz'; el.textContent = text; }
      if (opts.portion && !opts.portion.has(key)) el.classList.add('dimmed');
      el.dataset.t = tokens.length;
      tokens.push({ kind, s, a, key, text, j: j || null, el });
      ln.appendChild(el);
    });
    pageEl.appendChild(ln);
  });
  const pno = document.createElement('div');
  pno.className = 'pno';
  pno.textContent = toAr(pageNo);
  pageEl.appendChild(pno);
  host.replaceChildren(pageEl);
  return { el: pageEl, tokens, chunk };
}

function fitMushaf(pageEl, width) {
  pageEl.style.width = width + 'px';
  const inner = width * (1 - 0.084);
  pageEl.style.fontSize = (inner / 410 * 24 * 0.97) + 'px';
  pageEl.querySelectorAll('.ln').forEach(ln => {
    ln.style.fontSize = '';
    const over = ln.scrollWidth - ln.clientWidth;
    if (over > 1) ln.style.fontSize = (ln.clientWidth / ln.scrollWidth * 0.99) + 'em';
  });
}

/* Recitation player: per-ayah files from everyayah.com */
const Player = {
  audio: null,
  queue: [],
  idx: -1,
  repeat: 1,
  rep: 0,
  reciter: RECITERS[0].id,
  onAyah: null,
  onStop: null,
  url(s, a) { return `https://everyayah.com/data/${this.reciter}/${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3`; },
  build(keys) {
    const q = [];
    keys.forEach(k => {
      const [s, a] = k.split(':').map(Number);
      if (a === 1 && s !== 1 && s !== 9) q.push({ key: k, s: 1, a: 1, basmala: true });
      q.push({ key: k, s, a });
    });
    return q;
  },
  play(keys, startKey) {
    this.stop(true);
    this.queue = this.build(keys);
    this.idx = Math.max(0, startKey ? this.queue.findIndex(x => x.key === startKey && !x.basmala) : 0);
    if (startKey && this.idx > 0 && this.queue[this.idx - 1].basmala && this.queue[this.idx - 1].key === startKey) this.idx--;
    this.rep = 0;
    this._go();
  },
  _go() {
    const it = this.queue[this.idx];
    if (!it) { this.stop(); return; }
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('ended', () => this._next());
      this.audio.addEventListener('error', () => { if (!this.audio.getAttribute('src') || this.idx < 0) return; toast('تعذّر تشغيل التلاوة. تأكدي من الاتصال بالإنترنت.'); this.stop(); });
    }
    this.audio.src = this.url(it.s, it.a);
    this.audio.play().catch(() => {});
    this.onAyah && this.onAyah(it.key);
    const nx = this.queue[this.idx + 1];
    if (nx) { const pre = new Audio(); pre.preload = 'auto'; pre.src = this.url(nx.s, nx.a); }
  },
  _next() {
    const it = this.queue[this.idx];
    if (it && !it.basmala && ++this.rep < this.repeat) { this._go(); return; }
    this.rep = 0; this.idx++;
    this._go();
  },
  get playing() { return !!(this.audio && !this.audio.paused && this.idx >= 0); },
  pause() { this.audio && this.audio.pause(); },
  resume() { this.audio && this.audio.play().catch(() => {}); },
  stop(silent) {
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); }
    this.idx = -1; this.queue = [];
    if (!silent && this.onStop) this.onStop();
  },
};
