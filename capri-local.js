/* Capri locale: al posto di Supabase parla con Capri Server sul tuo dispositivo.
   Offre le stesse funzioni che il sito usava (dati, accesso, allegati, tempo reale), così la grafica resta identica. */
(function (g) {
  'use strict';
  const H = { 'X-Capri': '1' };
  async function call(method, url, body, raw) {
    const opt = { method, headers: { ...H }, credentials: 'same-origin', cache: 'no-store' };
    if (body !== undefined) {
      if (raw) { opt.body = body; if (raw !== true) opt.headers['Content-Type'] = raw; }
      else { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
    }
    let r;
    try { r = await fetch(url, opt); } catch (e) { return { data: null, error: { message: 'Failed to fetch: il server di Capri non risponde (tablet acceso? Tailscale attivo?)' } }; }
    let j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok) return { data: null, error: { message: (j && (j.message || j.error)) || ('errore ' + r.status), status: r.status, code: r.status === 401 ? 'PGRST301' : String(r.status) } };
    return { data: j, error: null };
  }
  function query() {
    const q = { _eq: {}, _from: 0, _to: null, _sel: '' };
    const self = {
      select(s) { q._sel = s; return self; },
      eq(k, v) { q._eq[k] = v; return self; },
      order() { return self; },
      range(a, b) { q._from = a; q._to = b; return self; },
      upsert(row) { return call('PUT', `api/docs/${encodeURIComponent(row.coll)}/${encodeURIComponent(row.id)}`, { data: row.data }); },
      delete() { q._del = true; return self; },
      then(ok, ko) {
        let p;
        if (q._del) p = call('DELETE', `api/docs/${encodeURIComponent(q._eq.coll)}/${encodeURIComponent(q._eq.id)}`);
        else {
          const u = new URLSearchParams({ from: q._from }); if (q._to != null) u.set('to', q._to); if (q._eq.coll) u.set('coll', q._eq.coll);
          p = call('GET', 'api/docs?' + u);
        }
        return p.then(ok, ko);
      },
    };
    return self;
  }
  const fileUrl = (p, dl) => 'api/file/' + p.split('/').map(encodeURIComponent).join('/') + (dl ? '?download=' + encodeURIComponent(dl) : '');
  const storage = {
    from() {
      return {
        async upload(p, f) { const r = await call('POST', 'api/files?path=' + encodeURIComponent(p), f, true); return r.error ? r : { data: { path: p }, error: null }; },
        async createSignedUrls(ps) { return { data: ps.map((p) => ({ path: p, signedUrl: new URL(fileUrl(p), location.href).href })), error: null }; },
        async createSignedUrl(p, ttl, o) { return { data: { signedUrl: new URL(fileUrl(p, o && o.download), location.href).href }, error: null }; },
        async remove(ps) { return call('POST', 'api/files/delete', { paths: ps }); },
      };
    },
  };
  let user = null;
  const subs = [];
  const auth = {
    async getSession() {
      const r = await call('GET', 'api/session');
      if (r.error) return r.error.status === 401 ? { data: { session: null }, error: null } : { data: { session: null }, error: r.error };
      user = r.data.user; return { data: { session: { user } }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const r = await call('POST', 'api/login', { email, password });
      if (r.error) return r;
      user = r.data.user; return { data: { session: { user }, user }, error: null };
    },
    async signOut(o) { await call('POST', 'api/logout', { all: !!(o && o.scope === 'global') }); user = null; return { error: null }; },
    async updateUser({ password }) { return call('POST', 'api/password', { password }); },
    mfa: {
      async getAuthenticatorAssuranceLevel() { return { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null }; },
      async listFactors() { return { data: { all: [], totp: [] }, error: null }; },
      async enroll() { return { data: null, error: { message: 'non serve in locale: entrano solo i tuoi dispositivi collegati a Tailscale' } }; },
      async challengeAndVerify() { return { data: null, error: { message: 'non disponibile' } }; },
      async unenroll() { return { data: null, error: null }; },
    },
    async signInWithPasskey() { return { data: null, error: { message: 'Face ID non disponibile in locale' } }; },
    async registerPasskey() { return { data: null, error: { message: 'Face ID non disponibile in locale' } }; },
    passkey: { async list() { return { data: [], error: null }; }, async update() { return { error: null }; }, async delete() { return { error: null }; } },
  };
  function channel() {
    const ch = {
      on(type, filter, cb) { subs.push(cb); return ch; },
      subscribe() {
        if (g.__capriES) return ch;
        const open = () => {
          const es = new EventSource('api/events');
          g.__capriES = es;
          es.onmessage = (m) => { let ev; try { ev = JSON.parse(m.data); } catch (e) { return; } subs.forEach((f) => { try { f(ev); } catch (e) {} }); };
          es.onerror = () => { if (es.readyState === 2) setTimeout(open, 5000); };
        };
        open(); return ch;
      },
    };
    return ch;
  }
  g.CapriLocal = {
    createClient() {
      return {
        from: query, storage, auth, channel,
        async rpc(name, args) { return call('POST', 'api/rpc/' + encodeURIComponent(name), args || {}); },
      };
    },
  };
})(window);
