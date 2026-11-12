/* Sjekkliste (kan / kan litt / kan ikke) i interaktive kapitler.
   Leser «sjekkliste» fra JSON-blokken #aktiviteter og legger den inn øverst i delkapitlet #dSjekk. */
(function () {
  'use strict';
  var blokk = document.getElementById('aktiviteter');
  if (!blokk) return;
  var data; try { data = JSON.parse(blokk.textContent); } catch (e) { return; }
  var liste = data.sjekkliste; if (!liste || !liste.length) return;
  var NOKKEL = 'sjekk-' + (data.fag || 'fag') + '-' + (data.kap || '');
  var VALG = [['kan', 'Jeg kan', 'v-kan'], ['litt', 'Jeg kan litt', 'v-litt'], ['ikke', 'Jeg kan ikke', 'v-ikke']];
  var lagret = {};
  try { lagret = JSON.parse(localStorage.getItem(NOKKEL) || '{}') || {}; } catch (e) { lagret = {}; }
  function lagre() { try { localStorage.setItem(NOKKEL, JSON.stringify(lagret)); } catch (e) {} }
  function el(tag, kl, tekst) { var e = document.createElement(tag); if (kl) e.className = kl; if (tekst != null) e.textContent = tekst; return e; }
  function anker(dk) { return '#d' + String(dk).replace('.', '-'); }

  function bygg(del) {
    if (del.querySelector('.sjekk')) return;
    var rot = el('div', 'sjekk');
    rot.appendChild(el('p', 'sjekkintro', 'Trykk på det som passer for deg. Du får se hva du bør øve mer på. Svarene dine lagres bare på denne enheten.'));
    var oppsummering = el('div', 'sjekkoppsummering'); oppsummering.setAttribute('aria-live', 'polite');
    rot.appendChild(oppsummering);
    var totalt = 0, statusEl = {};
    liste.forEach(function (dk, di) {
      var fs = el('fieldset'); var lg = el('legend'); lg.appendChild(el('span', null, dk.dk)); lg.appendChild(document.createTextNode(dk.tittel)); fs.appendChild(lg);
      dk.mal.forEach(function (m, mi) {
        totalt++;
        var id = dk.dk + '-' + mi, navn = 'sj' + di + '_' + mi;
        var rad = el('div', 'sjmal'); rad.setAttribute('role', 'radiogroup'); var tekst = /^Jeg /.test(m) ? m : 'Jeg kan ' + m; rad.setAttribute('aria-label', tekst);
        rad.appendChild(el('div', 'sjtekst', tekst + '.'));
        var v = el('div', 'sjvalg');
        VALG.forEach(function (o) {
          var lab = el('label', o[2]); var inp = document.createElement('input'); inp.type = 'radio'; inp.name = navn; inp.value = o[0];
          if (lagret[id] === o[0]) inp.checked = true;
          inp.addEventListener('change', function () { lagret[id] = o[0]; lagre(); oppdater(); });
          lab.appendChild(inp); lab.appendChild(el('span', null, o[1])); v.appendChild(lab);
        });
        rad.appendChild(v); fs.appendChild(rad);
      });
      var st = el('p', 'dkstatus'); statusEl[dk.dk] = st; fs.appendChild(st);
      rot.appendChild(fs);
    });
    var ny = el('button', 'sjekkknapp', 'Start på nytt'); ny.type = 'button';
    ny.addEventListener('click', function () { lagret = {}; lagre(); rot.querySelectorAll('input[type=radio]').forEach(function (r) { r.checked = false; }); oppdater(); });
    rot.appendChild(ny);

    function oppdater() {
      var besvart = 0, ikkeKan = 0, litt = 0, kan = 0;
      liste.forEach(function (dk) {
        var k = 0, l = 0, i = 0, b = 0;
        dk.mal.forEach(function (m, mi) { var s = lagret[dk.dk + '-' + mi]; if (s) b++; if (s === 'kan') k++; if (s === 'litt') l++; if (s === 'ikke') i++; });
        besvart += b; kan += k; litt += l; ikkeKan += i;
        var st = statusEl[dk.dk]; st.textContent = '';
        if (!b) return;
        if (b === dk.mal.length && !l && !i) { st.textContent = '✔ Du kan alt i ' + dk.dk + '. '; return; }
        var a = el('a', null, 'Øv mer på ' + dk.dk); a.href = anker(dk.dk);
        st.appendChild(document.createTextNode((l + i) ? 'Du bør øve mer her. ' : '')); if (l + i) st.appendChild(a);
      });
      oppsummering.textContent = '';
      oppsummering.appendChild(el('p', null, 'Du har svart på ' + besvart + ' av ' + totalt + ' mål.'));
      if (besvart) oppsummering.appendChild(el('p', null, kan + ' kan · ' + litt + ' kan litt · ' + ikkeKan + ' kan ikke'));
      if (besvart === totalt && !litt && !ikkeKan) oppsummering.appendChild(el('p', null, 'Bra! Du kan alt. Prøv oppgavene under som en øving til kapittelprøven.'));
      else if (besvart) oppsummering.appendChild(el('p', null, 'Gå til delkapitlene der du svarte «Jeg kan litt» eller «Jeg kan ikke». Kom så tilbake hit og prøv oppgavene under.'));
    }
    oppdater();
    var h2 = del.querySelector('h2.ovdk');
    if (h2 && h2.nextSibling) del.insertBefore(rot, h2.nextSibling); else del.appendChild(rot);
    var tall = del.querySelector('.ovdktall');
    var h3 = el('h3', 'ovprove', 'Oppgaver til kapittelprøven');
    var intro = el('p', 'ovproveintro', 'Oppgaver fra alle delkapitlene, blandet. Prøv å løse dem uten å se i boka først.');
    if (tall) { del.insertBefore(h3, tall); del.insertBefore(intro, tall); } else { del.appendChild(h3); del.appendChild(intro); }
  }
  function finn() { var d = document.getElementById('dSjekk'); if (d) { bygg(d); return true; } return false; }
  function start() {
    if (finn()) return;
    var mo = new MutationObserver(function () { if (finn()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { mo.disconnect(); }, 15000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
