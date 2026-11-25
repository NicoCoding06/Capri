# Capri: istruzioni per lavorare sul sito

Sito personale di Nico, pubblicato con GitHub Pages da questo repository (ramo `main`, cartella principale):
https://nicocoding06.github.io/Capri/ . Lingua dell'interfaccia: italiano. Tema: nero, Helvetica bianco,
accenti neon per sezione; tocchi ispirati a Capri di Cyberpunk Edgerunners 2 (rosa #ff2e93, verde #3dff9a).
Logo: microchip verde neon con una C (originale; niente marchi o personaggi protetti).

## Struttura
- `src/shell.html`: HTML e CSS. Contiene i segnaposto `/*ENGINE*/` e `/*APP*/`.
- `src/engine.js`: motore delle formule del foglio di calcolo (Finanze → Fogli).
- `src/app.js`: tutta la logica (Oggi, Ticket, Wishlist, Finanze con Spese/Abbonamenti/Fogli, Diary, Note, notifiche, PC sempre sveglio con Wake Lock).
- `index.html`: GENERATO. Non modificarlo a mano: modifica `src/` e poi esegui `python3 build.py`.
- `config.js`: URL e chiave publishable di Supabase. Non sovrascriverlo con valori vuoti.
- `digest.js`: testo delle notifiche, condiviso tra sito (anteprima) e invio.
- `sw.js`: service worker (notifiche push e apertura senza rete, rete prima).
- `.github/workflows/notify.yml` + `.github/scripts/notify.mjs`: invio delle notifiche ogni ora
  (secret `SUPABASE_SECRET_KEY`). Su ogni push a quei file gira una prova automatica.
- `setup.sql`: configurazione del database (tabella `docs`, permessi, archivio `allegati`).

## Dati
Tabella unica `public.docs(user_id, coll, id, data jsonb)`, protetta da RLS.
Collezioni: tickets, wishlist, sheets, config (doc `main`), spese, abbonamenti, note, diary,
push, pushkeys (chiavi VAPID create dal telefono), pushstate.

## Come pubblicare una modifica
1. Modifica `src/…` (o `digest.js`, `sw.js`).
2. `python3 build.py` (controlla anche la sintassi).
3. Commit e push su `main`: GitHub Pages pubblica in circa un minuto.
