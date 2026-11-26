#!/data/data/com.termux/files/usr/bin/bash
# Capri sul tablet Android (Termux): installa o aggiorna tutto con un solo comando.
#   curl -fsSL https://nicocoding06.github.io/Capri/server/installa-termux.sh -o ~/capri-installa.sh && bash ~/capri-installa.sh
# Si può rilanciare quando vuoi: aggiorna Capri senza toccare i tuoi dati (che stanno in ~/capri-dati).
set -u
say() { printf '\n\033[1;32m◉ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
DIR="$HOME/capri"
DATI="$HOME/capri-dati"
TAR="https://codeload.github.com/NicoCoding06/Capri/tar.gz/refs/heads/main"
PORTA=8080
TTY=/dev/tty

[ -n "${PREFIX:-}" ] && case "$PREFIX" in *com.termux*) ;; *) die "Questo script va eseguito dentro Termux sul tablet." ;; esac

say "1/7 Installo i programmi che servono (qualche minuto la prima volta)"
yes | pkg update >/dev/null 2>&1 || true
pkg install -y nodejs-lts python curl tar proot >/dev/null 2>&1 || pkg install -y nodejs python curl tar proot || die "Installazione dei programmi non riuscita: controlla la connessione e riprova."
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' || die "Serve Node 18 o più recente."

say "2/7 Permesso per leggere la musica"
if [ ! -d "$HOME/storage/shared" ]; then
  termux-setup-storage
  echo "  Se Android chiede il permesso per i file, tocca Consenti."
  for i in $(seq 1 60); do [ -d "$HOME/storage/shared" ] && break; sleep 1; done
fi
[ -d "$HOME/storage/shared" ] || warn "Senza il permesso per i file la musica non si vede (puoi darlo dopo con: termux-setup-storage)"

say "3/7 Scarico l'ultima versione di Capri"
tmp="$(mktemp -d)"
curl -fsSL "$TAR" | tar xz -C "$tmp" || die "Download non riuscito: controlla la connessione e riprova."
src="$(ls -d "$tmp"/*/ | head -1)"
[ -f "$src/server/capri-server.mjs" ] || die "Il pacchetto scaricato non è completo."
rm -rf "$DIR.old"; [ -d "$DIR" ] && mv "$DIR" "$DIR.old"
mv "$src" "$DIR" && rm -rf "$tmp" "$DIR.old"
mkdir -p "$DATI" && chmod 700 "$DATI"

say "4/7 Spengo il vecchio collegamento della musica (Cloudflare)"
pkill -f 'capri-musica.py' 2>/dev/null || true
pkill -x cloudflared 2>/dev/null || true
rm -f "$HOME/.termux/boot/capri-musica.sh"

say "5/7 Rete privata Tailscale (gratis): solo i tuoi dispositivi vedranno Capri"
if ! command -v tailscale >/dev/null 2>&1; then
  # Tailscale adattato a Termux (codice libero, https://github.com/bropines/tailscale-termux-cli): funziona senza root su Android 11+
  curl -fsSL https://raw.githubusercontent.com/bropines/tailscale-termux-cli/main/remote-install.sh | bash || true
  hash -r
fi
if ! command -v tailscale >/dev/null 2>&1; then
  warn "Provo con la versione ufficiale di Tailscale"
  arch="$(uname -m)"; case "$arch" in aarch64|arm64) a=arm64 ;; armv7*|armv8l|arm) a=arm ;; x86_64) a=amd64 ;; *) a=386 ;; esac
  f="$(curl -fsSL 'https://pkgs.tailscale.com/stable/?mode=json' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write((j.Tarballs||{})['$a']||'')})")"
  [ -n "$f" ] || die "Non trovo Tailscale per questo tablet."
  mkdir -p "$HOME/.tailscale" && curl -fsSL "https://pkgs.tailscale.com/stable/$f" | tar xz -C "$HOME/.tailscale" --strip-components=1 || die "Download di Tailscale non riuscito."
  cat > "$PREFIX/bin/tailscaled-capri" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
# Android non ha /etc/resolv.conf: proot gli presta quello di Termux
exec proot -b "\$PREFIX/etc/resolv.conf:/etc/resolv.conf" "$HOME/.tailscale/tailscaled" --tun=userspace-networking --statedir="$HOME/.tailscale/stato" --socket="$HOME/.tailscale/tailscaled.sock" "\$@"
EOF
  cat > "$PREFIX/bin/tailscale" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
if [ ! -S "$HOME/.tailscale/tailscaled.sock" ] || ! "$HOME/.tailscale/tailscale" --socket="$HOME/.tailscale/tailscaled.sock" status >/dev/null 2>&1; then
  nohup tailscaled-capri >> "$HOME/.tailscale/log.txt" 2>&1 &
  sleep 4
