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
- `.github/scripts/ics.mjs`: calendario .ics (ticket con scadenza, ripetizioni, pagamenti). Il job orario lo carica
  nell'archivio pubblico Supabase `calendario` col nome segreto `calfeed/main.token` + `.ics` (stato in `calstate/main`).
- `musica/capri-musica.py`: programma Python (solo libreria standard) per il PC: legge la cartella musica (tag ID3/FLAC/MP4/Vorbis,
  copertine), server su 127.0.0.1 con URL firmate HMAC (`a/<id>`, `c/<id>`, `library`, `ping`; firma = HMAC-SHA256(chiave, "cosa.scadenza")
  base64url 32 caratteri), tunnel `cloudflared` (trycloudflare.com) e segnale ogni minuto con `capri_music` (`musica/capri_music.sql`).
  `musica/Avvia Capri Musica.bat`: trova (o installa con winget) Python e avvia il programma senza finestre con
  `--cartella <Musica> --imposta-avvio --avvio`, scrivendo `installazione.txt` accanto a sé.
  Codice brano = sha1(artista|album|titolo|n) dai tag, altrimenti (nome file|misura): uguale su ogni dispositivo.
  Salta cartelle non musicali (WhatsApp, Android, suonerie, registrazioni…) e file < 150 KB.
  Android: gira in Termux (cartella predefinita: tutta la memoria `~/storage/shared`) (cloudflared da `pkg`, wake lock, avvio con Termux:Boot); chiave e indirizzi passati con
  `--chiave --supabase --pk --sito` e salvati in config. Con più dispositivi `capri_music` tiene il primo attivo
  (risponde `active:false, busy:<nome>` agli altri) finché non tace per 150 s. Restituisce anche `del` (brani eliminati da Capri):
  ogni dispositivo li sposta in `<cartella>/.capri-cestino/` (indice `cestino.json`), li rimette a posto se tolti dall'elenco
  e li cancella dopo 30 giorni. Endpoint firmati `del/<id>`, `restore/<id>`, `quit/x`; `--riavvia` chiude la versione già accesa.
  Link `#casuale` (anche `webapp://…/Capri/#casuale` da Comandi/Siri): apre Musica e parte in casuale; se il browser
  blocca l'audio senza tocco mostra il grande ▶ «Tocca per partire» (`#mu-go`).
  Il sito lo scarica con i segnaposto `__URL__`, `__KEY__`, `__MUSICKEY__`, `__SITE__` riempiti (sezione Musica → Collega il PC).
- `setup.sql`: configurazione del database (tabella `docs`, permessi, archivio `allegati`, funzione `capri_api`).
- `sicurezza.sql`: facoltativo, rende obbligatoria la verifica in due passaggi anche nel database (RLS restrictive su aal2).
- `iphone/`: script Scriptable per iPhone (`capri-widget.js`, `capri-aggiungi.js` per Siri) e `capri_api.sql`.
  Gli script contengono i segnaposto `__URL__`, `__KEY__`, `__TOKEN__`, `__SITE__`: li riempie il sito
  (menu ⋯ → Siri e widget iPhone) quando l'utente li copia. `capri_api` accetta solo il token salvato in `apitoken/main`.

## Dati
Tabella unica `public.docs(user_id, coll, id, data jsonb)`, protetta da RLS.
Collezioni: tickets, wishlist, sheets, config (doc `main`), spese, abbonamenti, note, diary,
push, pushkeys (chiavi VAPID create dal telefono), pushstate, apitoken (chiave per widget e Siri),
music (doc `key` chiave del PC, `host` {url, at, info}, `likes` {ids}, `deleted` {ids:{id:{at,t,a,al}}}), playlists {name, ids},
habits (abitudini: days 0=lun…6=dom, done {data:1}), calfeed (link privato calendario), calstate, heartbeat.
Ticket: `rep` (g1, s1, s2, m1, m3, m6, a1) = si ripete; completandolo nasce il successivo (`repSpawned`).
Diary: `rev {n,next,last}` per il ripasso dilazionato (logica in digest.js, condivisa).
Notifiche: tipi riepilogo, ticket, scadenze, spese, settimana (lunedì), abitudini, ripasso, custom.

## Sicurezza
- `build.py` inserisce una Content-Security-Policy con l'impronta sha256 degli script interni: niente gestori inline
  (`onclick="…"`), niente `eval`. Un nuovo sito esterno da contattare va aggiunto a `connect-src` in `build.py`.
  Per provare il player in locale: `CAPRI_DEV_ORIGIN=http://127.0.0.1:47123 python3 build.py` (poi ricostruire senza prima del push).
- Accesso: email e password, oppure Face ID (passkey Supabase, da attivare in Authentication → Passkeys), verifica in due passaggi facoltativa (TOTP, menu ⋯ → Sicurezza dell'account), sessione di 48 ore.

## Come pubblicare una modifica
1. Modifica `src/…` (o `digest.js`, `sw.js`).
2. `python3 build.py` (controlla anche la sintassi).
3. Commit e push su `main`: GitHub Pages pubblica in circa un minuto.
