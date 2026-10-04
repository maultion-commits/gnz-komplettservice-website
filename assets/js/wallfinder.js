/* ==========================================================================
   wallfinder.js – "Welches Verfahren passt?" für die Wandreinigung
   Untergrund + Verschmutzung wählen → Empfehlung mit Hinweisen und Übergabe an die Anfrage.
   Die Empfehlungslogik wird als GNZ.WallAdvice bereitgestellt und vom Zustandscheck mitgenutzt.
   ========================================================================== */
(function () {
  'use strict';
  var GNZ = (window.GNZ = window.GNZ || {});
  var root = document.querySelector('[data-wallfinder]');

  var SURFACE = {
    putz:        { label: 'Putzfassade / Wärmedämmverbundsystem (außen)', outside: true, soft: true },
    klinker:     { label: 'Klinker / Backstein (außen)', outside: true },
    beton:       { label: 'Beton / Sichtbeton (außen)', outside: true },
    naturstein:  { label: 'Naturstein (außen)', outside: true, soft: true, acidSensitive: true },
    'innen-farbe': { label: 'Innenwand, gestrichen', outside: false },
    'innen-tapete': { label: 'Innenwand, tapeziert', outside: false, dryOnly: true },
    fliesen:     { label: 'Fliesen (Bad, Küche, Flur)', outside: false }
  };
  var DIRT = {
    algen:       'Algen, Moos, Grünbelag',
    russ:        'Ruß, Nikotin, Kerzenrauch',
    staub:       'Staub, Schmutz, Fettfilm',
    graffiti:    'Graffiti, Farbschmierereien',
    ausbluehung: 'Kalk- oder Salzausblühungen',
    schimmel:    'Schimmel- oder Feuchtigkeitsflecken'
  };

  function advise(sk, dk) {
    var s = SURFACE[sk], r = { title: '', text: '', warn: '', limit: '' };

    if (dk === 'schimmel') {
      return {
        title: 'Erst die Ursache klären',
        text: 'Schimmel und Feuchtigkeitsflecken entstehen fast immer durch Feuchtigkeit, Wärmebrücken oder mangelhafte Lüftung. Reinigen allein löst das Problem nicht – ohne Ursachenbehebung kommt der Befall wieder.',
        warn: 'Bei größeren Flächen (grob: mehr als eine Handfläche pro Wand) ist eine fachliche Begutachtung sinnvoll. Atemschutz und Handschuhe sind bei der Entfernung Pflicht.',
        limit: 'Wir prüfen vor Ort, was machbar ist, reinigen betroffene Flächen und empfehlen bei Bedarf Fachbetriebe für die Ursachenbehebung.'
      };
    }
    if (dk === 'graffiti') {
      var porous = sk === 'putz' || sk === 'naturstein' || sk === 'innen-farbe' || sk === 'innen-tapete';
      r.title = porous ? 'Spezialmittel und schonende Heißwasser-Reinigung' : 'Spezialentferner mit Heißwasser';
      r.text = porous
        ? 'Auf porösen Untergründen zieht Farbe tief ein. Wir testen Entferner an unauffälliger Stelle und arbeiten mit niedrigem Druck, um die Oberfläche nicht aufzurauen.'
        : 'Auf glatten, dichten Flächen lässt sich Farbe meist gut lösen: Spezialentferner einwirken lassen, dann mit Heißwasser nachspülen.';
      r.warn = sk === 'innen-tapete' ? 'Auf Tapete ist Entfernen nicht möglich – hier hilft nur Überkleben oder Neutapezieren.' : '';
      r.limit = porous ? 'Auf Putz und Naturstein lassen sich Schatten oft nur aufhellen; danach kann ein Anstrich oder Anti-Graffiti-Schutz sinnvoll sein.' : 'Anschließend kann ein Anti-Graffiti-Schutz die nächste Reinigung erleichtern.';
      return r;
    }
    if (dk === 'algen') {
      if (!s.outside) {
        return { title: 'Ursache klären, dann reinigen', text: 'Grünbelag an Innenwänden ist selten – meist steckt Feuchtigkeit dahinter. Wir reinigen die betroffene Fläche und prüfen, woher die Feuchte kommt.', warn: 'Ohne Beseitigung der Feuchtigkeitsursache kehrt der Belag zurück.', limit: '' };
      }
      var m = {
        putz: ['Niederdruck mit Algenreiniger', 'Algenreiniger einwirken lassen und mit niedrigem Druck sowie Bürste abspülen. Hochdruck ist auf Putz tabu: Er beschädigt Putz und Dämmschicht.', 'Putz und Dämmverbundsysteme sind druckempfindlich.', 'An schattigen Nord- und Feuchtseiten kommen Algen oft wieder; ein Fassadenschutz oder neuer Anstrich verlängert das Ergebnis.'],
        klinker: ['Heißwasser mit niedrigem Druck', 'Heißwasser löst Grünbelag zuverlässig; ein Spezialreiniger unterstützt bei hartnäckigen Stellen. Fugen schonen wir durch angepasste Düse und Druck.', '', 'Vorab ein Test an unauffälliger Stelle; Fugen und Steine werden auf Schäden geprüft.'],
        beton: ['Heißwasser-Hochdruck, angepasst', 'Beton verträgt Heißwasser gut. Druck und Düse stellen wir auf die Oberfläche ein – bei Sichtbeton testen wir zuerst an unauffälliger Stelle.', '', 'Tief eingedrungene Verfärbungen lassen sich nicht immer vollständig entfernen.'],
        naturstein: ['Schonende Niederdruck-Reinigung', 'Mit pH-neutralem Reiniger und weicher Bürste, danach mit niedrigem Druck abspülen. Keine Säuren auf Kalk- oder Sandstein.', 'Säurehaltige Reiniger können Kalk- und Sandstein dauerhaft schädigen.', 'Vorab Test an unauffälliger Stelle; empfindliche Steine reinigen wir nur sehr zurückhaltend.']
      }[sk];
      return { title: m[0], text: m[1], warn: m[2], limit: m[3] };
    }
    if (dk === 'ausbluehung') {
      return {
        title: 'Trocken abbürsten, dann Spezialreiniger',
        text: 'Ausblühungen werden zuerst trocken abgebürstet, danach mit einem zum Untergrund passenden Spezialreiniger behandelt und abgespült.',
        warn: s.acidSensitive ? 'Auf Naturstein (Kalk/Sandstein) keine säurehaltigen Mittel – wir testen vorab.' : '',
        limit: 'Ausblühungen zeigen, dass Feuchtigkeit im Mauerwerk wandert. Ohne Ursachenbehebung (z. B. Abdichtung, Regenwasserführung) können sie wiederkehren.'
      };
    }
    if (dk === 'russ') {
      if (sk === 'innen-tapete') return { title: 'Trocken reinigen – oder erneuern', text: 'Auf Tapete nur trockene Reinigung (Rußschwamm). Feuchtes Wischen verschmiert Ruß und Nikotin.', warn: 'Starke Nikotinbeläge schlagen durch neue Farbe oft wieder durch.', limit: 'Bei starker Verschmutzung ist Neutapezieren meist sinnvoller; vorher ein Absperrgrund gegen Durchschlagen.' };
      if (sk === 'innen-farbe') return { title: 'Trockenreinigung mit Rußschwamm', text: 'Ruß und Nikotin werden zuerst trocken mit Rußschwamm abgenommen. Nur auf waschbeständiger Farbe folgt eine feuchte Nachreinigung.', warn: 'Feucht wischen verschmiert Ruß – deshalb immer zuerst trocken.', limit: 'Starke Nikotinbeläge schlagen durch neue Farbe oft durch; dann empfiehlt sich ein Absperrgrund vor dem Neuanstrich.' };
      if (sk === 'fliesen') return { title: 'Fettlöser und Dampf', text: 'Rußfilm und Fettbeläge lösen wir mit Fett- bzw. Alkalireiniger, auf Wunsch mit Dampf; Fugen werden mitgereinigt.', warn: '', limit: 'Verfärbte Silikonfugen lassen sich oft nur durch Erneuern wieder weiß bekommen.' };
      return { title: 'Spezialreiniger mit Heißwasser', text: 'Rußbeläge an Außenwänden lösen wir mit geeignetem Reiniger und Heißwasser bei angepasstem Druck.', warn: s.soft ? 'Empfindliche Untergründe nur mit niedrigem Druck.' : '', limit: 'Vorab Test an unauffälliger Stelle.' };
    }
    // staub / Fettfilm
    if (!s.outside) {
      var inner = {
        'innen-farbe': ['Trocken abnehmen, dann feucht', 'Staub und Spinnweben trocken entfernen (Mikrofaser, Wandbürste), anschließend bei waschbeständiger Farbe feucht nachwischen.', '', 'Matte Farben reagieren empfindlich auf Wasser und Reiniger – wir testen vorab.'],
        'innen-tapete': ['Nur trockene Reinigung', 'Tapeten werden trocken mit weichem Mikrofaser- oder Schwammtuch gereinigt. Feuchte kann Flecken und Ablösungen verursachen.', 'Nicht jede Tapete ist waschbeständig.', 'Fettflecken lassen sich auf Tapete oft nicht vollständig entfernen.'],
        fliesen: ['Fettlöser, Kalklöser oder Dampf', 'Je nach Belag Fettlöser oder Kalklöser einwirken lassen, nachwischen, Fugen bürsten; auf Wunsch mit Dampfreiniger.', 'Säurehaltige Kalklöser nicht bei Naturstein- oder zementären Fugen.', 'Stark verfärbte Fugen sind oft nur durch Erneuern wieder hell.']
      }[sk];
      return { title: inner[0], text: inner[1], warn: inner[2], limit: inner[3] };
    }
    return { title: s.soft ? 'Niederdruck mit Reiniger' : 'Heißwasser mit angepasstem Druck', text: s.soft ? 'Allgemeine Verschmutzung wird mit Niederdruck, mildem Reiniger und Bürste gelöst und schonend abgespült.' : 'Allgemeine Verschmutzung entfernen wir mit Heißwasser bei angepasstem Druck – bei Bedarf mit Reiniger unterstützt.', warn: s.soft ? 'Hochdruck ist auf Putz, Dämmung und weichem Naturstein nicht geeignet.' : '', limit: 'Vorab ein Probefeld an unauffälliger Stelle.' };
  }

  GNZ.WallAdvice = { SURFACE: SURFACE, DIRT: DIRT, advise: advise };

  if (!root) return;

  var sel = root.querySelector('[data-wf-surface]'), dirt = root.querySelector('[data-wf-dirt]');
  Object.keys(SURFACE).forEach(function (k) { sel.appendChild(new Option(SURFACE[k].label, k)); });
  Object.keys(DIRT).forEach(function (k) { dirt.appendChild(new Option(DIRT[k], k)); });
  sel.value = 'putz'; dirt.value = 'algen';

  var out = root.querySelector('[data-wf-result]');
  function render() {
    var sk = sel.value, dk = dirt.value, a = advise(sk, dk);
    out.querySelector('[data-wf-title]').textContent = a.title;
    out.querySelector('[data-wf-text]').textContent = a.text;
    var w = out.querySelector('[data-wf-warn]'), l = out.querySelector('[data-wf-limit]');
    w.hidden = !a.warn; w.querySelector('span').textContent = a.warn;
    l.hidden = !a.limit; l.textContent = a.limit;
    var note = 'Wandreinigung – Untergrund: ' + SURFACE[sk].label + '; Verschmutzung: ' + DIRT[dk] + '. Empfohlenes Verfahren: ' + a.title + '.';
    out.querySelector('[data-wf-cta]').setAttribute('href', 'kontakt.html?leistung=wand&notiz=' + encodeURIComponent(note));
  }
  sel.addEventListener('change', render);
  dirt.addEventListener('change', render);
  render();
})();