fi
exec proot -b "\$PREFIX/etc/resolv.conf:/etc/resolv.conf" "$HOME/.tailscale/tailscale" --socket="$HOME/.tailscale/tailscaled.sock" "\$@"
EOF
  chmod 755 "$PREFIX/bin/tailscaled-capri" "$PREFIX/bin/tailscale"; hash -r
fi
command -v tailscale >/dev/null 2>&1 || die "Tailscale non si è installato."
tailscale status >/dev/null 2>&1 || true
sleep 2
if ! tailscale status >/dev/null 2>&1; then
  echo
  echo "  Ora accedi a Tailscale (anche con Google o Apple). Apri il link che compare qui sotto,"
  echo "  entra, e conferma il tablet. Poi torna qui."
  echo
  tailscale up --hostname=capri || die "Accesso a Tailscale non riuscito: rilancia lo script."
fi
DNS="$(tailscale status --json 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(String(JSON.parse(s).Self.DNSName||'').replace(/\.$/,''))}catch(e){}})")"
[ -n "$DNS" ] || die "Tailscale è acceso ma non trovo il nome del tablet: in Tailscale → DNS attiva MagicDNS e rilancia."
URL="https://$DNS"
echo "  Indirizzo privato di Capri: $URL"
echo
echo "  Attivo l'indirizzo con lucchetto (HTTPS). Se compare un link, aprilo e tocca «Enable», poi torna qui."
tailscale serve --bg "$PORTA" </dev/tty || tailscale serve --bg --https=443 "http://127.0.0.1:$PORTA" </dev/tty || warn "HTTPS non attivato: in Tailscale → DNS attiva «HTTPS Certificates», poi rilancia lo script."

say "6/7 I tuoi dati"
if [ -f "$DATI/capri.json" ]; then
  echo "  Dati già presenti in $DATI: li lascio così."
  node "$DIR/server/capri-server.mjs" --dati "$DATI" --indirizzo "$URL" --imposta || true
else
  echo "  Copio tutto da Supabase: ticket, spese, note, diario, fogli, wishlist, musica, allegati."
  echo "  Usa la stessa email e password con cui entri in Capri (resteranno le stesse)."
  node "$DIR/server/capri-server.mjs" --dati "$DATI" --indirizzo "$URL" --importa <"$TTY" || die "Copia dei dati non riuscita: rilancia lo script (i dati su Supabase non sono stati toccati)."
fi

say "7/7 Avvio automatico (anche dopo un riavvio del tablet)"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/capri.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
tailscale status >/dev/null 2>&1 || true
pkill -f 'server/capri-server.mjs' 2>/dev/null
cd "$DIR" && nohup sh -c 'while true; do
  [ -f "$DATI/server.log" ] && [ \$(wc -c < "$DATI/server.log") -gt 5000000 ] && mv "$DATI/server.log" "$DATI/server.log.1"
  node server/capri-server.mjs --dati "$DATI" >> "$DATI/server.log" 2>&1
  sleep 5
done' >/dev/null 2>&1 &
EOF
chmod 755 "$HOME/.termux/boot/capri.sh"
cat > "$PREFIX/bin/capri" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
case "\${1:-}" in
  aggiorna) curl -fsSL https://nicocoding06.github.io/Capri/server/installa-termux.sh -o "$HOME/capri-installa.sh" && bash "$HOME/capri-installa.sh" ;;
  riavvia) sh "$HOME/.termux/boot/capri.sh"; echo "Capri riavviato." ;;
  log) tail -n 60 "$DATI/server.log" ;;
  pulisci) node "$DIR/server/capri-server.mjs" --dati "$DATI" --pulisci </dev/tty ;;
  password) pkill -f 'server/capri-server.mjs'; node "$DIR/server/capri-server.mjs" --dati "$DATI" --password; sh "$HOME/.termux/boot/capri.sh" ;;
  *) echo "Capri: $URL"; echo "  capri aggiorna   scarica l'ultima versione"; echo "  capri riavvia    riavvia il server"; echo "  capri log        ultime righe del registro"; echo "  capri password   cambia la password"; echo "  capri pulisci    cancella i dati rimasti su Supabase (solo se sono tutti qui)" ;;
esac
EOF
chmod 755 "$PREFIX/bin/capri"
sh "$HOME/.termux/boot/capri.sh"
sleep 5
if curl -fsS "http://127.0.0.1:$PORTA/config.js" >/dev/null 2>&1; then
  printf '\n\033[1;32m✓ Capri è acceso sul tablet.\033[0m\n\n'
  echo "  Indirizzo (solo dai tuoi dispositivi con Tailscale): $URL"
  echo "  Comandi utili: scrivi  capri  in Termux."
  echo "  Per l'avvio automatico dopo un riavvio serve l'app Termux:Boot (F-Droid), aperta almeno una volta."
else
  warn "Il server non risponde ancora. Guarda il registro con:  capri log"
fi
