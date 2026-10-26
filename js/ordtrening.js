/* Ordtrening: ordkort, quiz med poeng, fyll inn, memory, ordsøk, kryssord og gjett ordet (26.10.2026).
   Ordene ligger i <script type="application/json" id="ordtrening"> på sida: [{o, f, s, dk, t}] */
(function () {
  'use strict';
  const SPRAK = { ar: 'Arabisk', ti: 'Tigrinja', ckb: 'Sorani', prs: 'Dari', ps: 'Pashto' };
  const RTL = { ar: 1, ckb: 1, prs: 1, ps: 1 };
  const LAGER = 'fov_ordtrening_v1';
  let lager = {}; try { lager = JSON.parse(localStorage.getItem(LAGER) || '{}') || {}; } catch (e) {}
  const lagre = () => { try { localStorage.setItem(LAGER, JSON.stringify(lager)); } catch (e) {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const stokk = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const kjerne = o => o.replace(/^(en|et|ei|å)\s+/i, '').trim();
  const enkelt = o => { const k = kjerne(o).toLowerCase(); return /^[a-zæøåé]{3,13}$/.test(k) ? k.replace('é', 'e') : null; };
  const kort = f => f.length > 90 ? f.slice(0, f.lastIndexOf(' ', 88)) + ' …' : f;


  // ---------------------------------------------------------------- lyd
  let stemme = null;
  function finnStemme() { const v = (window.speechSynthesis && speechSynthesis.getVoices()) || []; stemme = v.find(x => /^(nb|no|nn)(-|_|$)/i.test(x.lang)) || null; }
  if (window.speechSynthesis) { finnStemme(); speechSynthesis.onvoiceschanged = finnStemme; }
  function si(t) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'nb-NO'; if (stemme) u.voice = stemme; u.rate = .85; speechSynthesis.speak(u);
  }
  const lydKnapp = t => window.speechSynthesis ? `<button class="ot-lyd" data-si="${esc(t)}" title="Hør ordet" aria-label="Hør ordet">🔊</button>` : '';
  let aktivRot = null;

  // ---------------------------------------------------------------- én ordtrening (hel side, oppsummering eller ett delkapittel)
  function monter(rot, ALLE, valg = {}) {
  const KAP = valg.kap, FAG = valg.fag, kompakt = !!valg.kompakt;
  const $ = id => rot.querySelector('#' + id);
  let dkValg = valg.dk || 'alle', modus = valg.modus || 'kort', sprak = lager.sprak || '';
  const harSprak = ALLE.some(x => x.t);
  const dkListe = [...new Set(ALLE.map(x => x.dk))];
  const ord = () => dkValg === 'alle' ? ALLE : ALLE.filter(x => x.dk === dkValg);
  rot.classList.add('ot-rot');
  rot.addEventListener('click', e => { const b = e.target.closest('[data-si]'); if (b) { e.stopPropagation(); si(b.dataset.si); } });
  rot.addEventListener('pointerdown', () => { aktivRot = rot; });
  rot.addEventListener('focusin', () => { aktivRot = rot; });

  // ---------------------------------------------------------------- ramme
  const MODUS = [['kort', '🃏', 'Ordkort'], ['quiz', '⏱', 'Quiz'], ['fyll', '✎', 'Fyll inn'], ['memory', '◫', 'Memory'],
    ['ordsok', '🔍', 'Ordsøk'], ['kryss', '✚', 'Kryssord'], ['gjett', '?', 'Gjett ordet']];
  rot.innerHTML = `
    <div class="ot-valg">
      ${kompakt ? `<p class="ot-overskrift">${valg.tittel || 'Ordtrening'} <span>· ${ALLE.length} fagord</span></p>` : ''}
      <div class="ot-moduser" role="tablist">${MODUS.map(([m, i, t]) => `<button role="tab" data-m="${m}"><span class="i">${i}</span>${t}</button>`).join('')}</div>
      <div class="ot-filter">
        ${valg.dk ? '' : `<label>Delkapittel <select id="otDk"><option value="alle">Hele kapittel ${esc(KAP)} (${ALLE.length} ord)</option>${dkListe.map(d => `<option value="${esc(d)}">${esc(d)} (${ALLE.filter(x => x.dk === d).length} ord)</option>`).join('')}</select></label>`}
        ${harSprak ? `<label>Mitt språk <select id="otSprak"><option value="">Bare norsk</option>${Object.entries(SPRAK).map(([k, v]) => `<option value="${k}" ${k === sprak ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
      </div>
    </div>
    <div class="ot-flate" id="otFlate" ${kompakt ? 'hidden' : ''}></div>`;
  const flate = $('otFlate');
  rot.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    if (kompakt && !flate.hidden && modus === b.dataset.m) { stoppTimer(); flate.hidden = true; b.classList.remove('paa'); return; }   // trykk igjen: lukk
    modus = b.dataset.m; flate.hidden = false; start();
    if (valg.hash) try { history.replaceState(null, '', '#' + modus); } catch (e) {}
  });
  if ($('otDk')) $('otDk').onchange = e => { dkValg = e.target.value; if (!flate.hidden) start(); };
  const sp = $('otSprak'); if (sp) sp.onchange = e => { sprak = e.target.value; lager.sprak = sprak; lagre(); if (!flate.hidden) start(); };
  let stoppTimer = () => {};
  function start() {
    stoppTimer(); stoppTimer = () => {};
    rot.querySelectorAll('[data-m]').forEach(b => { b.classList.toggle('paa', b.dataset.m === modus); b.setAttribute('aria-selected', b.dataset.m === modus); });
    const o = ord();
    if (o.length < 2) { flate.innerHTML = '<p class="ot-tom">For få ord her. Velg hele kapitlet.</p>'; return; }
    ({ kort: ordkort, quiz, fyll, memory, ordsok, kryss, gjett })[modus](o);
  }
  const oversett = x => sprak && x.t && x.t[sprak] ? `<p class="ot-overs" dir="${RTL[sprak] ? 'rtl' : 'ltr'}" lang="${sprak}">${esc(x.t[sprak])}</p>` : '';
  const ferdigBoks = (tittel, tekst, igjen) => {
    flate.innerHTML = `<div class="ot-ferdig"><div class="stor">🎉</div><h3>${tittel}</h3>${tekst}<button class="ot-k hoved" id="otIgjen">Prøv igjen</button></div>`;
    $('otIgjen').onclick = igjen;
  };

  // ---------------------------------------------------------------- 1 ordkort
  function ordkort(o) {
    let bunke = stokk(o), i = 0, snudd = false, kan = 0;
    const tegn = () => {
      if (i >= bunke.length) { ferdigBoks('Du har gått gjennom alle kortene!', `<p>Du kunne ${kan} av ${o.length} ord med en gang.</p>`, () => ordkort(o)); return; }
      const x = bunke[i];
      flate.innerHTML = `
        <p class="ot-teller">Kort ${i + 1} av ${bunke.length} · trykk på kortet for å snu det</p>
        <div class="ot-kort ${snudd ? 'snudd' : ''}" tabindex="0" role="button" aria-label="Snu kortet">
          <div class="side forside"><div class="ord">${esc(x.o)}</div>${lydKnapp(x.o)}${oversett(x)}</div>
          <div class="side bakside"><div class="ord liten">${esc(x.o)}</div><p class="forkl">${esc(x.f)}</p>${x.s ? `<p class="setn">«${esc(x.s)}»</p>` : ''}${lydKnapp(x.f)}</div>
        </div>
        <div class="ot-rad">
          <button class="ot-k" id="kForr" ${i ? '' : 'disabled'}>◀ Forrige</button>
          <button class="ot-k ov" id="kOv">Øv mer på dette</button>
          <button class="ot-k hoved" id="kKan">Jeg kan det ✓</button>
        </div>`;
      const k = flate.querySelector('.ot-kort');
      const snu = () => { snudd = !snudd; k.classList.toggle('snudd', snudd); };
      k.onclick = snu; k.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); snu(); } };
      $('kForr').onclick = () => { i = Math.max(0, i - 1); snudd = false; tegn(); };
      $('kKan').onclick = () => { kan++; i++; snudd = false; tegn(); };
      $('kOv').onclick = () => { bunke.push(x); i++; snudd = false; tegn(); };
    };
    tegn();
  }

  // ---------------------------------------------------------------- 2 quiz med poeng
  function quiz(o) {
    const n = Math.min(10, o.length), spm = stokk(o).slice(0, n).map((x, i) => {
      const andre = stokk(ALLE.filter(y => y.o !== x.o)).slice(0, 3);
      const typ = i % 2 ? 'ord' : 'forkl';
      return { x, typ, valg: stokk([x, ...andre]) };
    });
    let i = 0, poeng = 0, riktige = 0, rekke = 0, bom = [];
    const TID = 25;
    const vis = () => {
      if (i >= spm.length) {
        const best = (lager.best || {})[`${FAG}|${KAP}|${dkValg}`] || 0, ny = poeng > best;
        if (ny) { lager.best = lager.best || {}; lager.best[`${FAG}|${KAP}|${dkValg}`] = poeng; lagre(); }
        ferdigBoks(`${poeng} poeng`, `<p>${riktige} av ${spm.length} riktige. ${ny ? '<strong>Ny rekord!</strong>' : `Rekorden din er ${best} poeng.`}</p>` +
          (bom.length ? `<div class="ot-bom"><p>Øv mer på disse:</p><ul>${bom.map(x => `<li><strong>${esc(x.o)}</strong> – ${esc(x.f)}</li>`).join('')}</ul></div>` : ''), () => quiz(o));
        return;
      }
      const q = spm[i];
      const tekst = q.typ === 'forkl' ? `Hva betyr <strong>${esc(q.x.o)}</strong>? ${lydKnapp(q.x.o)}` : `Hvilket ord passer?<br><span class="ot-def">${esc(q.x.f)}</span>`;
      flate.innerHTML = `
        <div class="ot-quizlinje"><span>Spørsmål ${i + 1} av ${spm.length}</span><span class="poeng">${poeng} poeng${rekke > 1 ? ` · 🔥 ${rekke} på rad` : ''}</span></div>
        <div class="ot-tid"><div id="qTid"></div></div>
        <p class="ot-spm">${tekst}</p>
        <div class="ot-alt">${q.valg.map((v, j) => `<button class="ot-svar" data-j="${j}">${esc(q.typ === 'forkl' ? kort(v.f) : v.o)}</button>`).join('')}</div>
        <p class="ot-tilbake" id="qMelding" aria-live="polite"></p>`;
      const t0 = Date.now(), bar = $('qTid');
      let ferdig = false;
      const tick = setInterval(() => { const g = (Date.now() - t0) / 1000; bar.style.width = Math.max(0, 100 - g / TID * 100) + '%'; if (g >= TID) svar(-1); }, 100);
      stoppTimer = () => clearInterval(tick);
      function svar(j) {
        if (ferdig) return; ferdig = true; clearInterval(tick);
        const rett = j >= 0 && q.valg[j] === q.x, g = (Date.now() - t0) / 1000;
        flate.querySelectorAll('.ot-svar').forEach((b, k) => { b.disabled = true; if (q.valg[k] === q.x) b.classList.add('rett'); else if (k === j) b.classList.add('galt'); });
        if (rett) { riktige++; rekke++; const p = 100 + Math.round(Math.max(0, TID - g) / TID * 100) + (rekke > 2 ? 25 : 0); poeng += p; $('qMelding').innerHTML = `Riktig! +${p} poeng`; }
        else { rekke = 0; bom.push(q.x); $('qMelding').innerHTML = j < 0 ? 'Tiden er ute.' : `Ikke helt. <strong>${esc(q.x.o)}</strong>: ${esc(q.x.f)}`; }
        const neste = document.createElement('button'); neste.className = 'ot-k hoved'; neste.textContent = i + 1 < spm.length ? 'Neste →' : 'Se resultatet';
        neste.onclick = () => { i++; vis(); }; flate.appendChild(neste); neste.focus();
      }
      flate.querySelectorAll('.ot-svar').forEach(b => b.onclick = () => svar(Number(b.dataset.j)));
    };
    vis();
  }

  // ---------------------------------------------------------------- 3 fyll inn ordet i setningen
  function finnIStting(x) {
    if (!x.s) return null;
    const k = kjerne(x.o).toLowerCase(); if (k.includes('/') || k.split(' ').length > 3) return null;
    const s = x.s;
    const forsok = [k, k.length > 5 ? k.slice(0, -1) : null, k.length > 6 ? k.slice(0, -2) : null].filter(Boolean);
    for (const f of forsok) {
      const re = new RegExp('(^|[^a-zæøå])(' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-zæøå]*)', 'i');
      const m = s.match(re); if (m) { const start = m.index + m[1].length; return { foer: s.slice(0, start), hull: m[2], etter: s.slice(start + m[2].length) }; }
    }
    return null;
  }
  function fyll(o) {
    const oppg = stokk(o).map(x => ({ x, h: finnIStting(x) })).filter(y => y.h).slice(0, 10);
    if (oppg.length < 2) { flate.innerHTML = '<p class="ot-tom">Det finnes for få setninger å øve på her. Velg hele kapitlet.</p>'; return; }
    let i = 0, riktige = 0;
    const vis = () => {
      if (i >= oppg.length) { ferdigBoks(`${riktige} av ${oppg.length} riktige`, '', () => fyll(o)); return; }
      const { x, h } = oppg[i];
      const valg = stokk([x, ...stokk(ALLE.filter(y => y.o !== x.o)).slice(0, 3)]);
      flate.innerHTML = `<p class="ot-teller">Setning ${i + 1} av ${oppg.length} · hvilket ord mangler?</p>
        <p class="ot-setning">${esc(h.foer)}<span class="hull">${'_'.repeat(Math.max(4, h.hull.length))}</span>${esc(h.etter)}</p>
        <div class="ot-alt">${valg.map((v, j) => `<button class="ot-svar" data-j="${j}">${esc(v.o)}</button>`).join('')}</div>
        <p class="ot-tilbake" aria-live="polite"></p>`;
      flate.querySelectorAll('.ot-svar').forEach(b => b.onclick = () => {
        const v = valg[Number(b.dataset.j)], rett = v === x;
        flate.querySelectorAll('.ot-svar').forEach((c, k) => { c.disabled = true; if (valg[k] === x) c.classList.add('rett'); else if (c === b) c.classList.add('galt'); });
        flate.querySelector('.hull').textContent = h.hull; flate.querySelector('.hull').classList.add(rett ? 'rett' : 'galt');
        if (rett) riktige++;
        flate.querySelector('.ot-tilbake').innerHTML = rett ? 'Riktig!' : `Riktig ord: <strong>${esc(x.o)}</strong> – ${esc(x.f)}`;
        const n = document.createElement('button'); n.className = 'ot-k hoved'; n.textContent = 'Neste →'; n.onclick = () => { i++; vis(); }; flate.appendChild(n); n.focus();
      });
    };
    vis();
  }

  // ---------------------------------------------------------------- 4 memory
  function memory(o) {
    const par = stokk(o).slice(0, Math.min(6, o.length));
    const kort = stokk(par.flatMap((x, i) => [{ id: i, t: x.o, type: 'ord' }, { id: i, t: x.f.length > 70 ? x.f.slice(0, x.f.lastIndexOf(' ', 68)) + ' …' : x.f, type: 'forkl' }]));
    let apne = [], funnet = 0, trekk = 0, laast = false; const t0 = Date.now();
    flate.innerHTML = `<p class="ot-teller">Finn ordet og forklaringen som hører sammen. <span id="mInfo"></span></p>
      <div class="ot-memory">${kort.map((k, i) => `<button class="mk" data-i="${i}" aria-label="Kort ${i + 1}"><span class="bak">?</span><span class="fram ${k.type}">${esc(k.t)}</span></button>`).join('')}</div>`;
    const info = $('mInfo');
    const oppdater = () => { info.textContent = `Forsøk: ${trekk} · Par: ${funnet} av ${par.length}`; }; oppdater();
    flate.querySelectorAll('.mk').forEach(b => b.onclick = () => {
      if (laast || b.classList.contains('apen') || b.classList.contains('funnet')) return;
      b.classList.add('apen'); apne.push(b);
      if (apne.length < 2) return;
      trekk++; const [a, c] = apne, ka = kort[a.dataset.i], kc = kort[c.dataset.i];
      if (ka.id === kc.id && ka.type !== kc.type) {
        a.classList.add('funnet'); c.classList.add('funnet'); apne = []; funnet++; oppdater();
        if (funnet === par.length) setTimeout(() => ferdigBoks('Alle par er funnet!', `<p>${trekk} forsøk på ${Math.round((Date.now() - t0) / 1000)} sekunder.</p>`, () => memory(o)), 600);
      } else { laast = true; oppdater(); setTimeout(() => { a.classList.remove('apen'); c.classList.remove('apen'); apne = []; laast = false; }, 1100); }
    });
  }

  // ---------------------------------------------------------------- 5 ordsøk
  const BOKST = 'ABCDEFGHIJKLMNOPRSTUVYÆØÅ';
  function ordsok(o) {
    let vanskelig = !!lager.ordsokVanskelig;
    const kand = stokk(o.map(x => ({ x, w: enkelt(x.o) })).filter(y => y.w));
    if (kand.length < 3) { flate.innerHTML = '<p class="ot-tom">For få enkeltord her til ordsøk. Velg hele kapitlet.</p>'; return; }
    const valgte = kand.slice(0, 8), N = Math.max(10, Math.min(14, Math.max(...valgte.map(y => y.w.length)) + 2));
    const ret = vanskelig ? [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0]] : [[0, 1], [1, 0], [1, 1]];
    let G, plass;
    for (let forsok = 0; forsok < 60; forsok++) {
      G = Array.from({ length: N }, () => Array(N).fill('')); plass = [];
      let ok = true;
      for (const y of [...valgte].sort((a, b) => b.w.length - a.w.length)) {
        const W = y.w.toUpperCase(); let satt = false;
        for (let t = 0; t < 300 && !satt; t++) {
          const [dr, dc] = ret[Math.floor(Math.random() * ret.length)], r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
          const re = r + dr * (W.length - 1), ce = c + dc * (W.length - 1);
          if (re < 0 || re >= N || ce < 0 || ce >= N) continue;
          let kan = true; for (let k = 0; k < W.length; k++) { const g = G[r + dr * k][c + dc * k]; if (g && g !== W[k]) { kan = false; break; } }
          if (!kan) continue;
          for (let k = 0; k < W.length; k++) G[r + dr * k][c + dc * k] = W[k];
          plass.push({ y, r, c, dr, dc, L: W.length, funnet: false }); satt = true;
        }
        if (!satt) { ok = false; break; }
      }
      if (ok) break;
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!G[r][c]) G[r][c] = BOKST[Math.floor(Math.random() * BOKST.length)];
    flate.innerHTML = `<p class="ot-teller">Finn ordene. Trykk på første og siste bokstav i ordet (eller dra over det).
      <label class="ot-bryter"><input type="checkbox" id="osVansk" ${vanskelig ? 'checked' : ''}> Vanskelig (baklengs og bare forklaringer)</label></p>
      <div class="ot-ordsok"><div class="ot-gitter" style="--n:${N}">${G.map((rad, r) => rad.map((b, c) => `<span data-r="${r}" data-c="${c}">${b}</span>`).join('')).join('')}</div>
      <ul class="ot-ordliste">${plass.map((p, i) => `<li data-i="${i}">${vanskelig ? esc(kort(p.y.x.f)) : esc(p.y.w.toUpperCase())}</li>`).join('')}</ul></div>`;
    $('osVansk').onchange = e => { lager.ordsokVanskelig = e.target.checked; lagre(); ordsok(o); };
    const gitter = flate.querySelector('.ot-gitter'), celle = (r, c) => gitter.children[r * N + c];
    let start = null, funnet = 0;
    const linje = (a, b) => {
      const dr = Math.sign(b.r - a.r), dc = Math.sign(b.c - a.c), L = Math.max(Math.abs(b.r - a.r), Math.abs(b.c - a.c)) + 1;
      if (!(a.r === b.r || a.c === b.c || Math.abs(b.r - a.r) === Math.abs(b.c - a.c))) return null;
      return Array.from({ length: L }, (_, k) => ({ r: a.r + dr * k, c: a.c + dc * k }));
    };
    const fjernMerk = () => gitter.querySelectorAll('.merk').forEach(e => e.classList.remove('merk'));
    function prov(a, b) {
      const l = linje(a, b); fjernMerk(); if (!l) return false;
      const t = l.map(p => G[p.r][p.c]).join('');
      const p = plass.find(p => !p.funnet && p.L === l.length && (t === p.y.w.toUpperCase() || [...t].reverse().join('') === p.y.w.toUpperCase()) &&
        ((p.r === a.r && p.c === a.c) || (p.r === b.r && p.c === b.c)));
      if (!p) return false;
      p.funnet = true; funnet++;
      l.forEach(q => celle(q.r, q.c).classList.add('funnet'));
      const li = flate.querySelector(`.ot-ordliste li[data-i="${plass.indexOf(p)}"]`); li.classList.add('funnet'); if (vanskelig) li.textContent = p.y.w.toUpperCase() + ' – ' + kort(p.y.x.f);
      si(p.y.w);
      if (funnet === plass.length) setTimeout(() => ferdigBoks('Du fant alle ordene!', '', () => ordsok(o)), 700);
      return true;
    }
    const pos = e => { const t = document.elementFromPoint(e.clientX, e.clientY); const s = t && t.closest('.ot-gitter span'); return s ? { r: Number(s.dataset.r), c: Number(s.dataset.c) } : null; };
    let drar = false, drastart = null;
    gitter.addEventListener('pointerdown', e => { const p = pos(e); if (!p) return; e.preventDefault(); drar = true; drastart = p; gitter.setPointerCapture(e.pointerId); });
    gitter.addEventListener('pointermove', e => { if (!drar) return; const p = pos(e); if (!p) return; fjernMerk(); const l = linje(drastart, p); if (l) l.forEach(q => celle(q.r, q.c).classList.add('merk')); });
    gitter.addEventListener('pointerup', e => {
      if (!drar) return; drar = false; const p = pos(e) || drastart;
      if (p.r !== drastart.r || p.c !== drastart.c) { prov(drastart, p); start = null; return; }
      // trykk: første og siste bokstav
      if (!start) { start = p; fjernMerk(); celle(p.r, p.c).classList.add('merk'); }
      else { if (!prov(start, p)) { celle(start.r, start.c).classList.remove('merk'); } start = null; }
    });
  }

  // ---------------------------------------------------------------- 6 kryssord
  function lagKryssord(liste) {
    const ordene = [...liste].sort((a, b) => b.w.length - a.w.length);
    let best = null;
    for (let f = 0; f < 25; f++) {
      const rekke = f ? [ordene[0], ...stokk(ordene.slice(1))] : ordene;
      const G = new Map(), plass = [];
      const k = (r, c) => r + ',' + c;
      const kan = (W, r, c, dir) => {
        const dr = dir === 'ned' ? 1 : 0, dc = dir === 'ned' ? 0 : 1; let kryss = 0;
        if (G.has(k(r - dr, c - dc)) || G.has(k(r + dr * W.length, c + dc * W.length))) return -1;
        for (let i = 0; i < W.length; i++) {
          const rr = r + dr * i, cc = c + dc * i, g = G.get(k(rr, cc));
          if (g) { if (g.b !== W[i] || g[dir]) return -1; kryss++; }
          else if (G.has(k(rr + dc, cc + dr)) || G.has(k(rr - dc, cc - dr))) return -1;
        }
        return kryss;
      };
      const sett = (y, r, c, dir) => { const W = y.w.toUpperCase(), dr = dir === 'ned' ? 1 : 0, dc = dir === 'ned' ? 0 : 1;
        for (let i = 0; i < W.length; i++) { const kk = k(r + dr * i, c + dc * i), g = G.get(kk) || { b: W[i] }; g[dir] = true; G.set(kk, g); }
        plass.push({ y, r, c, dir, W }); };
      sett(rekke[0], 0, 0, 'tvers');
      for (const y of rekke.slice(1)) {
        const W = y.w.toUpperCase(); let bestPl = null;
        for (const [kk, g] of G) {
          const [r0, c0] = kk.split(',').map(Number);
          for (let i = 0; i < W.length; i++) if (W[i] === g.b) for (const dir of ['ned', 'tvers']) {
            if (g[dir]) continue;
            const r = dir === 'ned' ? r0 - i : r0, c = dir === 'ned' ? c0 : c0 - i, s = kan(W, r, c, dir);
            if (s > 0 && (!bestPl || s > bestPl.s)) bestPl = { r, c, dir, s };
          }
        }
        if (bestPl) sett(y, bestPl.r, bestPl.c, bestPl.dir);
      }
      const rs = [...G.keys()].map(x => x.split(',').map(Number)), r0 = Math.min(...rs.map(x => x[0])), c0 = Math.min(...rs.map(x => x[1]));
      const H = Math.max(...rs.map(x => x[0])) - r0 + 1, B = Math.max(...rs.map(x => x[1])) - c0 + 1;
      const poeng = plass.length * 100 - H * B / 4;
      if (!best || poeng > best.poeng) best = { poeng, plass: plass.map(p => ({ ...p, r: p.r - r0, c: p.c - c0 })), H, B };
    }
    return best;
  }
  function kryss(o) {
    const kand = stokk(o.map(x => ({ x, w: enkelt(x.o) })).filter(y => y.w)).slice(0, 10);
    if (kand.length < 3) { flate.innerHTML = '<p class="ot-tom">For få enkeltord her til kryssord. Velg hele kapitlet.</p>'; return; }
    const K = lagKryssord(kand);
    const nr = {}; let n = 0;
    [...K.plass].sort((a, b) => a.r - b.r || a.c - b.c).forEach(p => { const kk = p.r + ',' + p.c; if (!nr[kk]) nr[kk] = ++n; p.nr = nr[kk]; });
    const fasit = {}; K.plass.forEach(p => { for (let i = 0; i < p.W.length; i++) fasit[(p.r + (p.dir === 'ned' ? i : 0)) + ',' + (p.c + (p.dir === 'ned' ? 0 : i))] = p.W[i]; });
    let html = '';
    for (let r = 0; r < K.H; r++) for (let c = 0; c < K.B; c++) {
      const kk = r + ',' + c;
      html += fasit[kk] ? `<span class="ot-rute">${nr[kk] ? `<i>${nr[kk]}</i>` : ''}<input maxlength="1" data-k="${kk}" aria-label="Rute" autocomplete="off" autocapitalize="characters"></span>` : '<span class="ot-blank"></span>';
    }
    const ledetekst = dir => K.plass.filter(p => p.dir === dir).sort((a, b) => a.nr - b.nr).map(p => `<li data-p="${K.plass.indexOf(p)}"><b>${p.nr}</b> ${esc(kort(p.y.x.f))} <span class="lengde">(${p.W.length})</span></li>`).join('');
    flate.innerHTML = `<p class="ot-teller">Skriv ordene i rutene. Trykk på en forklaring for å hoppe til ordet.</p>
      <div class="ot-kryss"><div class="ot-kgitter" style="--b:${K.B}">${html}</div>
      <div class="ot-ledetekst"><h4>Vannrett →</h4><ol>${ledetekst('tvers')}</ol><h4>Loddrett ↓</h4><ol>${ledetekst('ned')}</ol></div></div>
      <div class="ot-rad"><button class="ot-k hoved" id="kSjekk">Sjekk</button><button class="ot-k" id="kHint">Vis én bokstav</button><button class="ot-k" id="kFasit">Vis svaret</button></div>
      <p class="ot-tilbake" aria-live="polite"></p>`;
    const inn = [...flate.querySelectorAll('.ot-kgitter input')], fra = kk => inn.find(i => i.dataset.k === kk);
    let retning = 'tvers';
    inn.forEach(i => {
      i.addEventListener('input', () => {
        i.value = i.value.toUpperCase().slice(-1); i.classList.remove('rett', 'galt');
        const [r, c] = i.dataset.k.split(',').map(Number), neste = fra(retning === 'tvers' ? `${r},${c + 1}` : `${r + 1},${c}`) || fra(retning === 'tvers' ? `${r + 1},${c}` : `${r},${c + 1}`);
        if (i.value && neste) neste.focus();
      });
      i.addEventListener('keydown', e => {
        const [r, c] = i.dataset.k.split(',').map(Number);
        const m = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
        if (m) { e.preventDefault(); retning = m[0] ? 'ned' : 'tvers'; const x = fra(`${r + m[0]},${c + m[1]}`); if (x) x.focus(); }
        if (e.key === 'Backspace' && !i.value) { const x = fra(retning === 'tvers' ? `${r},${c - 1}` : `${r - 1},${c}`); if (x) { x.focus(); x.value = ''; } }
      });
      i.addEventListener('focus', () => { i.select(); });
    });
    flate.querySelectorAll('.ot-ledetekst li').forEach(li => li.onclick = () => { const p = K.plass[li.dataset.p]; retning = p.dir; const x = fra(p.r + ',' + p.c); if (x) x.focus(); });
    const melding = flate.querySelector('.ot-tilbake');
    $('kSjekk').onclick = () => {
      let rett = 0, tom = 0;
      inn.forEach(i => { i.classList.remove('rett', 'galt'); if (!i.value) { tom++; return; } if (i.value === fasit[i.dataset.k]) { rett++; i.classList.add('rett'); } else i.classList.add('galt'); });
      if (rett === inn.length) { melding.textContent = 'Alt er riktig! 🎉'; } else melding.textContent = `${rett} av ${inn.length} bokstaver er riktige${tom ? `, ${tom} er tomme` : ''}.`;
    };
    $('kHint').onclick = () => { const t = inn.filter(i => i.value !== fasit[i.dataset.k]); if (!t.length) return; const i = t[Math.floor(Math.random() * t.length)]; i.value = fasit[i.dataset.k]; i.classList.add('rett'); };
    $('kFasit').onclick = () => { inn.forEach(i => { i.value = fasit[i.dataset.k]; i.classList.remove('galt'); }); melding.textContent = 'Her er svaret. Trykk «Kryssord» for et nytt.'; };
  }

  // ---------------------------------------------------------------- 7 gjett ordet
  function gjett(o) {
    const kand = stokk(o.filter(x => /^[a-zæøåé \-]+$/i.test(kjerne(x.o)) && kjerne(x.o).length <= 22));
    if (!kand.length) { flate.innerHTML = '<p class="ot-tom">Ingen ord å gjette her.</p>'; return; }
    let i = 0, vunnet = 0;
    const runde = () => {
      stoppTimer();
      if (i >= Math.min(5, kand.length)) { ferdigBoks(`Du gjettet ${vunnet} av ${Math.min(5, kand.length)} ord`, '', () => gjett(o)); return; }
      const x = kand[i], W = kjerne(x.o).toUpperCase().replace('É', 'E'); let liv = 7; const gjettet = new Set();
      const tegn = () => {
        const vist = [...W].map(b => /[A-ZÆØÅ]/.test(b) ? (gjettet.has(b) ? b : '_') : b);
        const loest = !vist.includes('_');
        flate.innerHTML = `<p class="ot-teller">Ord ${i + 1} av ${Math.min(5, kand.length)} · Gjett ordet bokstav for bokstav.</p>
          <p class="ot-def stor">${esc(x.f)}</p>
          <p class="ot-gjett">${vist.map(b => b === ' ' ? '<span class="mellom"></span>' : `<span>${b === '_' ? '' : b}</span>`).join('')}</p>
          <p class="ot-liv">${'❤️'.repeat(liv)}${'🤍'.repeat(7 - liv)}</p>
          <div class="ot-tastatur">${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ'].map(b => `<button data-b="${b}" ${gjettet.has(b) || loest || !liv ? 'disabled' : ''} class="${gjettet.has(b) ? (W.includes(b) ? 'rett' : 'galt') : ''}">${b}</button>`).join('')}</div>
          <p class="ot-tilbake" aria-live="polite">${loest ? `Riktig! <strong>${esc(x.o)}</strong>` : !liv ? `Ordet var <strong>${esc(x.o)}</strong>.` : ''}</p>`;
        if (loest || !liv) {
          if (loest) { vunnet++; si(x.o); }
          const n = document.createElement('button'); n.className = 'ot-k hoved'; n.textContent = 'Neste ord →'; n.onclick = () => { i++; runde(); }; flate.appendChild(n); n.focus();
          return;
        }
        flate.querySelectorAll('[data-b]').forEach(b => b.onclick = () => gjettBokstav(b.dataset.b));
      };
      const gjettBokstav = b => { if (gjettet.has(b) || !liv) return; gjettet.add(b); if (!W.includes(b)) liv--; tegn(); };
      const tast = e => { if (modus !== 'gjett' || flate.hidden || (aktivRot && aktivRot !== rot)) return; const b = e.key.toUpperCase(); if (/^[A-ZÆØÅ]$/.test(b) && !e.ctrlKey && !e.metaKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) gjettBokstav(b); };
      document.addEventListener('keydown', tast); stoppTimer = () => document.removeEventListener('keydown', tast);
      tegn();
    };
    runde();
  }

  if (!kompakt) start();
  }

  window.ORDTRENING = { monter };
  const hel = document.getElementById('ot');
  if (hel) {
    const fraHash = location.hash.slice(1);
    monter(hel, JSON.parse(document.getElementById('ordtrening').textContent),
      { kap: hel.dataset.kap, fag: hel.dataset.fag, hash: true, modus: ['kort', 'quiz', 'fyll', 'memory', 'ordsok', 'kryss', 'gjett'].includes(fraHash) ? fraHash : 'kort' });
  }
})();
