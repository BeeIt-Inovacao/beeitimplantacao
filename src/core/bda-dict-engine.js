// src/core/bda-dict-engine.js — Sprint IP-1: Isolamento de PI do Motor de Dicionários
// Motor de dicionários BeeIT: extração de blueprints Protheus, persistência de
// snapshots no Supabase e Drawer de inspeção de metadados estilo Swagger-UI.
//
// Dependências de runtime (globals do monólito):
//   beeitSession     — sessão Supabase autenticada
//   beeitSbFetch     — wrapper autenticado para REST Supabase
//   beeitProgress    — barra de progresso multi-etapa
//   toast            — notificações toast
//   BEEIT_SB_KEY     — Supabase anon key (definida no HTML)
//   window.BEEIT_EDGE_URL — injetado por dev-server.js (dev) ou configuração prod
//
// API pública exposta em window.*:
//   fetchDictBlueprint(aliases)   — extrai e persiste blueprint via Edge Function
//   checkDictSnapshots()          — verifica snapshots existentes para aliases monitorados
//   _refreshDictBadges()          — atualiza badges de status nos cards do DOM
//   openDictDrawer(alias)         — abre drawer de inspeção estilo Swagger
//   closeDictDrawer()             — fecha drawer
//   _dictDrawerFilter(q)          — filtra campos (oninput)
//   _dictDrawerCopyJson()         — copia JSON dos campos para clipboard
//   _dictDrawerToggleRules(idx)   — expande/recolhe painel de regras de um campo
(function () {
  'use strict';

  // ── Helpers privados ──────────────────────────────────────────────────

  function _beeitTenantIdFromJWT() {
    try {
      const payload = JSON.parse(atob(
        (beeitSession?.access_token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      ));
      return payload.tenant_id || null;
    } catch { return null; }
  }

  async function _sha256hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Aliases monitorados e estado de snapshot ──────────────────────────

  const _DICT_TRACKED_ALIASES = ['SA1','SA2','SB1','CT1','CTT','CT5','SED','SE4','SE1','SE2','SA6','SEE','SF4','SB9','SN1','SN3','CVE','CVF','CTS','CT2','SF5','SG1','SRV','SRJ','SR6','SRA','SR3','SRF','SRG','SP4','SP9'];

  async function checkDictSnapshots() {
    try {
      const rows = await beeitSbFetch(
        '/rest/v1/protheus_dict_snapshot?select=sx2_alias,campos,updated_at&sx2_alias=in.(' + _DICT_TRACKED_ALIASES.join(',') + ')'
      );
      window._dictSnapshotStatus = {};
      if (Array.isArray(rows)) {
        rows.forEach(r => {
          window._dictSnapshotStatus[r.sx2_alias] = {
            hasData: Array.isArray(r.campos) && r.campos.length > 0,
            updatedAt: r.updated_at,
            campos: r.campos
          };
        });
      }
    } catch (e) { window._dictSnapshotStatus = window._dictSnapshotStatus || {}; }
  }

  function _refreshDictBadges() {
    const ok = '<span style="background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.35);color:#34d399;border-radius:10px;padding:2px 7px;font-size:8px;font-weight:700;">\u{1F7E2} Atualizado</span>';
    const no = '<span style="background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);color:#fbbf24;border-radius:10px;padding:2px 7px;font-size:8px;font-weight:700;">\u{1F7E1} Sem dados</span>';
    _DICT_TRACKED_ALIASES.forEach(alias => {
      const s = window._dictSnapshotStatus?.[alias];
      const html = s?.hasData ? ok : no;
      const elOld = document.getElementById('dict-snap-badge-' + alias);
      if (elOld) elOld.innerHTML = html;
      const elHdr = document.getElementById('sync-st-' + alias + '-hdr');
      if (elHdr) elHdr.innerHTML = html;
    });
  }

  // ── fetchDictBlueprint: extração e persistência ───────────────────────

  async function fetchDictBlueprint(aliases) {
    const EDGE = window.BEEIT_EDGE_URL || 'https://dbaqvoatopfquaqgdptk.supabase.co/functions/v1/protheus-proxy';
    const el = document.getElementById('sync-blueprint-status');
    const syncBtn = document.getElementById('sync-cadastros-btn');
    if (syncBtn) { syncBtn.textContent = '⏳ Sincronizando...'; syncBtn.disabled = true; syncBtn.style.opacity = '.6'; }
    if (el) el.innerHTML = '<span style="color:#60a5fa;">\u{1F504} Buscando dicionário ' + aliases.join('/') + '...</span>';
    if (typeof beeitProgress !== 'undefined') beeitProgress.start([
      'Consultando cadastros ' + aliases.join(', ') + '…',
      'Aguardando resposta do Protheus…',
      'Retornando blueprint dos campos…',
      'Validando estrutura e calculando hash…',
      'Gravando snapshot no banco…'
    ]);
    try {
      const r = await fetch(EDGE + '/protheus/api/v1/bda/dictionary/blueprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (beeitSession?.access_token || ''),
          'apikey': BEEIT_SB_KEY
        },
        body: JSON.stringify({
          aliases,
          options: { scope: 'MANDATORY_AND_KEYS', include_custom: true, include_f3_combo: true, include_mock: true }
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' — Falha na comunicação com o backend (Edge/Protheus). Verifique credenciais e URL em Configurações.');
      const data = await r.json();
      const tenantId = _beeitTenantIdFromJWT();
      const userId = beeitSession?.user?.id;
      if (tenantId && userId && data?.blueprint) {
        const upserts = [];
        window._protheusBlueprintFull = window._protheusBlueprintFull || {};
        for (const alias of aliases) {
          const bp = data.blueprint[alias];
          if (!bp?.campos?.length) continue;
          const canonStr = JSON.stringify(bp.campos.map(c =>
            Object.fromEntries(Object.entries(c).sort(([a], [b]) => a.localeCompare(b)))
          ));
          const hash = await _sha256hex(canonStr);
          upserts.push({
            tenant_id: tenantId, user_id: userId,
            sx2_alias: alias.toUpperCase().slice(0, 3),
            rotina_padrao: bp.rotina_padrao || null,
            arquitetura: bp.arquitetura || null,
            chave_unica: bp.chave_unica || null,
            scope: 'MANDATORY_AND_KEYS',
            campos: bp.campos,
            campos_hash: hash
          });
          const aliasUp = alias.toUpperCase().slice(0, 3);
          window._protheusBlueprintFull[aliasUp] = { ...bp, _cachedAt: Date.now() };
          try { localStorage.setItem('beeit_blueprint_' + aliasUp, JSON.stringify(window._protheusBlueprintFull[aliasUp])); } catch (e) {}
        }
        if (upserts.length) {
          await beeitSbFetch('/rest/v1/protheus_dict_snapshot', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(upserts)
          });
          await checkDictSnapshots();
          _refreshDictBadges();
        }
      }
      window._protheusBlueprintSA1SB1 = data; // compat legado
      if (el) el.innerHTML = '<span style="color:#34d399;">✅ Dicionário ' + aliases.join('/') + ' sincronizado</span>';
      if (typeof beeitProgress !== 'undefined') beeitProgress.done(true, '✅ Dicionário ' + aliases.join(', ') + ' salvo com sucesso!');
      if (typeof toast === 'function') toast('✅ Dicionário ' + aliases.join('+') + ' salvo no banco');
      return data;
    } catch (e) {
      if (el) el.innerHTML = '<span style="color:#f87171;">❌ ' + e.message + '</span>';
      if (typeof beeitProgress !== 'undefined') beeitProgress.done(false, '❌ ' + e.message.slice(0, 70));
      if (typeof toast === 'function') toast('❌ Blueprint: ' + e.message.slice(0, 60));
      return null;
    } finally {
      const b = document.getElementById('sync-cadastros-btn');
      if (b) { b.textContent = '\u{1F504} Sincronizar Cadastros'; b.disabled = false; b.style.opacity = '1'; }
    }
  }

  // ── Drawer: estado privado ────────────────────────────────────────────

  var _ddAlias = '', _ddCampos = [], _ddBp = null;

  const _DD_ICONS = {
    SA1: '\u{1F465}', SA2: '\u{1F3ED}', SB1: '\u{1F4E6}', CT1: '\u{1F4CA}', CTT: '\u{1F3E2}', SED: '\u{1F4B9}',
    SE1: '\u{1F4E5}', SE2: '\u{1F4E4}', SA6: '\u{1F3E6}', SEE: '\u{1F4B1}', SF4: '\u{1F69A}', SB9: '\u{1F4CB}',
    SN1: '\u{1F3D7}️', SN3: '\u{1F4D0}', CT2: '\u{1F4D2}', CVF: '\u{1F5C2}️', CTS: '\u{1F4D1}'
  };

  window._protheusBlueprintFull = window._protheusBlueprintFull || {};
  Object.keys(_DD_ICONS).forEach(function (a) {
    if (window._protheusBlueprintFull[a]) return;
    try {
      var raw = localStorage.getItem('beeit_blueprint_' + a);
      if (raw) window._protheusBlueprintFull[a] = JSON.parse(raw);
    } catch (e) {}
  });

  function _stripQuotes(s) {
    if (typeof s !== 'string') return s;
    return s.replace(/^['"]|['"]$/g, '').trim();
  }

  function _mockVal(c) {
    const init = _stripQuotes(c.relacao || '');
    if (init && !/[()]/.test(init)) return init;
    const t = c.tipo || 'C';
    if (t === 'N') return c.decimal > 0 ? 1234.56 : 1;
    if (t === 'D') return '20260101';
    if (t === 'L') return '1';
    if (t === 'M') return 'Observação de exemplo';
    const tam = c.tamanho || 10;
    const cn = (c.campo || '').toUpperCase();
    if (cn.endsWith('COD') || cn.endsWith('CODIGO')) return '000001';
    if (cn.endsWith('NOME') || cn.endsWith('RAZAO')) return 'EMPRESA EXEMPLO LTDA';
    if (cn.endsWith('CGC') || cn.endsWith('CNPJ')) return '12.345.678/0001-99';
    if (cn.endsWith('CEP')) return '01310-100';
    if (cn.endsWith('EMAIL')) return 'contato@exemplo.com.br';
    return 'EXEMPLO'.slice(0, tam);
  }

  function _parseCombo(s) {
    if (!s) return [];
    return String(s).split(';').map(function (p) {
      const ix = p.indexOf('=');
      if (ix < 0) return null;
      return { key: p.slice(0, ix).trim(), desc: p.slice(ix + 1).trim() };
    }).filter(Boolean);
  }

  function _naturalDesc(bp, alias) {
    if (!bp) return '';
    const desc = bp.descricao || alias;
    const modo = bp.modo_banco === 'E' ? 'exclusivo por filial' : 'compartilhado entre filiais';
    const arq = bp.arquitetura === 'MVC' ? 'MVC (modelo padrão moderno)' : (bp.arquitetura === 'ExecAuto' ? 'ExecAuto (automação por rotina padrão)' : (bp.arquitetura || '-'));
    const total = (bp.campos || []).length;
    const obrig = (bp.campos || []).filter(function (c) { return c.obrigat; }).length;
    const keys = (bp.campos || []).filter(function (c) { return c.is_key; }).map(function (c) { return c.campo; }).join(' + ');
    return ''
      + '<p style="margin:0 0 8px;">O cadastro de <strong style="color:#38D4F5;">' + desc + '</strong> '
      + 'utiliza arquitetura <strong>' + arq + '</strong> com acesso <strong>' + modo + '</strong> '
      + 'entre as filiais do Protheus.</p>'
      + '<p style="margin:0 0 8px;">Possui <strong>' + total + ' campos</strong> mapeados, dos quais '
      + '<strong style="color:#f87171;">' + obrig + ' são obrigatórios</strong> '
      + 'para que o registro seja persistido no ERP.</p>'
      + '<p style="margin:0;">Chave única: <code style="color:#fbbf24;">' + (bp.chave_unica || '-') + '</code>'
      + (keys ? ' · campos-chave: <code>' + keys + '</code>' : '') + '. '
      + 'Tabela física: <code>' + (bp.tabela_fisica || '-') + '</code>. '
      + 'Rotina padrão: <code>' + (bp.rotina_padrao || '-') + '</code>.</p>';
  }

  // ── openDictDrawer / closeDictDrawer ──────────────────────────────────

  window.openDictDrawer = function (alias) {
    _ddAlias = alias;
    const snap    = window._dictSnapshotStatus?.[alias];
    const fullBp  = window._protheusBlueprintFull?.[alias];
    const drawer  = document.getElementById('dict-drawer');
    const overlay = document.getElementById('dict-drawer-overlay');
    const title   = document.getElementById('dict-drawer-title');
    const sub     = document.getElementById('dict-drawer-sub');
    const icon    = document.getElementById('dict-drawer-icon');
    const body    = document.getElementById('dict-drawer-body');
    const search  = document.getElementById('dict-drawer-search');
    if (!drawer) return;

    _ddBp = fullBp || (snap?.hasData ? {
      campos: snap.campos || [],
      descricao: alias,
      rotina_padrao: '-', arquitetura: '-', chave_unica: '-', tabela_fisica: '-', modo_banco: 'C'
    } : null);

    const descricao = _ddBp?.descricao || alias;
    const EDGE_PATH = '/api/v1/bda/dynamic';

    icon.textContent = _DD_ICONS[alias] || '\u{1F4D6}';
    title.innerHTML  = '<strong style="color:#38D4F5;">' + alias + '</strong> <span style="color:var(--txt3,#6b7280);font-weight:400;">— ' + descricao + '</span>';
    sub.innerHTML    = '<span style="background:rgba(52,211,153,.18);color:#34d399;border-radius:4px;padding:1px 7px;font-size:9px;font-weight:700;font-family:monospace;">POST</span>'
      + '<span style="color:#6b7280;font-size:9px;margin-left:5px;font-family:monospace;">' + EDGE_PATH + '</span>';

    if (!_ddBp) {
      sub.innerHTML += ' <span style="color:#fbbf24;font-size:9px;">· sem snapshot</span>';
      body.innerHTML = '<div style="color:#fbbf24;padding:20px 0;font-size:11px;">\u{1F7E1} Nenhum snapshot encontrado para ' + alias + '.<br><br>Clique em <strong>\u{1F504} Sincronizar Cadastros</strong> para buscar o dicionário do Protheus.</div>';
      _ddCampos = [];
    } else {
      _ddCampos = _ddBp.campos || [];
      const dt = snap?.updatedAt ? new Date(snap.updatedAt) : null;
      sub.innerHTML += ' <span style="color:#6b7280;font-size:9px;">· ' + _ddCampos.length + ' campos' + (dt ? ' · ' + dt.toLocaleString('pt-BR') : '') + '</span>';
      _renderSwaggerBody(_ddBp, alias);
    }

    if (search) search.value = '';
    overlay.style.display = 'block';
    drawer.style.display   = 'flex';
    requestAnimationFrame(() => { drawer.style.transform = 'translateX(0)'; });
  };

  window.closeDictDrawer = function () {
    const drawer  = document.getElementById('dict-drawer');
    const overlay = document.getElementById('dict-drawer-overlay');
    if (!drawer) return;
    drawer.style.transform = 'translateX(100%)';
    setTimeout(() => {
      drawer.style.display  = 'none';
      overlay.style.display = 'none';
    }, 290);
  };

  window._dictDrawerFilter = function (q) {
    if (!_ddCampos.length) return;
    const filtered = q
      ? _ddCampos.filter(c => {
          const s = (c.campo || '') + (c.titulo || '') + (c.tipo || '');
          return s.toLowerCase().includes(q.toLowerCase());
        })
      : _ddCampos;
    _renderSchemaRows(filtered, document.getElementById('dict-drawer-schema-rows'));
  };

  window._dictDrawerCopyJson = function () {
    try {
      navigator.clipboard.writeText(JSON.stringify(_ddCampos, null, 2));
      if (typeof toast === 'function') toast('\u{1F4CB} JSON copiado — ' + _ddCampos.length + ' campos');
    } catch (e) {}
  };

  // ── Renderização do corpo do Drawer (Swagger-style) ───────────────────

  function _renderSwaggerBody(bp, alias) {
    const body = document.getElementById('dict-drawer-body');
    if (!body) return;
    const campos = bp.campos || [];

    const naturalHtml = _naturalDesc(bp, alias);

    const modoBancoLabel = bp.modo_banco === 'E'
      ? '<span style="color:#fbbf24;font-weight:700;">E</span> <span style="color:var(--txt3);">(Exclusivo por filial)</span>'
      : '<span style="color:#34d399;font-weight:700;">C</span> <span style="color:var(--txt3);">(Compartilhado)</span>';

    const metaHtml = '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;padding:10px 12px;'
      + 'background:#0d1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:10px;">'
      + '<span style="color:#6b7280;">Descrição</span>      <span style="color:#e6edf3;">' + (bp.descricao || '-') + '</span>'
      + '<span style="color:#6b7280;">Tabela física</span>  <code style="color:#fbbf24;">' + (bp.tabela_fisica || '-') + '</code>'
      + '<span style="color:#6b7280;">Rotina padrão</span>  <code style="color:#a78bfa;">' + (bp.rotina_padrao || '-') + '</code>'
      + '<span style="color:#6b7280;">Arquitetura</span>    <span style="color:#e6edf3;">' + (bp.arquitetura || '-') + '</span>'
      + '<span style="color:#6b7280;">Chave única</span>    <code style="color:#34d399;">' + (bp.chave_unica || '-') + '</code>'
      + '<span style="color:#6b7280;">Modo de banco</span>  <span>' + modoBancoLabel + '</span>'
      + '</div>';

    const reqPayload = JSON.stringify({
      aliases: [alias],
      options: { scope: 'MANDATORY_AND_KEYS', include_custom: true, include_mock: true }
    }, null, 2);

    const mockSeed = bp.mock || {};
    const mockObj = {};
    campos.forEach(c => {
      const seedVal = mockSeed[c.campo];
      mockObj[c.campo] = (seedVal !== undefined && seedVal !== '') ? seedVal : _mockVal(c);
    });
    const mockJson = JSON.stringify({ status: 'success', data: [mockObj] }, null, 2);

    body.innerHTML = ''
      + '<!-- Seção 0: Detalhes da Tabela -->'
      + '<div style="margin-bottom:14px;">'
      + '<div style="font-size:10px;font-weight:700;color:#fbbf24;margin-bottom:6px;display:flex;align-items:center;gap:6px;">'
      + '<span style="background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.3);border-radius:4px;padding:1px 8px;">\u{1F4CA} Detalhes da Tabela</span>'
      + '</div>'
      + '<div style="background:rgba(251,191,36,.04);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:10px 12px;font-size:10px;color:#111827;line-height:1.55;margin-bottom:8px;">'
      + naturalHtml
      + '</div>'
      + metaHtml
      + '</div>'
      + '<!-- Seção 1: Request Payload -->'
      + '<div style="margin-bottom:14px;">'
      + '<div style="font-size:10px;font-weight:700;color:#60a5fa;margin-bottom:6px;display:flex;align-items:center;gap:6px;">'
      + '<span style="background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.3);border-radius:4px;padding:1px 8px;">\u{1F4E8} Request — Payload</span>'
      + '</div>'
      + '<pre style="background:#0d1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px;margin:0;font-size:10px;color:#e6edf3;font-family:monospace;overflow-x:auto;line-height:1.6;white-space:pre-wrap;">' + reqPayload + '</pre>'
      + '</div>'
      + '<!-- Seção 2: Response Schema -->'
      + '<div style="margin-bottom:14px;">'
      + '<div style="font-size:10px;font-weight:700;color:#a78bfa;margin-bottom:6px;display:flex;align-items:center;gap:6px;">'
      + '<span style="background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3);border-radius:4px;padding:1px 8px;">\u{1F4CB} Response — Schema de Campos &amp; Regras</span>'
      + '<span style="color:#6b7280;font-size:9px;font-weight:400;">clique em um campo para expandir</span>'
      + '</div>'
      + '<div style="background:#0d1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden;">'
      + '<div style="display:grid;grid-template-columns:130px 36px 58px 1fr;gap:6px;padding:6px 10px;font-size:9px;color:#6b7280;border-bottom:1px solid rgba(255,255,255,.06);font-weight:700;letter-spacing:.04em;">'
      + '<span>CAMPO</span><span style="text-align:center;">TIPO</span><span style="text-align:right;">TAM</span><span>TÍTULO / FLAGS</span>'
      + '</div>'
      + '<div id="dict-drawer-schema-rows" style="max-height:380px;overflow-y:auto;"></div>'
      + '</div>'
      + '</div>'
      + '<!-- Seção 3: Mock Data -->'
      + '<div>'
      + '<div style="font-size:10px;font-weight:700;color:#34d399;margin-bottom:6px;display:flex;align-items:center;gap:6px;">'
      + '<span style="background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.3);border-radius:4px;padding:1px 8px;">\u{1F9EA} Mock — Exemplo de Resposta</span>'
      + '</div>'
      + '<pre style="background:#0d1117;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px;margin:0;font-size:10px;color:#e6edf3;font-family:monospace;overflow-x:auto;line-height:1.6;white-space:pre-wrap;">' + mockJson + '</pre>'
      + '</div>';

    _renderSchemaRows(campos, document.getElementById('dict-drawer-schema-rows'));
  }

  // ── Toggle de regras por campo ────────────────────────────────────────

  window._dictDrawerToggleRules = function (idx) {
    const el = document.getElementById('dict-rules-' + idx);
    const ar = document.getElementById('dict-arrow-' + idx);
    if (!el) return;
    const isOpen = el.style.display === 'block';
    el.style.display = isOpen ? 'none' : 'block';
    if (ar) ar.textContent = isOpen ? '▸' : '▾';
  };

  function _ruleRow(label, value, color) {
    if (!value && value !== 0) return '';
    return '<div style="display:grid;grid-template-columns:130px 1fr;gap:6px;padding:3px 0;font-size:9px;">'
      + '<span style="color:#6b7280;">' + label + '</span>'
      + '<span style="color:' + (color || '#d1d5db') + ';word-break:break-all;font-family:monospace;">' + value + '</span>'
      + '</div>';
  }

  function _renderRulesPanel(c, idx) {
    const init     = _stripQuotes(c.relacao || '');
    const vldUser  = c.vlduser || '';
    const when     = c.when || '';
    const f3       = c.f3 || '';
    const comboArr = _parseCombo(c.combo);
    const opcoes   = Array.isArray(c.f3_opcoes) ? c.f3_opcoes : [];

    let combosHtml = '';
    if (comboArr.length) {
      combosHtml = '<div style="margin-top:6px;padding:6px 8px;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.18);border-radius:5px;">'
        + '<div style="font-size:9px;color:#60a5fa;font-weight:700;margin-bottom:4px;">\u{1F4CC} Opções aceitas pelo combo</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:4px;">'
        + comboArr.map(function (o) {
            return '<code style="background:rgba(96,165,250,.12);color:#dbeafe;font-size:9px;padding:2px 6px;border-radius:3px;"><strong style="color:#93c5fd;">' + o.key + '</strong>=' + o.desc + '</code>';
          }).join('')
        + '</div></div>';
    }

    let opcoesHtml = '';
    if (opcoes.length) {
      const items = opcoes.slice(0, 40).map(function (o) {
        return '<code style="background:rgba(167,139,250,.10);color:#e9d5ff;font-size:9px;padding:2px 6px;border-radius:3px;"><strong style="color:#c4b5fd;">' + o.chave + '</strong> ' + o.desc + '</code>';
      }).join('');
      const more = opcoes.length > 40 ? '<span style="font-size:9px;color:#6b7280;margin-left:4px;">+' + (opcoes.length - 40) + ' mais…</span>' : '';
      opcoesHtml = '<div style="margin-top:6px;padding:6px 8px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.18);border-radius:5px;">'
        + '<div style="font-size:9px;color:#a78bfa;font-weight:700;margin-bottom:4px;">\u{1F50D} Lista de opções (Consulta padrão F3 = ' + (f3 || '—') + ')</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:4px;">' + items + more + '</div>'
        + '</div>';
    }

    const flagsHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;">'
      + (c.obrigat   ? '<span style="background:rgba(248,113,113,.15);color:#f87171;border-radius:3px;padding:1px 7px;font-size:9px;font-weight:700;">obrigatório</span>' : '')
      + (c.is_key    ? '<span style="background:rgba(251,191,36,.15);color:#fbbf24;border-radius:3px;padding:1px 7px;font-size:9px;font-weight:700;">chave primária</span>' : '')
      + (c.is_custom ? '<span style="background:rgba(167,139,250,.15);color:#a78bfa;border-radius:3px;padding:1px 7px;font-size:9px;font-weight:700;">customizado</span>' : '')
      + (c.sistema   ? '<span style="background:rgba(96,165,250,.12);color:#60a5fa;border-radius:3px;padding:1px 7px;font-size:9px;font-weight:700;">campo do sistema</span>' : '')
      + '</div>';

    return '<div id="dict-rules-' + idx + '" style="display:none;padding:8px 12px 10px;background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.04);">'
      + flagsHtml
      + _ruleRow('Inicializador padrão', init ? '<span style="color:#34d399;">' + init + '</span>' : '<span style="color:#6b7280;">—</span>')
      + _ruleRow('Validação do usuário', vldUser ? '<code>' + vldUser + '</code>' : '<span style="color:#6b7280;">—</span>')
      + (when ? _ruleRow('Habilitar quando', '<code>' + when + '</code>', '#fbbf24') : '')
      + _ruleRow('Consulta padrão (F3)', f3 ? '<code style="color:#60a5fa;">' + f3 + '</code>' : '<span style="color:#6b7280;">—</span>')
      + combosHtml
      + opcoesHtml
      + '</div>';
  }

  function _renderSchemaRows(campos, el) {
    if (!el) return;
    if (!campos.length) {
      el.innerHTML = '<div style="color:#6b7280;padding:12px 10px;font-size:10px;">Nenhum campo encontrado.</div>';
      return;
    }
    el.innerHTML = campos.map(function (c, idx) {
      const tipo  = c.tipo || 'C';
      const tam   = c.tamanho != null ? c.tamanho : '—';
      const dec   = c.decimal != null && c.decimal > 0 ? '.' + c.decimal : '';
      const obrig  = c.obrigat   ? '<span style="background:rgba(248,113,113,.15);color:#f87171;border-radius:3px;padding:0 5px;font-size:8px;font-weight:700;">OBR</span>' : '';
      const isKey  = c.is_key    ? '<span style="background:rgba(251,191,36,.15);color:#fbbf24;border-radius:3px;padding:0 5px;font-size:8px;font-weight:700;">KEY</span>' : '';
      const custom = c.is_custom ? '<span style="background:rgba(167,139,250,.15);color:#a78bfa;border-radius:3px;padding:0 5px;font-size:8px;font-weight:700;">USR</span>' : '';
      const tipoColor = ({ C: '#38D4F5', N: '#34d399', D: '#fbbf24', L: '#f472b6', M: '#60a5fa' })[tipo] || '#9ca3af';
      const hasRules = !!(c.relacao || c.vlduser || c.when || c.f3 || c.combo || (c.f3_opcoes && c.f3_opcoes.length));
      return '<div>'
        + '<div onclick="_dictDrawerToggleRules(' + idx + ')"'
        + ' style="display:grid;grid-template-columns:14px 116px 36px 58px 1fr;gap:6px;align-items:center;'
        + 'padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.03);cursor:pointer;transition:background .15s;"'
        + ' onmouseover="this.style.background=\'rgba(255,255,255,.03)\'"'
        + ' onmouseout="this.style.background=\'transparent\'">'
        + '<span id="dict-arrow-' + idx + '" style="font-size:9px;color:' + (hasRules ? '#60a5fa' : '#374151') + ';">' + (hasRules ? '▸' : '·') + '</span>'
        + '<code style="font-size:10px;color:#e6edf3;font-weight:700;">' + (c.campo || '') + '</code>'
        + '<span style="font-size:10px;color:' + tipoColor + ';font-weight:700;text-align:center;background:' + tipoColor + '18;border-radius:3px;padding:1px 0;">' + tipo + '</span>'
        + '<span style="font-size:9px;color:#6b7280;text-align:right;font-family:monospace;">' + tam + dec + '</span>'
        + '<div style="display:flex;align-items:center;gap:3px;min-width:0;flex-wrap:wrap;">'
        + '<span style="font-size:9px;color:#d1d5db;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;">' + (c.titulo || '') + '</span>'
        + obrig + isKey + custom
        + '</div>'
        + '</div>'
        + (hasRules ? _renderRulesPanel(c, idx) : '')
        + '</div>';
    }).join('');
  }

  // ── Expõe API pública ─────────────────────────────────────────────────

  window.fetchDictBlueprint = fetchDictBlueprint;
  window.checkDictSnapshots = checkDictSnapshots;
  window._refreshDictBadges = _refreshDictBadges;

}());
