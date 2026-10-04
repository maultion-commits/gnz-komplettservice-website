/* init.js – markiert die Seite früh als „JavaScript aktiv“ (Voraussetzung für die Einblend-Effekte).
   Liegt bewusst als Datei vor, damit die Content-Security-Policy keine Inline-Skripte erlauben muss. */
document.documentElement.className += ' js';
