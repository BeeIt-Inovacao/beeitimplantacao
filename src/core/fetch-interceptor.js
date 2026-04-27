// src/core/fetch-interceptor.js — Sprint 5
// Monkey-patch de window.fetch:
//   1. Detecta chamadas diretas ao Protheus (beeit207327.protheus.cloudtotvs.com.br)
//   2. Reescreve a URL para a Edge Function do Supabase
//   3. Remove Authorization: Basic (credenciais ficam no Vault server-side)
//   4. Injeta Authorization: Bearer <supabase_jwt> + apikey
//
// Instalação: incluído automaticamente por scripts/build-modules.js antes do
// primeiro <script> do HTML. Zero dependências externas.
(function () {
  'use strict';

  if (window.__beeitFetchInterceptorInstalled) return;
  window.__beeitFetchInterceptorInstalled = true;

  var EDGE_BASE = window.BEEIT_EDGE_URL || 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
  var PROTHEUS_DIRECT_RE = /^https?:\/\/beeit207327\.protheus\.cloudtotvs\.com\.br(?::\d+)?/i;

  var origFetch = window.fetch.bind(window);

  function resolveUrl(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input && typeof input.url === 'string') return input.url; // Request object
    return '';
  }

  function getSupabaseJWT() {
    try {
      if (window.beeitSession && window.beeitSession.access_token) {
        return Promise.resolve(window.beeitSession.access_token);
      }
      if (window.supabase && window.supabase.auth && window.supabase.auth.getSession) {
        return window.supabase.auth.getSession().then(function (result) {
          var session = result && result.data && result.data.session;
          return session ? session.access_token : null;
        });
      }
    } catch (_) {}
    return Promise.resolve(null);
  }

  window.fetch = function interceptedFetch(input, init) {
    var url = resolveUrl(input);
    var targetsProtheusDirect = PROTHEUS_DIRECT_RE.test(url);
    var targetsEdgeProxy = url.indexOf('/protheus-proxy/') !== -1;

    if (!targetsProtheusDirect && !targetsEdgeProxy) {
      return origFetch(input, init);
    }

    return getSupabaseJWT().then(function (jwt) {
      // Normalize headers: collect from Request object + init, init wins.
      var srcHeaders = (init && init.headers)
        ? init.headers
        : (input && typeof input === 'object' && input.headers ? input.headers : undefined);
      var headers = new Headers(srcHeaders || {});

      var newUrl = url;

      if (targetsProtheusDirect) {
        newUrl = url.replace(PROTHEUS_DIRECT_RE, EDGE_BASE + '/protheus');
        headers.delete('Authorization'); // Basic <user:pass> nunca sai do browser
        console.debug('[fetch-interceptor] direct→proxy:', url, '→', newUrl);
      }

      if (!headers.has('Authorization') && jwt) {
        headers.set('Authorization', 'Bearer ' + jwt);
      }
      if (!headers.has('apikey') && window.SUPABASE_ANON_KEY) {
        headers.set('apikey', window.SUPABASE_ANON_KEY);
      }

      var newInit = Object.assign({}, init || {}, { headers: headers });

      // Reconstrói Request se necessário para preservar method/body/mode.
      if (input && typeof input === 'object' && typeof input.url === 'string') {
        return origFetch(new Request(newUrl, Object.assign({
          method: input.method,
          body: input.body,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          integrity: input.integrity,
        }, newInit)), undefined);
      }

      return origFetch(newUrl, newInit);
    });
  };

  console.debug('[fetch-interceptor] installed — Edge:', EDGE_BASE);
}());
