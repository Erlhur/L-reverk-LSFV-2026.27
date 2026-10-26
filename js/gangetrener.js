/* Gangetrener (26.10.2026): velg gangetabeller, øv i eget tempo, mot klokka eller til du kan alle.
   Hvert regnestykke huskes i nettleseren, og oversikten viser hvilke du kan. */
(function () {
  'use strict';
  const rot = document.getElementById('gt');
  if (!rot) return;
  const LAGER = 'fov_gangetrener_v1';
  let L = {}; try { L = JSON.parse(localStorage.getItem(LAGER) || '{}') || {}; } catch (e) {}
  L.tabeller = L.tabeller || [2, 3, 4, 5]; L.stat = L.stat || {}; L.rekord = L.rekord || {};
  const lagre = () => { try { localStorage.setItem(LAGER, JSON.stringify(L)); } catch (e) {} };
  const MAKS = 12;
  let modus = 'ov', deling = !!L.deling, stoppTid = () => {};

  rot.innerHTML = `
    <div class="gt-valg">
      <p class="gt-etikett">Hvilke gangetabeller vil du øve på?</p>
      <div class="gt-tabeller">${Array.from({ length: MAKS }, (_, i) => `<button data-t="${i + 1}">${i + 1}</button>`).join('')}
        <button class="gt-alle" data-alle="1">1–10</button><button class="gt-alle" data-ingen="1">Ingen</button></div>
      <label class="gt-bryter"><input type="checkbox" id="gtDeling" ${deling ? 'checked' : ''}> Ta med deling (56 : 8 = ?)</label>
      <div class="gt-moduser">
        <button data-m="ov"><b>Øv</b><span>I ditt eget tempo</span></button>
        <button data-m="klokke"><b>Mot klokka</b><span>Så mange du klarer på 60 sekunder</span></button>
        <button data-m="mestre"><b>Lær alle</b><span>Gå gjennom alle stykkene til du kan dem</span></button>
        <button data-m="oversikt"><b>Oversikt</b><span>Se hva du kan, og gangetabellen</span></button>
      </div>
    </div>
    <div class="gt-flate" id="gtFlate"></div>`;
  const flate = rot.querySelector('#gtFlate');
  const merkTabeller = () => rot.querySelectorAll('[data-t]').forEach(b => b.classList.toggle('paa', L.tabeller.includes(Number(b.dataset.t))));
  rot.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = Number(b.dataset.t); L.tabeller = L.tabeller.includes(t) ? L.tabeller.filter(x => x !== t) : [...L.tabeller, t].sort((a, c) => a - c); lagre(); merkTabeller(); start();
  });
  rot.querySelector('[data-alle]').onclick = () => { L.tabeller = Array.from({ length: 10 }, (_, i) => i + 1); lagre(); merkTabeller(); start(); };
  rot.querySelector('[data-ingen]').onclick = () => { L.tabeller = []; lagre(); merkTabeller(); start(); };
  rot.querySelector('#gtDeling').onchange = e => { deling = e.target.checked; L.deling = deling; lagre(); start(); };
  rot.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { modus = b.dataset.m; start(); });
  merkTabeller();

  // ---------------------------------------------------------------- stykkene
  function alleStykker() {
    const ut = [];
    L.tabeller.forEach(t => { for (let n = 1; n <= 10; n++) { ut.push({ a: t, b: n, op: '·' }); if (deling) ut.push({ a: t * n, b: t, op: ':' }); } });
    return ut;
  }
  const svarPaa = s => s.op === '·' ? s.a * s.b : s.a / s.b;
  const nokkel = s => s.op === '·' ? `${Math.min(s.a, s.b)}x${Math.max(s.a, s.b)}` : `${s.a}:${s.b}`;
  function vekt(s) { const st = L.stat[nokkel(s)]; if (!st) return 3; return Math.max(.5, 3 + st.g * 2 - st.r * .8); }   // vanskelige kommer oftere
  let forrige = '';
  function trekk(liste) {
    const v = liste.map(vekt), sum = v.reduce((a, b) => a + b, 0);
    for (let forsok = 0; forsok < 5; forsok++) {
      let x = Math.random() * sum;
      for (let i = 0; i < liste.length; i++) { x -= v[i]; if (x <= 0) { const s = liste[i]; if (`${s.a}${s.op}${s.b}` !== forrige || liste.length < 2) { forrige = `${s.a}${s.op}${s.b}`; return s; } break; } }
    }
    return liste[Math.floor(Math.random() * liste.length)];
  }
  function registrer(s, rett) { const k = nokkel(s), st = L.stat[k] || (L.stat[k] = { r: 0, g: 0 }); if (rett) st.r++; else st.g++; lagre(); }
  function forklar(s) {
    if (s.op === ':') return `${s.a} : ${s.b} = ${s.a / s.b}, fordi ${s.a / s.b} · ${s.b} = ${s.a}.`;
    const [x, y] = [s.a, s.b];
    if (y === 10 || x === 10) return `${x} · ${y} = ${x * y}. Når du ganger med 10, setter du en null bak.`;
    if (y === 9 || x === 9) { const n = x === 9 ? y : x; return `${x} · ${y} = ${x * y}. Tips: ${n} · 10 − ${n} = ${n * 10} − ${n} = ${n * 9}.`; }
    if (y === 5 || x === 5) { const n = x === 5 ? y : x; return `${x} · ${y} = ${x * y}. Tips: ${n} · 10 = ${n * 10}, og halvparten er ${n * 5}.`; }
    if (y === 2 || x === 2) { const n = x === 2 ? y : x; return `${x} · ${y} = ${x * y}. Det er det dobbelte av ${n}.`; }
    if (y === 4 || x === 4) { const n = x === 4 ? y : x; return `${x} · ${y} = ${x * y}. Tips: dobbelt av dobbelt: ${n} → ${n * 2} → ${n * 4}.`; }
    return `${x} · ${y} = ${x * y}. Det er ${y} grupper med ${x}, eller ${x} grupper med ${y}.`;
  }

  // ---------------------------------------------------------------- én oppgave med tastatur
  function oppgave(s, { ferdig, tittel }) {
    flate.innerHTML = `${tittel || ''}
      <div class="gt-stykke"><span>${s.a}</span><span class="op">${s.op}</span><span>${s.b}</span><span class="op">=</span>
        <input id="gtSvar" inputmode="numeric" autocomplete="off" aria-label="Svar"></div>
      <div class="gt-tilbake" id="gtTilbake" aria-live="polite"></div>
      <div class="gt-tast">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-n="slett" aria-label="Slett">⌫</button><button data-n="0">0</button><button data-n="ok" class="ok">OK</button></div>`;
    const inp = flate.querySelector('#gtSvar'), tb = flate.querySelector('#gtTilbake');
    let laast = false;
    const sjekk = () => {
      if (laast || inp.value === '') return;
      laast = true; const rett = Number(inp.value) === svarPaa(s);
      registrer(s, rett);
      inp.classList.add(rett ? 'rett' : 'galt');
      tb.innerHTML = rett ? '<span class="rett">Riktig! ✓</span>' : `<span class="galt">Ikke helt.</span> ${forklar(s)}`;
      setTimeout(() => ferdig(rett), rett ? 450 : 2600);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') sjekk(); });
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); });
    flate.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      const n = b.dataset.n; if (laast) return;
      if (n === 'ok') sjekk(); else if (n === 'slett') inp.value = inp.value.slice(0, -1); else if (inp.value.length < 4) inp.value += n;
      if (!matchMedia('(pointer: coarse)').matches) inp.focus();
    });
    if (!matchMedia('(pointer: coarse)').matches) inp.focus();
  }

  // ---------------------------------------------------------------- moduser
  function start() {
    stoppTid(); stoppTid = () => {};
    rot.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('paa', b.dataset.m === modus));
    if (modus === 'oversikt') return oversikt();
    const liste = alleStykker();
    if (!liste.length) { flate.innerHTML = '<p class="gt-info">Velg minst én gangetabell over.</p>'; return; }
    ({ ov, klokke, mestre })[modus](liste);
  }
  function ov(liste) {
    let rett = 0, totalt = 0, rekke = 0;
    const neste = () => oppgave(trekk(liste), {
      tittel: `<p class="gt-info">Riktige: <b>${rett}</b> av ${totalt}${rekke > 2 ? ` · 🔥 ${rekke} på rad` : ''}</p>`,
      ferdig: ok => { totalt++; if (ok) { rett++; rekke++; } else rekke = 0; neste(); },
    });
    neste();
  }
  function klokke(liste) {
    const nk = L.tabeller.join(',') + (deling ? ':' : '');
    flate.innerHTML = `<div class="gt-start"><p>Svar på så mange du klarer på 60 sekunder.</p><p class="gt-info">Rekorden din med disse tabellene: <b>${L.rekord[nk] || 0}</b></p><button class="gt-k hoved" id="gtGo">Start ▶</button></div>`;
    flate.querySelector('#gtGo').onclick = () => {
      let poeng = 0, feil = 0; const slutt = Date.now() + 60000;
      const t = setInterval(() => { const el = flate.querySelector('#gtKlokke'); const igjen = Math.max(0, Math.ceil((slutt - Date.now()) / 1000)); if (el) el.textContent = igjen; if (igjen <= 0) ferdig(); }, 200);
      stoppTid = () => clearInterval(t);
      const tittel = () => `<p class="gt-info gt-klokke-linje"><span>⏱ <b id="gtKlokke">${Math.ceil((slutt - Date.now()) / 1000)}</b> s</span><span>Riktige: <b>${poeng}</b></span></p>`;
      function ferdig() {
        clearInterval(t); const ny = poeng > (L.rekord[nk] || 0); if (ny) { L.rekord[nk] = poeng; lagre(); }
        flate.innerHTML = `<div class="gt-start"><div class="gt-stor">${poeng}</div><p>riktige på 60 sekunder${feil ? `, ${feil} feil` : ''}.</p>${ny ? '<p><b>Ny rekord! 🎉</b></p>' : `<p class="gt-info">Rekorden din er ${L.rekord[nk]}.</p>`}<button class="gt-k hoved" id="gtIgjen">Prøv igjen</button></div>`;
        flate.querySelector('#gtIgjen').onclick = () => klokke(liste);
      }
      const neste = () => { if (Date.now() >= slutt) return ferdig(); oppgave(trekk(liste), { tittel: tittel(), ferdig: ok => { if (ok) poeng++; else feil++; neste(); } }); };
      neste();
    };
  }
  function mestre(liste) {
    const igjen = new Map(liste.map(s => [`${s.a}${s.op}${s.b}`, { s, n: 0, maal: 1 }]));
    const total = igjen.size;
    const neste = () => {
      if (!igjen.size) {
        flate.innerHTML = `<div class="gt-start"><div class="gt-stor">🎉</div><p>Du kan alle ${total} stykkene!</p><button class="gt-k hoved" id="gtIgjen">Øv igjen</button></div>`;
        flate.querySelector('#gtIgjen').onclick = () => mestre(liste); return;
      }
      const v = [...igjen.values()], x = trekk(v.map(y => y.s)), y = igjen.get(`${x.a}${x.op}${x.b}`);
      const kan = total - igjen.size;
      oppgave(x, {
        tittel: `<div class="gt-fremdrift"><div style="width:${kan / total * 100}%"></div></div><p class="gt-info">Du kan <b>${kan}</b> av ${total}. Svarer du feil, kommer stykket igjen til du har klart det to ganger.</p>`,
        ferdig: ok => { if (ok) { y.n++; if (y.n >= y.maal) igjen.delete(`${x.a}${x.op}${x.b}`); } else { y.n = 0; y.maal = 2; } neste(); },
      });
    };
    neste();
  }
  function oversikt() {
    let html = '<p class="gt-info">Grønn: du kan den. Gul: øv mer. Rød: mange feil. Grå: ikke øvd ennå. Trykk på en rute for å øve på akkurat den.</p><div class="gt-rutenett"><span class="hj">·</span>';
    for (let b = 1; b <= 10; b++) html += `<span class="hj">${b}</span>`;
    for (let a = 1; a <= 10; a++) {
      html += `<span class="hj">${a}</span>`;
      for (let b = 1; b <= 10; b++) {
        const st = L.stat[`${Math.min(a, b)}x${Math.max(a, b)}`], kl = !st ? '' : st.g > st.r ? 'rod' : st.r >= 3 && st.r >= st.g * 3 ? 'gronn' : 'gul';
        html += `<button class="gt-celle ${kl}" data-a="${a}" data-b="${b}" title="${a} · ${b}">${a * b}</button>`;
      }
    }
    html += '</div><p style="text-align:center"><button class="gt-k" id="gtNull">Nullstill det du har øvd på</button></p>';
    flate.innerHTML = html;
    flate.querySelectorAll('.gt-celle').forEach(c => c.onclick = () => {
      const s = { a: Number(c.dataset.a), b: Number(c.dataset.b), op: '·' };
      oppgave(s, { tittel: '<p class="gt-info">Øv på ett stykke. Du kommer tilbake til oversikten etterpå.</p>', ferdig: () => oversikt() });
    });
    let t0 = 0; const n = flate.querySelector('#gtNull');
    n.onclick = () => { if (Date.now() - t0 > 3000) { t0 = Date.now(); n.textContent = 'Sikker? Trykk igjen'; return; } L.stat = {}; L.rekord = {}; lagre(); oversikt(); };
  }
  start();
})();
