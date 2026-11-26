#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Capri Musica: fa ascoltare dal sito Capri le canzoni che hai sul PC.

- Legge la cartella della musica (titolo, artista, album, copertina).
- Le offre al sito tramite un collegamento sicuro di Cloudflare (gratis, senza account).
- Ogni minuto dice a Capri "il PC è acceso" e qual è l'indirizzo del collegamento.
- Ogni richiesta deve essere firmata con la tua chiave segreta: senza chiave non si ascolta niente.

Avvio: doppio clic su questo file (serve Python 3, si installa gratis dal Microsoft Store).
Funziona senza installare altro: il collegamento (cloudflared) viene scaricato da solo la prima volta.
"""
import base64, hashlib, hmac, json, mimetypes, os, platform, re, shutil, socket, struct, subprocess, sys
import threading, time, urllib.parse, urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Valori inseriti da Capri quando scarichi il file (menu Musica → Collega il PC)
SUPA_URL = "__URL__"
SUPA_KEY = "__KEY__"
MUSIC_KEY = "__MUSICKEY__"
SITE = "__SITE__"

VERSION = "1.1"
EXTS = {".mp3", ".m4a", ".aac", ".flac", ".ogg", ".oga", ".opus", ".wav"}
MIME = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".flac": "audio/flac", ".ogg": "audio/ogg",
        ".oga": "audio/ogg", ".opus": "audio/ogg", ".wav": "audio/wav"}
COVERS = ("cover", "folder", "front", "album", "copertina")
# Cartelle che non contengono musica (chat, registrazioni, suonerie, sistema): saltate ovunque
SKIP_DIRS = {"android", "whatsapp", "telegram", "signal", "notifications", "ringtones", "alarms", "recordings", "call",
             "callrecord", "call recordings", "voice recorder", "sounds", "audiobooks", "podcasts", "$recycle.bin", "system volume information"}
MIN_SIZE = 150 * 1024  # sotto questa misura è un suono o un vocale, non una canzone
IS_WIN = os.name == "nt"
IS_TERMUX = "com.termux" in os.environ.get("PREFIX", "")
DEVICE = {"name": socket.gethostname()}
ACTIVE = {"v": None}


# ------------------------------------------------------------------ cartelle e impostazioni
def app_dir():
    base = os.environ.get("LOCALAPPDATA") if IS_WIN else os.path.join(os.path.expanduser("~"), ".local", "share")
    d = os.path.join(base or os.path.expanduser("~"), "CapriMusica")
    os.makedirs(d, exist_ok=True)
    return d


APP = app_dir()
CFG_FILE = os.path.join(APP, "config.json")
CACHE_FILE = os.path.join(APP, "libreria.json")
LOG_FILE = os.path.join(APP, "registro.txt")
_log_lock = threading.Lock()
QUIET = False


def log(*a):
    msg = time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    with _log_lock:
        if not QUIET:
            try:
                print(msg, flush=True)
            except Exception:
                pass
        try:
            if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > 1_000_000:
                os.replace(LOG_FILE, LOG_FILE + ".vecchio")
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg + "\n")
        except Exception:
            pass


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, path)


def default_music_dir():
    home = os.path.expanduser("~")
    cands = [os.path.join(home, "Music"), os.path.join(home, "Musica")]
    if IS_TERMUX:
        cands = [os.path.join(home, "storage", "shared")] + cands
    for c in cands:
        if os.path.isdir(c):
            return c
    return home


# ------------------------------------------------------------------ lettura dei tag
def _txt(b, enc):
    try:
        if enc == 0:
            s = b.decode("latin-1")
        elif enc == 1:
            s = b.decode("utf-16")
        elif enc == 2:
            s = b.decode("utf-16-be")
        else:
            s = b.decode("utf-8", "replace")
    except Exception:
        s = b.decode("latin-1", "replace")
    return s.replace("\x00", "/").strip("/ ﻿").strip()


def _syncsafe(b):
    return (b[0] << 21) | (b[1] << 14) | (b[2] << 7) | b[3]


def _split_term(data, enc):
    """Divide al primo terminatore (1 o 2 byte a seconda della codifica)."""
    if enc in (1, 2):
        for i in range(0, len(data) - 1, 2):
            if data[i] == 0 and data[i + 1] == 0:
                return data[:i], data[i + 2:]
        return data, b""
    i = data.find(b"\x00")
    return (data, b"") if i < 0 else (data[:i], data[i + 1:])


def read_id3(f, want_pic=False):
    """Restituisce (tag, offset_audio, immagine)"""
    tags, pic = {}, None
    f.seek(0)
    h = f.read(10)
    if len(h) < 10 or h[:3] != b"ID3":
        return tags, 0, None
    ver, flags, size = h[3], h[5], _syncsafe(h[6:10])
    end = 10 + size + (10 if flags & 0x10 else 0)
    data = f.read(size)
    if flags & 0x80 and ver < 4:
        data = data.replace(b"\xff\x00", b"\xff")
    pos = 0
    if flags & 0x40 and ver >= 3 and len(data) > 4:  # header esteso
        ext = _syncsafe(data[:4]) if ver == 4 else struct.unpack(">I", data[:4])[0] + 4
        pos = ext
    names = {"TIT2": "t", "TPE1": "a", "TALB": "al", "TPE2": "aa", "TRCK": "n", "TYER": "y", "TDRC": "y", "TPOS": "dn",
             "TT2": "t", "TP1": "a", "TAL": "al", "TP2": "aa", "TRK": "n", "TYE": "y", "TLEN": "len", "TLE": "len"}
    while pos < len(data):
        if ver == 2:
            if pos + 6 > len(data):
                break
            fid = data[pos:pos + 3].decode("latin-1", "replace")
            fsz = int.from_bytes(data[pos + 3:pos + 6], "big")
            hdr = 6
        else:
            if pos + 10 > len(data):
                break
            fid = data[pos:pos + 4].decode("latin-1", "replace")
            raw = data[pos + 4:pos + 8]
            fsz = _syncsafe(raw) if ver == 4 else struct.unpack(">I", raw)[0]
            hdr = 10
        if not fid.strip("\x00") or fsz <= 0 or not re.match(r"^[A-Z0-9]{3,4}$", fid):
            break
        body = data[pos + hdr:pos + hdr + fsz]
        pos += hdr + fsz
        if fid in names and body:
            v = _txt(body[1:], body[0])
            k = names[fid]
            if v and k not in tags:
                tags[k] = v
        elif fid in ("APIC", "PIC") and want_pic and pic is None and body:
            enc = body[0]
            if fid == "APIC":
                mime, rest = _split_term(body[1:], 0)
                mime = mime.decode("latin-1", "replace").lower() or "image/jpeg"
            else:
                fmt = body[1:4].decode("latin-1", "replace").upper()
                mime, rest = ("image/png" if fmt == "PNG" else "image/jpeg"), body[4:]
            rest = rest[1:]  # tipo di immagine
            _, img = _split_term(rest, enc)
            if mime in ("jpg", "jpeg"):
                mime = "image/jpeg"
            if "/" not in mime:
                mime = "image/" + mime
            pic = (mime, img)
        elif fid in ("APIC", "PIC") and body:
            tags["pic"] = 1
    return tags, end, pic


def read_id3v1(f):
    try:
        f.seek(-128, 2)
        b = f.read(128)
    except OSError:
        return {}
    if b[:3] != b"TAG":
        return {}
    g = lambda x: x.split(b"\x00")[0].decode("latin-1", "replace").strip()
    t = {"t": g(b[3:33]), "a": g(b[33:63]), "al": g(b[63:93]), "y": g(b[93:97])}
    if b[125] == 0 and b[126]:
        t["n"] = str(b[126])
    return {k: v for k, v in t.items() if v}


MP3_BR = {  # MPEG1 Layer3, MPEG2/2.5 Layer3
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]}
MP3_SR = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def mp3_duration(f, start, total):
    f.seek(start)
    buf = f.read(65536)
    i = 0
    while i < len(buf) - 4:
        if buf[i] == 0xFF and (buf[i + 1] & 0xE0) == 0xE0:
            ver = (buf[i + 1] >> 3) & 3
            layer = (buf[i + 1] >> 1) & 3
            bri = (buf[i + 2] >> 4) & 15
            sri = (buf[i + 2] >> 2) & 3
            if ver != 1 and layer == 1 and bri not in (0, 15) and sri != 3:
                sr = MP3_SR[ver][sri]
                br = MP3_BR[1 if ver == 3 else 2][bri] * 1000
                spf = 1152 if ver == 3 else 576
                mono = (buf[i + 3] >> 6) == 3
                side = (17 if mono else 32) if ver == 3 else (9 if mono else 17)
                x = buf[i + 4 + side:i + 4 + side + 120]
                if x[:4] in (b"Xing", b"Info") and len(x) >= 12 and struct.unpack(">I", x[4:8])[0] & 1:
                    frames = struct.unpack(">I", x[8:12])[0]
                    return round(frames * spf / sr)
                v = buf[i + 36:i + 36 + 18]
                if v[:4] == b"VBRI" and len(v) >= 18:
                    return round(struct.unpack(">I", v[14:18])[0] * spf / sr)
                return round((total - start - i) * 8 / br) if br else 0
        i += 1
    return 0


def read_flac(f, want_pic=False):
    tags, dur, pic = {}, 0, None
    f.seek(0)
    if f.read(4) != b"fLaC":
        return tags, 0, None
    last = False
    while not last:
        h = f.read(4)
        if len(h) < 4:
            break
        last, typ, size = bool(h[0] & 0x80), h[0] & 0x7F, int.from_bytes(h[1:4], "big")
        if typ == 0:
            b = f.read(size)
            sr = (b[10] << 12) | (b[11] << 4) | (b[12] >> 4)
            tot = ((b[13] & 0x0F) << 32) | struct.unpack(">I", b[14:18])[0]
            dur = round(tot / sr) if sr else 0
        elif typ == 4:
            tags.update(vorbis_comments(f.read(size)))
        elif typ == 6:
            tags["pic"] = 1
            if want_pic and pic is None:
                b = f.read(size)
                p = 4
                ml = struct.unpack(">I", b[p:p + 4])[0]; p += 4
                mime = b[p:p + ml].decode("latin-1", "replace"); p += ml
                dl = struct.unpack(">I", b[p:p + 4])[0]; p += 4 + dl + 16
                il = struct.unpack(">I", b[p:p + 4])[0]; p += 4
                pic = (mime or "image/jpeg", b[p:p + il])
            else:
                f.seek(size, 1)
        else:
            f.seek(size, 1)
    return tags, dur, pic


def vorbis_comments(b):
    out = {}
    try:
        vl = struct.unpack("<I", b[:4])[0]
        p = 4 + vl
        n = struct.unpack("<I", b[p:p + 4])[0]; p += 4
        m = {"title": "t", "artist": "a", "album": "al", "albumartist": "aa", "album artist": "aa", "tracknumber": "n", "date": "y", "year": "y"}
        for _ in range(min(n, 500)):
            ln = struct.unpack("<I", b[p:p + 4])[0]; p += 4
            kv = b[p:p + ln].decode("utf-8", "replace"); p += ln
            if "=" in kv:
                k, v = kv.split("=", 1)
                k = m.get(k.lower())
                if k and v.strip() and k not in out:
                    out[k] = v.strip()
            if kv.lower().startswith("metadata_block_picture="):
                out["pic"] = 1
    except Exception:
        pass
    return out


def read_ogg(f):
    f.seek(0)
    b = f.read(65536)
    for mark in (b"\x03vorbis", b"OpusTags"):
        i = b.find(mark)
        if i >= 0:
            return vorbis_comments(b[i + len(mark):])
    return {}


def _atoms(f, start, end):
    p = start
    while p + 8 <= end:
        f.seek(p)
        h = f.read(8)
        if len(h) < 8:
            return
        size, typ = struct.unpack(">I", h[:4])[0], h[4:8]
        hdr = 8
        if size == 1:
            size = struct.unpack(">Q", f.read(8))[0]; hdr = 16
        elif size == 0:
            size = end - p
        if size < hdr:
            return
        yield typ, p + hdr, p + size
        p += size


def read_mp4(f, total, want_pic=False):
    tags, dur, pic = {}, 0, None
    m = {b"\xa9nam": "t", b"\xa9ART": "a", b"\xa9alb": "al", b"aART": "aa", b"\xa9day": "y"}
    for typ, s, e in _atoms(f, 0, total):
        if typ != b"moov":
            continue
        for t2, s2, e2 in _atoms(f, s, e):
            if t2 == b"mvhd":
                f.seek(s2)
                b = f.read(32)
                if b[0] == 1:
                    ts, d = struct.unpack(">IQ", b[20:32])
                else:
                    ts, d = struct.unpack(">II", b[12:20])
                dur = round(d / ts) if ts else 0
            elif t2 == b"udta":
                for t3, s3, e3 in _atoms(f, s2, e2):
                    if t3 != b"meta":
                        continue
                    for t4, s4, e4 in _atoms(f, s3 + 4, e3):
                        if t4 != b"ilst":
                            continue
                        for t5, s5, e5 in _atoms(f, s4, e4):
                            for t6, s6, e6 in _atoms(f, s5, e5):
                                if t6 != b"data":
                                    continue
                                f.seek(s6)
                                b = f.read(min(e6 - s6, 8) if t5 == b"covr" and not want_pic else e6 - s6)
                                val = b[8:]
                                if t5 in m and t5 not in tags:
                                    tags[m[t5]] = val.decode("utf-8", "replace").strip()
                                elif t5 == b"trkn" and len(val) >= 4:
                                    tags["n"] = str(struct.unpack(">H", val[2:4])[0])
                                elif t5 == b"covr":
                                    tags["pic"] = 1
                                    if want_pic and pic is None:
                                        kind = struct.unpack(">I", b[:4])[0] & 0xFFFFFF
                                        pic = ("image/png" if kind == 14 else "image/jpeg", val)
    return tags, dur, pic


def read_wav(f):
    f.seek(0)
    h = f.read(12)
    if h[:4] != b"RIFF" or h[8:12] != b"WAVE":
        return 0
    rate = 0
    while True:
        c = f.read(8)
        if len(c) < 8:
            return 0
        cid, sz = c[:4], struct.unpack("<I", c[4:])[0]
        if cid == b"fmt ":
            b = f.read(sz)
            rate = struct.unpack("<I", b[8:12])[0]
        elif cid == b"data":
            return round(sz / rate) if rate else 0
        else:
            f.seek(sz + (sz & 1), 1)


def probe(path, want_pic=False):
    ext = os.path.splitext(path)[1].lower()
    tags, dur, pic = {}, 0, None
    total = os.path.getsize(path)
    with open(path, "rb") as f:
        if ext == ".mp3":
            tags, start, pic = read_id3(f, want_pic)
            if not tags:
                tags = read_id3v1(f)
            if not want_pic:
                dur = mp3_duration(f, start, total)
        elif ext == ".flac":
            tags, dur, pic = read_flac(f, want_pic)
        elif ext in (".m4a", ".aac") and ext == ".m4a":
            tags, dur, pic = read_mp4(f, total, want_pic)
        elif ext in (".ogg", ".oga", ".opus"):
            tags = read_ogg(f)
        elif ext == ".wav":
            dur = read_wav(f)
    if "len" in tags:
        try:
            dur = dur or round(int(tags["len"]) / 1000)
        except ValueError:
            pass
        tags.pop("len", None)
    return tags, dur, pic


def guess_from_name(path, root):
    name = os.path.splitext(os.path.basename(path))[0]
    name = re.sub(r"^\s*\d{1,3}[\s.\-_]+", "", name).replace("_", " ").strip()
    artist, title = "", name
    if " - " in name:
        artist, title = [x.strip() for x in name.split(" - ", 1)]
    parent = os.path.basename(os.path.dirname(path))
    if os.path.normcase(os.path.dirname(path)) == os.path.normcase(root):
        parent = ""
    return title or name, artist, parent


# ------------------------------------------------------------------ libreria
class Library:
    def __init__(self, folders):
        self.folders = [os.path.abspath(x) for x in folders]
        self.tracks = {}      # id -> dati
        self.paths = {}       # id -> percorso
        self.lock = threading.Lock()
        self.cache = load_json(CACHE_FILE, {})
        self.at = 0

    @staticmethod
    def tid(rel):
        return hashlib.sha1(rel.replace("\\", "/").lower().encode("utf-8")).hexdigest()[:16]

    def scan(self):
        t0 = time.time()
        tracks, paths, new_cache, parsed = {}, {}, {}, 0
        for root in self.folders:
            if not os.path.isdir(root):
                log("⚠ Cartella non trovata:", root)
                continue
            for d, dirs, files in os.walk(root):
                dirs[:] = sorted(x for x in dirs if not x.startswith(".") and not x.startswith("$") and x.lower() not in SKIP_DIRS)
                for fn in files:
                    ext = os.path.splitext(fn)[1].lower()
                    if ext not in EXTS or fn.startswith("._"):
                        continue
                    p = os.path.join(d, fn)
                    try:
                        st = os.stat(p)
                    except OSError:
                        continue
                    if st.st_size < MIN_SIZE:
                        continue
                    rel = os.path.relpath(p, root)
                    key = p + "|" + str(int(st.st_mtime)) + "|" + str(st.st_size)
                    info = self.cache.get(key)
                    if info is None:
                        try:
                            tags, dur, _ = probe(p)
                        except Exception as e:
                            tags, dur = {}, 0
                        g_t, g_a, g_al = guess_from_name(p, root)
                        info = {"t": tags.get("t") or g_t, "a": tags.get("a") or g_a or "Artista sconosciuto",
                                "al": tags.get("al") or g_al or "", "aa": tags.get("aa", ""), "n": _num(tags.get("n")),
                                "dn": _num(tags.get("dn")), "y": (tags.get("y") or "")[:4], "d": dur, "pic": 1 if tags.get("pic") else 0,
                                "tg": 1 if tags.get("t") else 0}
                        parsed += 1
                    new_cache[key] = info
                    # codice uguale su ogni dispositivo: dai tag del brano, altrimenti da nome e misura del file
                    if info.get("tg"):
                        base = "|".join(str(info.get(k) or "") for k in ("a", "al", "t", "n")).lower()
                    else:
                        base = fn.lower() + "|" + str(st.st_size)
                    i = self.tid(base)
                    k = 2
                    while i in tracks:
                        i = self.tid(base + "#" + str(k))
                        k += 1
                    tr = dict(info)
                    tr.update({"i": i, "f": ext[1:], "m": int(st.st_mtime), "s": st.st_size})
                    if not tr["pic"] and folder_cover(d):
                        tr["pic"] = 2
                    tracks[i] = tr
                    paths[i] = p
        with self.lock:
            self.tracks, self.paths, self.at = tracks, paths, int(time.time() * 1000)
        self.cache = new_cache
        try:
            save_json(CACHE_FILE, new_cache)
        except Exception as e:
            log("Non riesco a salvare la cache:", e)
        log(f"Libreria: {len(tracks)} brani ({parsed} letti ora) in {time.time() - t0:.1f} s")

    def as_json(self):
        with self.lock:
            lst = sorted(self.tracks.values(), key=lambda x: ((x["aa"] or x["a"]).lower(), x["al"].lower(), x.get("dn") or 0, x.get("n") or 0, x["t"].lower()))
            return {"v": 1, "name": DEVICE["name"], "at": self.at, "tracks": lst}


def _num(v):
    try:
        return int(str(v).split("/")[0])
    except (TypeError, ValueError):
        return 0


_cover_dir_cache = {}


def folder_cover(d):
    if d in _cover_dir_cache:
        return _cover_dir_cache[d]
    found = None
    try:
        imgs = [x for x in os.listdir(d) if os.path.splitext(x)[1].lower() in (".jpg", ".jpeg", ".png", ".webp")]
        for name in imgs:
            if os.path.splitext(name)[0].lower() in COVERS:
                found = os.path.join(d, name)
                break
        if not found and len(imgs) == 1:
            found = os.path.join(d, imgs[0])
    except OSError:
        pass
    _cover_dir_cache[d] = found
    return found


# ------------------------------------------------------------------ firme
def b64u(b):
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def sign(what, exp):
    return b64u(hmac.new(MUSIC_KEY.encode(), f"{what}.{exp}".encode(), hashlib.sha256).digest())[:32]


def check(what, q):
    try:
        exp = int(q.get("e", ["0"])[0])
    except ValueError:
        return False
    now = time.time()
    if exp < now - 60 or exp > now + 3 * 86400:
        return False
    return hmac.compare_digest(sign(what, exp), q.get("s", [""])[0])


# ------------------------------------------------------------------ server
LIB = None
SERVER_INFO = {"url": None}
STOP = threading.Event()


# ------------------------------------------------------------------ cestino (eliminazioni da Capri)
TRASH_FILE = os.path.join(APP, "cestino.json")
TRASH_DIR = ".capri-cestino"
TRASH_DAYS = 30
_trash_lock = threading.Lock()


def _trash_load():
    return load_json(TRASH_FILE, {})


def _root_of(path):
    for r in LIB.folders:
        try:
            if os.path.commonpath([os.path.abspath(path), r]) == r:
                return r
        except ValueError:
            continue
    return None


def trash_track(i):
    """Sposta il brano nel cestino nascosto della sua cartella (recuperabile per 30 giorni)."""
    with _trash_lock:
        path = LIB.paths.get(i)
        if not path or not os.path.isfile(path):
            return False
        root = _root_of(path)
        if not root:
            return False
        rel = os.path.relpath(path, root)
        dest = os.path.join(root, TRASH_DIR, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if os.path.exists(dest):
            b, e = os.path.splitext(dest)
            dest = f"{b}.{int(time.time())}{e}"
        shutil.move(path, dest)
        idx = _trash_load()
        idx[i] = {"orig": path, "trash": dest, "at": int(time.time())}
        save_json(TRASH_FILE, idx)
        with LIB.lock:
            t = LIB.tracks.pop(i, None)
            LIB.paths.pop(i, None)
            LIB.at = int(time.time() * 1000)
        log("🗑 Spostato nel cestino:", (t or {}).get("t") or os.path.basename(path))
        return True


def restore_track(i):
    with _trash_lock:
        idx = _trash_load()
        e = idx.get(i)
        if not e:
            return False
        ok = False
        if os.path.isfile(e["trash"]) and not os.path.exists(e["orig"]):
            os.makedirs(os.path.dirname(e["orig"]), exist_ok=True)
            shutil.move(e["trash"], e["orig"])
            ok = True
            log("↩ Ripristinato:", os.path.basename(e["orig"]))
        idx.pop(i, None)
        save_json(TRASH_FILE, idx)
    if ok:
        threading.Thread(target=LIB.scan, daemon=True).start()
    return ok


def purge_trash():
    with _trash_lock:
        idx = _trash_load()
        limit = time.time() - TRASH_DAYS * 86400
        changed = False
        for i, e in list(idx.items()):
            if e.get("at", 0) < limit:
                try:
                    if os.path.isfile(e["trash"]):
                        os.remove(e["trash"])
                except OSError:
                    pass
                idx.pop(i, None)
                changed = True
        if changed:
            save_json(TRASH_FILE, idx)


def apply_remote_deletions(ids):
    """Capri dice quali brani sono stati eliminati: li sposto nel cestino; quelli tolti dall'elenco tornano al loro posto."""
    ids = set(ids or [])
    for i in list(ids):
        if i in LIB.paths:
            try:
                trash_track(i)
            except Exception as e:
                log("⚠ Non riesco a eliminare", i, e)
    for i in list(_trash_load().keys()):
        if i not in ids:
            try:
                restore_track(i)
            except Exception as e:
                log("⚠ Non riesco a ripristinare", i, e)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "CapriMusica/" + VERSION

    def log_message(self, *a):
        pass

    def _cors(self):
        origin = self.headers.get("Origin", "")
        site = re.match(r"^https?://[^/]+", SITE or "")
        allowed = {site.group(0)} if site else set()
        if origin in allowed or re.match(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges")

    def _send(self, code, body=b"", ctype="application/json; charset=utf-8", extra=None):
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Range")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        q = urllib.parse.parse_qs(u.query)
        parts = [x for x in u.path.split("/") if x]
        try:
            if len(parts) == 2 and parts[0] in ("del", "restore", "quit") and re.match(r"^[0-9a-z]{1,16}$", parts[1]):
                if not check(parts[0] + "." + parts[1], q):
                    return self._send(403, b'{"error":"firma non valida"}')
                if parts[0] == "quit":
                    self._send(200, b'{"ok":true}')
                    STOP.set()
                    return
                ok = trash_track(parts[1]) if parts[0] == "del" else restore_track(parts[1])
                return self._send(200, json.dumps({"ok": ok, "at": LIB.at}).encode(), extra={"Cache-Control": "no-store"})
            if parts == ["ping"]:
                ok = check("ping", q)
                body = {"capri": True, "ok": ok}
                if ok:
                    body.update({"tracks": len(LIB.tracks), "name": DEVICE["name"], "v": VERSION, "at": LIB.at})
                return self._send(200, json.dumps(body).encode(), extra={"Cache-Control": "no-store"})
            if parts == ["library"]:
                if not check("library", q):
                    return self._send(403, b'{"error":"firma non valida"}')
                body = json.dumps(LIB.as_json(), ensure_ascii=False, separators=(",", ":")).encode("utf-8")
                return self._send(200, body, extra={"Cache-Control": "no-store"})
            if len(parts) == 2 and parts[0] in ("a", "c") and re.match(r"^[0-9a-f]{16}$", parts[1]):
                if not check(parts[0] + "." + parts[1], q):
                    return self._send(403, b'{"error":"firma non valida"}')
                path = LIB.paths.get(parts[1])
                if not path or not os.path.isfile(path):
                    return self._send(404, b'{"error":"brano non trovato"}')
                return self._audio(path) if parts[0] == "a" else self._cover(path)
            return self._send(404, b'{"error":"non trovato"}')
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as e:
            log("Errore nella richiesta:", repr(e))
            try:
                self._send(500, b'{"error":"errore interno"}')
            except Exception:
                pass

    def _cover(self, path):
        img = None
        try:
            _, _, pic = probe(path, want_pic=True)
            if pic and pic[1]:
                img = pic
        except Exception:
            pass
        if not img:
            fc = folder_cover(os.path.dirname(path))
            if fc:
                with open(fc, "rb") as f:
                    img = (mimetypes.guess_type(fc)[0] or "image/jpeg", f.read())
        if not img:
            return self._send(404, b'{"error":"nessuna copertina"}')
        mime = img[0] if img[0].startswith("image/") else "image/jpeg"
        return self._send(200, img[1], ctype=mime, extra={"Cache-Control": "private, max-age=86400"})

    def _audio(self, path):
        size = os.path.getsize(path)
        ctype = MIME.get(os.path.splitext(path)[1].lower(), "application/octet-stream")
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        code = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
            if not m or (m.group(1) == "" and m.group(2) == ""):
                return self._send(416, b"", extra={"Content-Range": f"bytes */{size}"})
            if m.group(1) == "":
                start = max(0, size - int(m.group(2)))
            else:
                start = int(m.group(1))
                if m.group(2):
                    end = min(int(m.group(2)), size - 1)
            if start >= size or start > end:
                return self._send(416, b"", extra={"Content-Range": f"bytes */{size}"})
            code = 206
        length = end - start + 1
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "private, max-age=3600")
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        if self.command == "HEAD":
            return
        with open(path, "rb") as f:
            f.seek(start)
            left = length
            while left > 0:
                chunk = f.read(min(256 * 1024, left))
                if not chunk:
                    break
                self.wfile.write(chunk)
                left -= len(chunk)


