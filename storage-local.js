/* GitHub Pages transport. Case data stays in this browser's localStorage. */
(() => {
  'use strict';
  const prefix = 'pedigrees.family.';
  const messages = {
    invalid: ['Solicitud o identificador de familia no válido.', 'Invalid request or family identifier.'],
    missing: ['No existe el caso.', 'Case not found.'],
    conflict: ['El caso ya existe o ha cambiado en otra pestaña. Conserva tus cambios y vuelve a cargarlo.', 'The case already exists or changed in another tab. Keep your changes and reload it.'],
    unavailable: ['El almacenamiento seguro requiere HTTPS y un navegador compatible con Web Locks.', 'Safe storage requires HTTPS and a browser supporting Web Locks.'],
    storage: ['No se pudo acceder al almacenamiento local. Comprueba permisos y espacio; exporta una copia JSON.', 'Could not access local storage. Check permissions and space; export a JSON backup.']
  };
  const error = (key, status = 400) => Object.assign(new Error(key), { status });
  const response = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
  const idOf = value => {
    const id = typeof value === 'string' ? value.trim() : '';
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(id)) throw error('invalid');
    return id;
  };
  const revision = async raw => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))), n => n.toString(16).padStart(2, '0')).join('');
  async function request(url, options = {}) {
    try {
      const query = new URL(url, location.href).searchParams;
      const action = query.get('action');
      if (action === 'list') {
        const families = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key.startsWith(prefix)) continue;
          const family = JSON.parse(localStorage.getItem(key));
          families.push({family_id: family.family_id || key.slice(prefix.length), indication: family.indication || '', reviewed: family.review_status?.reviewed === true, reviewed_at: family.review_status?.reviewed_at || '', modified: family.updated_at || ''});
        }
        families.sort((a, b) => a.family_id.localeCompare(b.family_id));
        return response({ok: true, families});
      }
      if (action === 'load') {
        const raw = localStorage.getItem(prefix + idOf(query.get('id')));
        if (raw === null) throw error('missing', 404);
        return response({ok: true, family: JSON.parse(raw), revision: await revision(raw)});
      }
      if (!['save', 'delete'].includes(action) || options.method !== 'POST') throw error('invalid');
      if (!navigator.locks || !crypto.subtle) throw error('unavailable', 503);
      const family = JSON.parse(options.body);
      const id = idOf(family.family_id);
      if (action === 'save' && (!Array.isArray(family.people) || !Array.isArray(family.relationships))) throw error('invalid');
      return await navigator.locks.request('pedigrapp-local-storage-write', async () => {
        const key = prefix + id;
        const previous = localStorage.getItem(key);
        if (action === 'delete') {
          if (previous === null) throw error('missing', 404);
          localStorage.removeItem(key);
          return response({ok: true, family_id: id});
        }
        const expected = new Headers(options.headers).get('X-PedigrAPP-Revision');
        if (query.get('create') === '1' ? previous !== null : expected && (previous === null || await revision(previous) !== expected)) throw error('conflict', 409);
        family.family_id = id;
        family.updated_at = new Date().toISOString();
        const raw = JSON.stringify(family, null, 2) + '\n';
        const nextRevision = await revision(raw);
        localStorage.setItem(key, raw);
        return response({ok: true, family_id: id, updated_at: family.updated_at, revision: nextRevision});
      });
    } catch (err) {
      const key = Object.hasOwn(messages, err.message) ? err.message : 'storage';
      const en = window.PedigrAPPi18n?.current() === 'en';
      return response({ok: false, error: messages[key][en ? 1 : 0]}, err.status || 500);
    }
  }
  window.PedigrAPPLocalStorage = Object.freeze({request});
})();
