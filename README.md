# GNZ Immobilien-Komplettservice – Website

Statische Website (HTML · CSS · JavaScript, **keine Abhängigkeiten, kein Build-Zwang**) für einen Hausmeister- und Gebäudeservice
mit den Schwerpunkten **Pflasterreinigung**, **Spezialfugung** und **Sanierung** sowie den Zusatzleistungen
Räumung, Abriss, Transport, Gartenservice und Hausmeisterservice.

> Gestaltungsidee „Pflasterfläche“: Karten sind Steine, der Abstand dazwischen ist die Fuge – das Logo besteht aus drei Pflastersteinen
> (G · N · Z, der mittlere leuchtet). Nur Systemschriften, keine Cookies, kein Tracking.

## Schnellstart

```bash
python -m http.server 8805      # oder: npx serve
# danach: http://localhost:8805
```

`index.html` lässt sich auch per Doppelklick öffnen (klassische Skripte, keine ES-Module).

## Seiten & Funktionen

| Seite | Inhalt |
|---|---|
| `index.html` | Hero mit **Tageszeit-Begrüßung**, Online-Werkzeuge, Schwerpunkte, **Reinigungs-Simulator**, **Vorher/Nachher-Regler**, Fugen-Teaser, Komplettservice, Ablauf, **„Persönlich für Sie da“**, Galerie-Teaser, **Pflege-Tipp des Monats** (mit jährlicher **Kalender-Erinnerung**), FAQ |
| `pflasterreinigung.html` · `spezialfugung.html` · `sanierung.html` | Schwerpunkte (Spezialfugung mit **Fugen-Konfigurator**, Sanierung mit Entscheidungstabelle) |
| `raeumung-abriss-transport.html` · `gartenservice.html` · `hausmeisterservice.html` | Zusatzleistungen (Garten mit **Gartenjahr-Tabs**, Hausmeister mit **Betreuungsplan-Planer**) |
| `pflaster-check.html` | **Pflaster-Check**: 3 Fragen → Empfehlung (Reinigung / Neuverfugung / Sanierung + Fugenmaterial) |
| `rechner.html` | **Preisrechner** (Richtwert-Spanne, druckbar / als PDF speicherbar) |
| `kontakt.html` | **Anfrage-Assistent** (4 Schritte → E-Mail / WhatsApp / Zwischenablage), Kontaktdaten, Live-Status „Jetzt erreichbar“ |
| `galerie.html` | Galerie mit Filter, Lightbox (Tastatur, Wischen) und Bildnachweis |
| `impressum.html` · `datenschutz.html` · `404.html` | Rechtstexte (Vorlagen!) und Fehlerseite |

Auf jeder Seite: **Rückruf-Dialog** (Kopfzeile, mobile Leiste, schwebender Button), Scroll-Fortschritt, sanfte Seitenübergänge
(View Transitions), mobile Aktionsleiste. Die Werkzeuge reichen ihre Ergebnisse untereinander weiter (Pflaster-Check → Rechner → Anfrage) –
per URL-Parameter, ohne Speicherung.

## Platzhalter ersetzen (wichtig vor dem Livegang)

Alle Betriebsdaten stehen **an einer Stelle**: [`assets/js/config.js`](assets/js/config.js)

| Was | Wo | Hinweis |
|---|---|---|
| Telefon, E-Mail, Adresse | `config.js` → `contact`, `address` | wirkt auf Kopf-/Fußzeile, Kontakt, Rückruf, Impressum, Datenschutz |
| WhatsApp | `config.js` → `contact.whatsapp` | z. B. `'491701234567'`. Leer = alle WhatsApp-Buttons bleiben ausgeblendet |
| Öffnungszeiten | `config.js` → `hours`, `hoursNote` | steuert „Jetzt erreichbar · bis 17:00 Uhr“ |
| Preise (Rechner) | `config.js` → `pricing` | **Beispielwerte!** Mit eigener Kalkulation ersetzen |
| **Entwurfs-Modus** | `config.js` → `draft` | `true`: gelber Hinweis + `noindex` (Suchmaschinen bleiben draußen). `false`: Hinweis weg, Seiten indexierbar, strukturierte Daten (Schema.org) werden erzeugt |
| Impressum / Datenschutz | `impressum.html`, `datenschutz.html` | gelb markierte `[…]`-Felder ausfüllen und **rechtlich prüfen lassen** |
| Leistungstexte | die jeweiligen HTML-Seiten | generisch formuliert – auf das reale Leistungsspektrum prüfen (z. B. Winterdienst, Container, Instandsetzung am Gebäude) |