# ------------------------------------------------------------------ Supabase: "il PC è acceso"
def heartbeat(url):
    if not SUPA_URL.startswith("https://"):
        return False
    body = json.dumps({"p_key": MUSIC_KEY, "p_url": url, "p_info": {"tracks": len(LIB.tracks) if LIB else 0,
                       "name": DEVICE["name"], "v": VERSION, "os": "Android" if IS_TERMUX else platform.system(), "lib": LIB.at if LIB else 0}}).encode()
    req = urllib.request.Request(SUPA_URL.rstrip("/") + "/rest/v1/rpc/capri_music", data=body, method="POST",
                                 headers={"apikey": SUPA_KEY, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            res = json.loads(r.read() or b"{}")
        act = res.get("active", True) if isinstance(res, dict) else True
        if url and act != ACTIVE["v"]:
            if act:
                log("✓ Questo dispositivo ora serve la musica a Capri.")
            else:
                log(f"In attesa: la musica la sta già servendo «{res.get('busy') or 'un altro dispositivo'}». Se si spegne, subentro io entro pochi minuti.")
        ACTIVE["v"] = act if url else None
        if isinstance(res, dict) and isinstance(res.get("del"), list) and LIB:
            apply_remote_deletions(res["del"])
        return True
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", "replace")[:300]
        if "capri_music" in msg and ("not find" in msg or "PGRST202" in msg):
            log("⚠ Su Supabase manca la funzione capri_music: esegui il codice SQL dalla pagina Musica di Capri.")
        elif "chiave" in msg:
            log("⚠ Chiave non valida: scarica di nuovo il programma da Capri (Musica → Collega il PC).")
        else:
            log("⚠ Supabase ha risposto", e.code, msg)
    except Exception as e:
        log("⚠ Non riesco a contattare Supabase:", e)
    return False


# ------------------------------------------------------------------ collegamento Cloudflare
def cloudflared_path():
    name = "cloudflared.exe" if IS_WIN else "cloudflared"
    local = os.path.join(APP, name)
    if os.path.isfile(local):
        return local
    found = shutil.which("cloudflared")
    if found:
        return found
    if IS_TERMUX:
        log("Installo cloudflared con pkg (solo la prima volta)…")
        try:
            subprocess.run(["pkg", "install", "-y", "cloudflared"], check=False)
        except Exception as e:
            log("⚠ pkg non riuscito:", e)
        found = shutil.which("cloudflared")
        if not found:
            log("⚠ Scrivi in Termux:  pkg install cloudflared   e riavvia Capri Musica.")
        return found
    sysname, arch = platform.system(), platform.machine().lower()
    arch = "arm64" if arch in ("arm64", "aarch64") else "amd64"
    if sysname == "Windows":
        asset = f"cloudflared-windows-{arch}.exe"
    elif sysname == "Linux":
        asset = f"cloudflared-linux-{arch}"
    else:
        log("Installa cloudflared con:  brew install cloudflared   e riavvia Capri Musica.")
        return None
    link = "https://github.com/cloudflare/cloudflared/releases/latest/download/" + asset
    log("Scarico il collegamento sicuro di Cloudflare (solo la prima volta, circa 50 MB)…")
    try:
        tmp = local + ".part"
        with urllib.request.urlopen(link, timeout=60) as r, open(tmp, "wb") as out:
            total = int(r.headers.get("Content-Length") or 0)
            done, last = 0, 0
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                out.write(b)
                done += len(b)
                if total and done * 10 // total > last:
                    last = done * 10 // total
                    log(f"   {last * 10}%")
        os.replace(tmp, local)
        if not IS_WIN:
            os.chmod(local, 0o755)
        return local
    except Exception as e:
        log("⚠ Download non riuscito:", e)
        return None


class Tunnel(threading.Thread):
    def __init__(self, port, on_url):
        super().__init__(daemon=True)
        self.port, self.on_url, self.proc, self.stop = port, on_url, None, False

    def run(self):
        wait = 5
        while not self.stop:
            exe = cloudflared_path()
            if not exe:
                time.sleep(60)
                continue
            log("Apro il collegamento sicuro…")
            flags = 0x08000000 if IS_WIN else 0  # niente finestra nera in più
            try:
                self.proc = subprocess.Popen([exe, "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{self.port}"],
                                             stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, creationflags=flags)
            except Exception as e:
                log("⚠ Non riesco ad avviare cloudflared:", e)
                time.sleep(30)
                continue
            got = False
            for raw in self.proc.stderr:
                line = raw.decode("utf-8", "replace")
                m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
                if m and not got:
                    got = True
                    wait = 5
                    self.on_url(m.group(0))
            self.proc.wait()
            self.on_url(None)
            if self.stop:
                break
            log(f"Collegamento chiuso, lo riapro tra {wait} s")
            time.sleep(wait)
            wait = min(wait * 2, 300)

    def close(self):
        self.stop = True
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()


# ------------------------------------------------------------------ avvio con Windows
def startup_file():
    return os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "Capri Musica.vbs")


def set_autostart(on):
    if IS_TERMUX:
        d = os.path.join(os.path.expanduser("~"), ".termux", "boot")
        f = os.path.join(d, "capri-musica.sh")
        if not on:
            if os.path.exists(f):
                os.remove(f)
            return True
        os.makedirs(d, exist_ok=True)
        with open(f, "w") as fh:
            fh.write("#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock\nnohup python {} --avvio > /dev/null 2>&1 &\n".format(os.path.abspath(__file__)))
        os.chmod(f, 0o755)
        return True
    if not IS_WIN:
        return False
    f = startup_file()
    if not on:
        if os.path.exists(f):
            os.remove(f)
        return True
    pyw = sys.executable
    if pyw.lower().endswith("python.exe"):
        cand = pyw[:-10] + "pythonw.exe"
        if os.path.exists(cand):
            pyw = cand
    script = os.path.abspath(__file__)
    vbs = 'Set s = CreateObject("WScript.Shell")\r\ns.Run """{}"" ""{}"" --avvio", 0, False\r\n'.format(pyw, script)
    with open(f, "w", encoding="utf-16") as fh:
        fh.write(vbs)
    return True


# ------------------------------------------------------------------ programma
def ask(q, default=""):
    try:
        a = input(q).strip()
        return a or default
    except (EOFError, KeyboardInterrupt):
        return default


def first_setup(cfg, args):
    print()
    print("  ◉ CAPRI MUSICA · prima configurazione")
    print("  Capri leggerà le canzoni da questa cartella (anche le sottocartelle).")
    d = ask(f"  Cartella della musica [{cfg['folders'][0]}]: ", cfg["folders"][0]).strip('"')
    while not os.path.isdir(d):
        d = ask("  Cartella non trovata, riprova: ", cfg["folders"][0]).strip('"')
    cfg["folders"] = [d]
    if IS_WIN:
        a = ask("  Avviare Capri Musica da solo quando accendi il PC? [S/n]: ", "s").lower()
        cfg["autostart"] = not a.startswith("n")
        try:
            set_autostart(cfg["autostart"])
            if cfg["autostart"]:
                print("  ✓ Partirà in automatico, senza finestre, a ogni accensione.")
        except Exception as e:
            print("  Non sono riuscito a impostare l'avvio automatico:", e)
    cfg["setup"] = True
    save_json(CFG_FILE, cfg)
    print()


def main():
    global LIB, QUIET, SUPA_URL, SUPA_KEY, MUSIC_KEY, SITE
    args = sys.argv[1:]
    opt = lambda name: args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else None
    if "--avvio" in args or (IS_WIN and os.path.basename(sys.executable).lower() == "pythonw.exe"):
        QUIET = True
    cfg = load_json(CFG_FILE, {})
    for flag, k in (("--chiave", "chiave"), ("--supabase", "supabase"), ("--pk", "pk"), ("--sito", "sito"), ("--nome", "nome")):
        if opt(flag):
            cfg[k] = opt(flag)
            save_json(CFG_FILE, cfg)
    if MUSIC_KEY.startswith("__") and cfg.get("chiave"):
        MUSIC_KEY = cfg["chiave"]
    if SUPA_URL.startswith("__") and cfg.get("supabase"):
        SUPA_URL = cfg["supabase"]
    if SUPA_KEY.startswith("__") and cfg.get("pk"):
        SUPA_KEY = cfg["pk"]
    if SITE.startswith("__") and cfg.get("sito"):
        SITE = cfg["sito"]
    if "--locale" in args:
        SUPA_URL = ""  # Capri Server sul tablet: niente cloud, niente collegamento esterno
    if cfg.get("nome"):
        DEVICE["name"] = cfg["nome"]
    elif IS_TERMUX:
        try:
            model = subprocess.run(["getprop", "ro.product.model"], capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            model = ""
        DEVICE["name"] = ("Tablet " + model).strip() if model else "Tablet Android"
    if MUSIC_KEY.startswith("__") or len(MUSIC_KEY) < 32:
        print("Questo file non contiene la tua chiave: scaricalo da Capri (sezione Musica → Collega il PC).")
        if not QUIET:
            ask("Premi Invio per chiudere.")
        return
    if IS_TERMUX:
        try:
            subprocess.Popen(["termux-wake-lock"])
        except Exception:
            pass
        shared = os.path.join(os.path.expanduser("~"), "storage", "shared")
        for i in range(60):
            if os.path.isdir(shared):
                break
            if i == 0:
                log("Aspetto il permesso per leggere la memoria del tablet (tocca Consenti)…")
            time.sleep(2)
    cfg.setdefault("folders", [default_music_dir()])
    cfg.setdefault("port", 47123)
    if opt("--cartella"):
        cfg["folders"] = [opt("--cartella")]
        cfg["setup"] = True
        save_json(CFG_FILE, cfg)
    interactive = not QUIET and sys.stdin is not None and sys.stdin.isatty()
    if "--cambia" in args or (not cfg.get("setup") and interactive):
        first_setup(cfg, args)
    elif interactive and IS_WIN:
        try:
            import msvcrt
            print("  Cartella della musica:", "; ".join(cfg["folders"]))
            print("  Premi C entro 4 secondi per cambiarla…", flush=True)
            t_end = time.time() + 4
            while time.time() < t_end:
                if msvcrt.kbhit() and msvcrt.getwch().lower() == "c":
                    first_setup(cfg, args)
                    break
                time.sleep(0.05)
        except Exception:
            pass
    if "--imposta-avvio" in args:
        cfg["autostart"] = True
        try:
            set_autostart(True)
            save_json(CFG_FILE, cfg)
        except Exception as e:
            log("Avvio automatico non impostato:", e)
    if "--togli-avvio" in args:
        set_autostart(False)
        print("Avvio automatico tolto.")
        return
    port = int(opt("--porta") or cfg["port"])
    # già in esecuzione?
    def running():
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/ping", timeout=2) as r:
                return bool(json.loads(r.read()).get("capri"))
        except Exception:
            return False
    if running():
        if "--riavvia" in args:
            e = int(time.time()) + 300
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/quit/x?e={e}&s={sign('quit.x', e)}", timeout=5).read()
            except Exception:
                pass
            for _ in range(20):
                time.sleep(0.5)
                if not running():
                    break
        if running():
            log("Capri Musica è già acceso su questo dispositivo.")
            if not QUIET:
                ask("Premi Invio per chiudere.")
            return

    if not QUIET:
        print("\n  ◉ CAPRI MUSICA", VERSION)
        print("  Cartella:", "; ".join(cfg["folders"]))
        print("  Lascia aperta questa finestra (puoi ridurla a icona). Per chiudere: Ctrl+C.\n")
    LIB = Library(cfg["folders"])
    LIB.scan()

    httpd = None
    for p in range(port, port + 20):
        try:
            httpd = ThreadingHTTPServer(("127.0.0.1", p), Handler)
            port = p
            break
        except OSError:
            continue
    if not httpd:
        log("⚠ Nessuna porta libera.")
        return
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    log(f"Pronto su http://127.0.0.1:{port}")

    state = {"url": None, "last": 0}
    lock = threading.Lock()

    def on_url(u):
        with lock:
            state["url"] = u
        if u:
            log("✓ Collegato:", u)
            log("✓ Ora apri Capri → Musica, anche dal telefono.")
        if heartbeat(u):
            state["last"] = time.time()

    tunnel = None
    if "--senza-tunnel" in args or "--locale" in args:
        on_url(opt("--url") or f"http://127.0.0.1:{port}")
    else:
        tunnel = Tunnel(port, on_url)
        tunnel.start()

    last_scan = time.time()
    purge_trash()
    try:
        while not STOP.is_set():
            STOP.wait(5)
            now = time.time()
            if now - last_scan > 600:
                last_scan = now
                LIB.scan()
                purge_trash()
                state["last"] = 0
            if state["url"] and now - state["last"] > 60:
                if heartbeat(state["url"]):
                    state["last"] = now
                else:
                    state["last"] = now - 30  # riprova tra 30 s
    except KeyboardInterrupt:
        log("Chiudo…")
    finally:
        if tunnel:
            tunnel.close()
        heartbeat(None)
        httpd.shutdown()


if __name__ == "__main__":
    main()
