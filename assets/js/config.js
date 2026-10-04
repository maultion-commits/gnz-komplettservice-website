/* ==========================================================================
   GNZ Immobilien-Komplettservice – zentrale Betriebsdaten
   Hier einmal pflegen – gilt für Kopfzeile, Fußzeile, Kontaktseite, Rechner und Anfrage-Assistent.
   (Ohne JavaScript zeigen die Seiten die in den HTML-Dateien hinterlegten Platzhalter.)
   ========================================================================== */
window.GNZ = window.GNZ || {};

GNZ.config = {
  // true  = kleiner "Entwurf"-Hinweis unten links (Platzhalter noch nicht ersetzt)
  // false = Hinweis aus, sobald Kontaktdaten, Preise und Texte echt sind
  draft: true,

  company: {
    name: 'GNZ Immobilien-Komplettservice'
  },

  contact: {
    phoneDisplay: '01234 567 890',            // so wird die Nummer angezeigt
    phone: '+491234567890',                    // internationales Format für tel:-Links
    email: 'info@gnz-komplettservice.example', // Platzhalter-Adresse (.example ist nie zustellbar)
    whatsapp: ''                               // z. B. '491701234567' (ohne + und Leerzeichen). Leer = WhatsApp-Buttons bleiben ausgeblendet
  },

  address: {
    street: 'Musterstraße 12',
    zip: '12345',
    city: 'Musterstadt'
  },

  // Öffnungs-/Erreichbarkeitszeiten – steuert die Live-Anzeige "Jetzt erreichbar"
  // Format je Tag: ['von', 'bis'] oder null (geschlossen). Tage: mo di mi do fr sa so
  timezone: 'Europe/Berlin',
  hours: {
    mo: ['07:00', '17:00'],
    di: ['07:00', '17:00'],
    mi: ['07:00', '17:00'],
    do: ['07:00', '17:00'],
    fr: ['07:00', '17:00'],
    sa: null,
    so: null
  },
  hoursNote: 'Samstag nach Vereinbarung',

  // Richtwerte für den Preisrechner (Beispielwerte! bitte durch eigene Kalkulation ersetzen)
  // Angaben in Euro pro m² als [von, bis]
  pricing: {
    vatNote: 'inkl. gesetzlicher MwSt.',
    minimumOrder: 190,                         // Mindestauftragswert in €
    reinigung: [3.5, 6.5],                     // Heißwasser-Hochdruck mit Flächenreiniger
    zustand: { leicht: 0.85, normal: 1, stark: 1.3 },   // Faktor je Verschmutzungsgrad
    verfugung: {                               // Fugen auskratzen + neu verfugen, inkl. Material
      sand:    [4, 7],
      polymer: [7, 12],
      drain:   [14, 22],
      epoxid:  [22, 34]
    },
    impraegnierung: [3.5, 6.5],

    // Mini-Rechner auf den Seiten "Wandreinigung" und "Industrieboden" (Beispielwerte! € pro m² als [von, bis])
    industrie: {
      min: 50, max: 10000, step: 50, start: 500, minimumOrder: 290,
      options: [
        { id: 'unterhalt', label: 'Maschinelle Unterhaltsreinigung', hint: 'je Einsatz, mit Scheuersaugmaschine', range: [0.4, 1.1] },
        { id: 'grund', label: 'Grundreinigung', hint: 'Einwirkzeit, maschinell schrubben, absaugen', range: [1.8, 4.5] },
        { id: 'entfetten', label: 'Entfetten / Ölspuren entfernen', hint: 'Heißwasser-Hochdruck mit Absaugung', range: [3.5, 8.5] }
      ],
      zustand: { leicht: 0.85, normal: 1, stark: 1.4 }
    },
    wand: {
      min: 10, max: 1500, step: 10, start: 120, minimumOrder: 190,
      options: [
        { id: 'innen-trocken', label: 'Innenwand trocken reinigen', hint: 'Rußschwamm, Staub, leichte Verschmutzung', range: [1.5, 3.5] },
        { id: 'innen-feucht', label: 'Innenwand feucht / Fliesen', hint: 'bei waschbeständiger Oberfläche, mit Dampf möglich', range: [2.5, 5.5] },
        { id: 'fassade', label: 'Fassade (Niederdruck / Heißwasser)', hint: 'Putz, Klinker, Beton – Algen und Grünbelag', range: [4.5, 10], access: true }
      ],
      zustand: { leicht: 0.85, normal: 1, stark: 1.35 },
      zugang: {
        boden: { label: 'Vom Boden erreichbar', f: 1 },
        leiter: { label: 'Leiter / Teleskoplanze', f: 1.2 },
        hoehe: { label: 'Hubsteiger oder Gerüst nötig', f: 1.6 }
      }
    }
  }
};
