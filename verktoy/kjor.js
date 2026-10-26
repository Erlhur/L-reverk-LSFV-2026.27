/* Kjør Python i nettleseren med Skulpt (brukes av python.html og blokker.html) – 26.10.2026 */
window.KJOR = (function () {
  'use strict';
  const FEIL = {
    SyntaxError: 'Skrivefeil (syntaks): Python forstår ikke denne linja. Sjekk kolon, parenteser og anførselstegn.',
    IndentationError: 'Innrykksfeil: linjene i en blokk må starte like langt inn (bruk 4 mellomrom).',
    NameError: 'Navnefeil: et navn er ikke laget ennå, eller det er stavet feil.',
    TypeError: 'Typefeil: du blander ting som ikke passer sammen, for eksempel tekst og tall. Bruk int() eller str().',
    ValueError: 'Verdifeil: verdien passer ikke, for eksempel int("hei").',
    ZeroDivisionError: 'Deling på null: du kan ikke dele på 0.',
    IndexError: 'Indeksfeil: plassen finnes ikke i lista.',
    KeyError: 'Nøkkelfeil: nøkkelen finnes ikke i ordboka.',
    AttributeError: 'Egenskapsfeil: denne tingen har ikke den funksjonen.',
    ImportError: 'Importfeil: modulen finnes ikke her.',
    TimeLimitError: 'Programmet brukte for lang tid. Har du en løkke som aldri stopper?',
  };
  let stopp = false, kjorer = false;
  function kjor(kode, { ut, skilpadde, ferdig, start }) {
    if (kjorer) return;
    kjorer = true; stopp = false;
    ut.innerHTML = '';
    const skriv = (t, kl) => { const s = document.createElement('span'); if (kl) s.className = kl; s.textContent = t; ut.appendChild(s); ut.scrollTop = ut.scrollHeight; };
    const brukerSkilpadde = /\bimport\s+turtle\b|\bfrom\s+turtle\b/.test(kode);
    if (skilpadde) {
      skilpadde.innerHTML = '';
      skilpadde.classList.toggle('vis', brukerSkilpadde);
      (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = skilpadde.id;
      const b = Math.max(300, Math.min(800, skilpadde.clientWidth || skilpadde.parentElement.clientWidth || 400) - 4);
      Sk.TurtleGraphics.width = b; Sk.TurtleGraphics.height = Math.round(b * 0.75);
    }
    Sk.configure({
      output: t => skriv(t),
      read: f => { if (Sk.builtinFiles === undefined || Sk.builtinFiles.files[f] === undefined) throw new Error("Fant ikke filen '" + f + "'"); return Sk.builtinFiles.files[f]; },
      __future__: Sk.python3,
      inputfunTakesPrompt: true,
      inputfun: spm => new Promise(svar => {
        if (spm) skriv(spm);
        const boks = document.createElement('span'); boks.className = 'inn';
        const inp = document.createElement('input'); inp.setAttribute('aria-label', 'Svar');
        boks.appendChild(inp); ut.appendChild(boks); inp.focus();
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = inp.value; boks.remove(); skriv(v + '\n', 'svar'); svar(v); } });
      }),
      execLimit: 60000, yieldLimit: 100, killableWhile: true, killableFor: true,
    });
    if (start) start();
    Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, kode, true), { '*': () => { if (stopp) throw new Error('Stoppet'); } })
      .then(() => { skriv('\n✓ Ferdig\n', 'info'); })
      .catch(e => {
        if (String(e && e.message || e) === 'Stoppet') { skriv('\n■ Stoppet\n', 'info'); return; }
        let navn = e && e.tp$name, linje = '';
        try { if (e.traceback && e.traceback.length) linje = ` (linje ${e.traceback[0].lineno})`; } catch (x) {}
        const tekst = e && e.toString ? e.toString() : String(e);
        skriv('\n' + (FEIL[navn] || 'Feil') + linje + '\n', 'feil');
        skriv(tekst + '\n', 'feil');
      })
      .finally(() => { kjorer = false; if (ferdig) ferdig(); });
  }
  return { kjor, stopp: () => { stopp = true; }, kjorer: () => kjorer };
})();