Ohne JavaScript zeigen die Seiten die in den HTML-Dateien hinterlegten Platzhalter (`Musterstraße 12 …`, `info@gnz-komplettservice.example`).

## Gemeinsame Bausteine pflegen (`tools/sync.mjs`)

Kopf, Fuß, Icons (inkl. Logo), Skripte und das `<head>`-Grundgerüst liegen in `partials/`. Die HTML-Seiten bleiben normale, direkt
editierbare Dateien; das Skript ersetzt nur die markierten Bereiche (`<!-- partial:header --> … <!-- /partial:header -->`),
erzeugt Bild-URLs, Bildnachweise, `noindex`/Canonical/Open-Graph, `sitemap.xml` und `robots.txt`.

```bash
node tools/sync.mjs            # Partials einsetzen, Bild-URLs erzeugen, SEO-Block aktualisieren
node tools/sync.mjs --links    # zusätzlich alle internen Links und Anker prüfen
```

Nach jeder Änderung an `partials/*`, `tools/photos.json`, `tools/site.json` oder `config.js` (draft) einmal ausführen.

## Bilder & Lizenzen

* Alle 31 Fotos stammen von **Unsplash** und stehen unter der [Unsplash-Lizenz](https://unsplash.com/license)
  (kostenlos, auch kommerziell nutzbar; Namensnennung nicht verpflichtend, wird aber im Bildnachweis auf `galerie.html` geführt).
  Verwendet wurden ausschließlich kostenlose Fotos – **keine** Unsplash+-Bilder.
* Die Fotos liegen **lokal** in `assets/img/photos/` (je 480 / 960 / 1600 px, per `srcset` responsiv). Die Seite lädt nichts von Dritten.
* Es sind **Symbolbilder**. Eigene Projektfotos später einfach in `assets/img/` ablegen und `<img>` anpassen
  (im Vorher/Nachher-Regler zwei `<img>` in die beiden Ebenen setzen).
* Zentrale Verwaltung: [`tools/photos.json`](tools/photos.json) (Alias → Foto-ID, Fotograf, Quelle). In den Seiten steht nur
  `data-photo="alias"`; `sync.mjs` erzeugt `src`/`srcset`. Zurück auf Hotlink: `"mode": "remote"` setzen und `node tools/sync.mjs` ausführen;
  erneut lokal speichern: `node tools/download-photos.mjs`.

## Veröffentlichen

Der Ordner ist direkt hostbar (Netlify, GitHub Pages, Shared Hosting). Die Datei `_headers` setzt unter Netlify Sicherheits- und Cache-Header.

1. Platzhalter ersetzen (siehe oben).
2. Echte Domain bzw. Netlify-URL in `tools/site.json` eintragen (`{"url": "https://www.beispiel.de"}`), in `config.js` `draft: false` setzen,
   dann `node tools/sync.mjs --links`.
3. HTTPS aktivieren (bei Netlify automatisch).
4. `404.html` nutzt `<base href="/">` – das funktioniert, wenn die Seite im Wurzelverzeichnis der Domain liegt (bei Netlify der Fall).
5. Impressum und Datenschutzerklärung vollständig ausfüllen und rechtlich prüfen lassen.

## Technik im Überblick

* **`assets/js/paving.js`** – prozedurales Pflaster (Canvas): Reihen-, Läufer- und Fischgrätverband, Stein- und Fugenfarben, verschmutzter und sauberer Zustand. Treibt Simulator, Regler und Konfigurator – ohne Bilddateien.
* **Pflaster-Check / Rechner / Anfrage-Assistent / Rückruf / Tipps** – reine Browser-Logik; es wird nichts an einen Server gesendet. Anfrage und Rückruf erzeugen einen Text für `mailto:`, WhatsApp (`wa.me`) oder die Zwischenablage.
* **Barrierefreiheit** – Skip-Link, Landmarken, sichtbarer Fokus, Tastaturbedienung (Menü, Tabs, Dialog, Lightbox, Regler), `aria-live` bei Ergebnissen, `prefers-reduced-motion`; die Kontrastwerte der Hauptfarben sind nach WCAG AA geprüft.
* **Responsiv** – geprüft von 320 bis 1440 px, auch mit breiter Ersatzschrift; mobile Aktionsleiste (Anrufen · Rückruf · WhatsApp · Angebot).
* **Datenschutz** – keine Cookies, kein Tracking, keine Webfonts vom CDN, keine Drittanbieter-Bilder.

## Lizenzhinweis

Eigener Code und Gestaltung: nach Wahl des Betriebs. Fotos: Unsplash-Lizenz (siehe Bildnachweis).
