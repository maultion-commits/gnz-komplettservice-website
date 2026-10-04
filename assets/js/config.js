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
    impraegnierung: [3.5, 6.5]
  }
};
