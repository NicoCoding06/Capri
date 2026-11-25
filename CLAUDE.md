# Capri: istruzioni per lavorare sul sito

Sito personale di Nico, pubblicato con GitHub Pages da questo repository (ramo `main`, cartella principale):
https://nicocoding06.github.io/Capri/ . Lingua dell'interfaccia: italiano. Tema: nero, Helvetica bianco,
accenti neon per sezione; tocchi ispirati a Capri di Cyberpunk Edgerunners 2 (rosa #ff2e93, verde #3dff9a).
Logo: microchip verde neon con una C (originale; niente marchi o personaggi protetti).

## Struttura
- `src/shell.html`: HTML e CSS. Contiene i segnaposto `/*ENGINE*/` e `/*APP*/`.
- `src/engine.js`: motore delle formule del foglio di calcolo (Finanze → Fogli).
- `src/app.js`: tutta la logica (Oggi, Ticket, Wishlist, Finanze con Spese/Abbonamenti/Fogli, Diary, Note, notifiche, PC sempre sveglio con Wake Lock).
- `vendor/supabase.js`: copia locale della libreria Supabase (si aggiorna col workflow «Aggiorna libreria Supabase»).
  Il sito non carica codice da siti esterni.
- `index.html`: GENERATO. Non modificarlo a mano: modifica `src/` e poi esegui `python3 build.py`.
- `config.js`: URL e chiave publishable di Supabase. Non sovrascriverlo con valori vuoti.
- `digest.js`: testo delle notifiche, condiviso tra sito (anteprima) e invio.
- `sw.js`: service worker (notifiche push e apertura senza rete, rete prima).
- `.github/workflows/notify.yml` + `.github/scripts/notify.mjs`: invio delle notifiche ogni ora
  (secret `SUPABASE_SECRET_KEY`). Su ogni push a quei file gira una prova automatica.
- `setup.sql`: configurazione del database (tabella `docs`, permessi, archivio `allegati`, funzione `capri_api`).
- `sicurezza.sql`: facoltativo, rende obbligatoria la verifica in due passaggi anche nel database (RLS restrictive su aal2).
- `iphone/`: script Scriptable per iPhone (`capri-widget.js`, `capri-aggiungi.js` per Siri) e `capri_api.sql`.
  Gli script contengono i segnaposto `__URL__`, `__KEY__`, `__TOKEN__`, `__SITE__`: li riempie il sito
  (menu ⋯ → Siri e widget iPhone) quando l'utente li copia. `capri_api` accetta solo il token salvato in `apitoken/main`.

## Dati
Tabella unica `public.docs(user_id, coll, id, data jsonb)`, protetta da RLS.
Collezioni: tickets, wishlist, sheets, config (doc `main`), spese, abbonamenti, note, diary,
push, pushkeys (chiavi VAPID create dal telefono), pushstate, apitoken (chiave per widget e Siri).
Notifiche: tipi riepilogo, ticket, scadenze, spese, settimana (riepilogo del lunedì), custom.

## Sicurezza
- `build.py` inserisce una Content-Security-Policy con l'impronta sha256 degli script interni: niente gestori inline
  (`onclick="…"`), niente `eval`. Un nuovo sito esterno da contattare va aggiunto a `connect-src` in `build.py`.
- Accesso: email e password, verifica in due passaggi facoltativa (TOTP, menu ⋯ → Sicurezza dell'account), sessione di 48 ore.

## Come pubblicare una modifica
1. Modifica `src/…` (o `digest.js`, `sw.js`).
2. `python3 build.py` (controlla anche la sintassi).
3. Commit e push su `main`: GitHub Pages pubblica in circa un minuto.
