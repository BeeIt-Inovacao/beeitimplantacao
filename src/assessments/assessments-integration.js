// ═══════════════════════════════════════════════════════════
// BeeIT OS-RT v2 — Integração Assessments (Supabase + Claude API)
// 
// Exporta (no objeto global window.BeeITAssessments):
//   - createAssessment(tipo, contextoCliente)
//   - saveAssessment(id, dados)
//   - loadAssessment(id)
//   - listAssessments(filtros)
//   - deleteAssessment(id)
//   - analyzeProcess(assessmentId, dadosProcesso) → chama AGENT_PROTHEUS ou AGENT_RM
//   - classifyClient(descricaoLivre, contexto) → chama AGENT_ORQUESTRADOR
//   - consolidateAssessment(assessmentId) → chama AGENT_CONSOLIDADOR
//
// Dependências esperadas no escopo global (já existentes no BeeIT OS-RT v2):
//   - supabase (cliente Supabase inicializado)
//   - beeitSession.access_token (JWT do usuário logado)
//   - ANTHROPIC_KEY (chave da Anthropic para chamadas diretas)
//   - AGENTS (objeto com os 4 agentes — importado de agents.js)
// ═══════════════════════════════════════════════════════════

(function() {
  'use strict';

  const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

  // ──────────────────────────────────────────────────────────
  // HELPERS — tratamento de JSON retornado pela IA
  // ──────────────────────────────────────────────────────────

  /**
   * Remove cercas markdown (```json ... ```) e extrai primeiro objeto JSON válido.
   * Mesmo padrão usado no CT5 agent (trata truncagem parcial).
   */
  function extractJSON(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Texto vazio retornado pela IA');
    }

    // 1. Remover markdown fences
    let cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    // 2. Tentar parse direto
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // 3. Fallback: extrair primeiro bloco { ... } balanceado
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ }
      }

      // 4. Fallback de truncagem: se terminar antes do fechamento, tentar fechar
      if (cleaned.startsWith('{') && !cleaned.endsWith('}')) {
        let attempt = cleaned;
        const openBraces = (attempt.match(/\{/g) || []).length;
        const closeBraces = (attempt.match(/\}/g) || []).length;
        const missing = openBraces - closeBraces;
        if (missing > 0) {
          // Fechar aspas pendentes, arrays pendentes, etc.
          attempt = attempt.replace(/,\s*$/, '') + '}'.repeat(missing);
          try { return JSON.parse(attempt); } catch (e3) { /* fall through */ }
        }
      }

      throw new Error('Não foi possível fazer parse do JSON retornado: ' + e.message);
    }
  }

  /**
   * Chamada padrão à API Claude Sonnet 4.
   * Usa padrão do BeeIT OS-RT v2 existente (header anthropic-dangerous-direct-browser-access).
   */
  async function callClaude(agent, userPrompt, options = {}) {
    const key = (typeof cfgGet==='function' ? cfgGet('api_key','') : '') || options.apiKey;
    if (!key) throw new Error('API key não configurada (cfgGet(\'api_key\') vazio)');

    const body = {
      model: agent.modelo,
      max_tokens: options.max_tokens || agent.max_tokens,
      system: agent.system_prompt,
      messages: [{ role: 'user', content: userPrompt }]
    };
    // ⚠️ NÃO passar temperature: 0 — causa HTTP 400 nesta versão da API

    const resp = await fetch(ANTHROPIC_API_URL, {
      signal: AbortSignal.timeout(120000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Claude API error ${resp.status}: ${err.slice(0, 300)}`);
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    if (!text) throw new Error('Resposta Claude sem conteúdo textual');

    return {
      rawText: text,
      parsed: extractJSON(text),
      usage: data.usage,
      stop_reason: data.stop_reason
    };
  }

  // ──────────────────────────────────────────────────────────
  // SUPABASE CRUD — assessments
  // ──────────────────────────────────────────────────────────

  function getSupabase() {
    const sb = window.supabase || window.sbClient || window._supabaseClient;
    if (!sb) throw new Error('Cliente Supabase não encontrado no escopo global');
    return sb;
  }

  function getUserId() {
    const session = window.beeitSession || window._beeitSession;
    if (!session?.user?.id) throw new Error('Usuário não logado (beeitSession ausente)');
    return session.user.id;
  }

  /**
   * Cria um novo assessment (draft) no Supabase.
   * @param {string} tipo - 'protheus' | 'rm' | 'hibrido'
   * @param {object} contextoCliente - dados básicos do cliente
   * @returns {object} registro criado com id
   */
  async function createAssessment(tipo, contextoCliente) {
    const sb = getSupabase();
    const userId = getUserId();

    const { razao_social, cnpj, segmento } = contextoCliente || {};
    const uf = (contextoCliente?.ufs_operacao || [])[0] || null;

    const insertPayload = {
      user_id: userId,
      tipo,
      status: 'draft',
      cliente_nome: razao_social || 'Sem nome',
      cliente_cnpj: cnpj || null,
      cliente_segmento: segmento || null,
      cliente_uf: uf,
      dados: {
        contexto_cliente: contextoCliente || {},
        processos_analisados: [],
        consolidacao: null,
        metadados: { qdb_versao: '2026.04', agent_versao: 'v2.0' }
      },
      secao_atual: 'contexto',
      percentual_completo: 10 // criou contexto = 10%
    };

    const { data, error } = await sb
      .from('assessments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error('Erro ao criar assessment: ' + error.message);
    return data;
  }

  /**
   * Atualiza dados de um assessment (merge no JSONB).
   */
  async function saveAssessment(id, patch) {
    const sb = getSupabase();

    // Se o patch inclui chaves de topo (status/secao_atual/etc), atualiza direto.
    // Se contém { dados: { ... } }, faz merge manual.
    const updatePayload = { ...patch };

    if (patch.dados) {
      // Busca dados atuais para fazer merge
      const { data: current } = await sb
        .from('assessments')
        .select('dados')
        .eq('id', id)
        .single();

      updatePayload.dados = {
        ...(current?.dados || {}),
        ...patch.dados
      };
    }

    const { data, error } = await sb
      .from('assessments')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('Erro ao salvar assessment: ' + error.message);
    return data;
  }

  /**
   * Carrega um assessment por ID.
   */
  async function loadAssessment(id) {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('assessments')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error('Erro ao carregar assessment: ' + error.message);
    return data;
  }

  /**
   * Lista assessments do usuário (com filtros opcionais).
   */
  async function listAssessments(filtros = {}) {
    const sb = getSupabase();
    let q = sb
      .from('assessments')
      .select('id,tipo,status,cliente_nome,cliente_cnpj,cliente_segmento,percentual_completo,created_at,updated_at,completed_at,pdf_url')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (filtros.tipo) q = q.eq('tipo', filtros.tipo);
    if (filtros.status) q = q.eq('status', filtros.status);
    if (filtros.search) {
      q = q.or(`cliente_nome.ilike.%${filtros.search}%,cliente_cnpj.ilike.%${filtros.search}%`);
    }

    const { data, error } = await q;
    if (error) throw new Error('Erro ao listar assessments: ' + error.message);
    return data || [];
  }

  /**
   * Soft delete do assessment.
   */
  async function deleteAssessment(id) {
    const sb = getSupabase();
    const { error } = await sb
      .from('assessments')
      .update({ deleted_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id);
    if (error) throw new Error('Erro ao arquivar assessment: ' + error.message);
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // AGENTES IA — wrappers que chamam Claude + salvam no Supabase
  // ──────────────────────────────────────────────────────────

  /**
   * Analisa um processo individual (Protheus ou RM).
   * Salva a análise no array processos_analisados do assessment.
   */
  async function analyzeProcess(assessmentId, dadosProcesso) {
    const AGENTS = window.AGENTS;
    if (!AGENTS) throw new Error('AGENTS não definido — agents.js não foi carregado');

    // 1. Carregar assessment para saber o tipo e contexto
    const assessment = await loadAssessment(assessmentId);
    const agent = assessment.tipo === 'rm' ? AGENTS.rm : AGENTS.protheus;

    // 2. Montar dados para o prompt
    const dadosParaIA = {
      ...dadosProcesso,
      contexto_cliente: assessment.dados?.contexto_cliente || {}
    };

    // 3. Chamar Claude Sonnet 4
    const userPrompt = agent.user_prompt_template(dadosParaIA);
    const result = await callClaude(agent, userPrompt);

    // 4. Montar objeto de processo com análise
    const processoId = 'proc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const processoRegistro = {
      id: processoId,
      modulo: dadosProcesso.modulo,
      processo: dadosProcesso.processo,
      descricao_as_is: dadosProcesso.descricao_as_is,
      perguntas_inteligentes: dadosProcesso.perguntas_inteligentes || {},
      observacoes: dadosProcesso.observacoes || '',
      analise_ai: result.parsed,
      analise_raw: result.rawText, // guardamos o raw para debug
      analise_metadata: {
        modelo: agent.modelo,
        usage: result.usage,
        stop_reason: result.stop_reason
      },
      status: 'analisado',
      created_at: new Date().toISOString(),
      analisado_em: new Date().toISOString()
    };

    // 5. Salvar no Supabase — append no array processos_analisados
    const processosAtuais = assessment.dados?.processos_analisados || [];
    const processosNovos = [...processosAtuais, processoRegistro];

    await saveAssessment(assessmentId, {
      status: 'in_progress',
      dados: {
        ...(assessment.dados || {}),
        processos_analisados: processosNovos
      },
      percentual_completo: Math.min(95, 20 + processosNovos.length * 15)
    });

    return processoRegistro;
  }

  /**
   * Re-analisa um processo já existente (edição/refinamento).
   */
  async function reanalyzeProcess(assessmentId, processoId, dadosProcessoAtualizado) {
    const assessment = await loadAssessment(assessmentId);
    const processos = assessment.dados?.processos_analisados || [];
    const index = processos.findIndex(p => p.id === processoId);
    if (index === -1) throw new Error('Processo não encontrado');

    const AGENTS = window.AGENTS;
    const agent = assessment.tipo === 'rm' ? AGENTS.rm : AGENTS.protheus;

    const dadosParaIA = {
      ...dadosProcessoAtualizado,
      contexto_cliente: assessment.dados?.contexto_cliente || {}
    };
    const userPrompt = agent.user_prompt_template(dadosParaIA);
    const result = await callClaude(agent, userPrompt);

    processos[index] = {
      ...processos[index],
      ...dadosProcessoAtualizado,
      analise_ai: result.parsed,
      analise_raw: result.rawText,
      analise_metadata: {
        modelo: agent.modelo,
        usage: result.usage,
        stop_reason: result.stop_reason
      },
      reanalisado_em: new Date().toISOString()
    };

    await saveAssessment(assessmentId, {
      dados: { ...(assessment.dados || {}), processos_analisados: processos }
    });

    return processos[index];
  }

  /**
   * Remove um processo do assessment.
   */
  async function removeProcess(assessmentId, processoId) {
    const assessment = await loadAssessment(assessmentId);
    const processos = (assessment.dados?.processos_analisados || []).filter(p => p.id !== processoId);
    await saveAssessment(assessmentId, {
      dados: { ...(assessment.dados || {}), processos_analisados: processos }
    });
    return true;
  }

  /**
   * Orquestrador — classifica cliente em Protheus/RM/Híbrido.
   */
  async function classifyClient(descricaoLivre, contextoRapido) {
    const AGENTS = window.AGENTS;
    if (!AGENTS?.orquestrador) throw new Error('AGENT_ORQUESTRADOR não disponível');

    const userPrompt = AGENTS.orquestrador.user_prompt_template(descricaoLivre, contextoRapido);
    const result = await callClaude(AGENTS.orquestrador, userPrompt);

    return {
      classificacao: result.parsed.classificacao,
      confianca_percent: result.parsed.confianca_percent,
      raciocinio: result.parsed.raciocinio,
      sinais_detectados: result.parsed.sinais_detectados,
      recomendacao_acao: result.parsed.recomendacao_acao,
      processos_sugeridos: result.parsed.processos_sugeridos_para_analise || [],
      perguntas_para_confirmar: result.parsed.perguntas_para_confirmar || [],
      alerta_atencao: result.parsed.alerta_atencao,
      raw: result.rawText
    };
  }

  /**
   * Consolidador — gera sumário executivo cruzando todas análises.
   */
  async function consolidateAssessment(assessmentId) {
    const AGENTS = window.AGENTS;
    if (!AGENTS?.consolidador) throw new Error('AGENT_CONSOLIDADOR não disponível');

    const assessment = await loadAssessment(assessmentId);
    const processos = assessment.dados?.processos_analisados || [];

    if (processos.length === 0) {
      throw new Error('Não há processos analisados para consolidar');
    }

    // Enviar apenas os campos relevantes das análises para não estourar tokens
    const analisesSlim = processos.map(p => ({
      id: p.id,
      modulo: p.modulo,
      processo: p.processo,
      analise_ai: p.analise_ai
    }));

    const userPrompt = AGENTS.consolidador.user_prompt_template(
      assessment.dados?.contexto_cliente || {},
      analisesSlim
    );

    const result = await callClaude(AGENTS.consolidador, userPrompt);

    // Salvar consolidação no assessment
    await saveAssessment(assessmentId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      percentual_completo: 100,
      analise_ai: result.parsed, // análise consolidada na coluna própria
      dados: {
        ...(assessment.dados || {}),
        consolidacao: {
          analise_ai: result.parsed,
          analise_raw: result.rawText,
          consolidado_em: new Date().toISOString(),
          usage: result.usage
        }
      }
    });

    return result.parsed;
  }

  // ──────────────────────────────────────────────────────────
  // STORAGE — upload/download PDF
  // ──────────────────────────────────────────────────────────

  /**
   * Faz upload do PDF gerado para o bucket privado.
   * Path: {userId}/{assessmentId}.pdf
   */
  async function uploadPDF(assessmentId, pdfBlob) {
    const sb = getSupabase();
    const userId = getUserId();
    const path = `${userId}/${assessmentId}.pdf`;

    const { error: upErr } = await sb.storage
      .from('assessments-pdf')
      .upload(path, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      });
    if (upErr) throw new Error('Erro no upload do PDF: ' + upErr.message);

    // Gerar signed URL com 1h
    const { data: signed, error: signErr } = await sb.storage
      .from('assessments-pdf')
      .createSignedUrl(path, 3600);
    if (signErr) throw new Error('Erro ao gerar signed URL: ' + signErr.message);

    // Atualizar assessment com URL do PDF
    await saveAssessment(assessmentId, {
      pdf_url: signed.signedUrl,
      pdf_gerado_em: new Date().toISOString()
    });

    return signed.signedUrl;
  }

  /**
   * Gera nova signed URL para PDF já existente (expira em 1h).
   */
  async function getPDFSignedUrl(assessmentId) {
    const sb = getSupabase();
    const userId = getUserId();
    const path = `${userId}/${assessmentId}.pdf`;
    const { data, error } = await sb.storage
      .from('assessments-pdf')
      .createSignedUrl(path, 3600);
    if (error) throw new Error('Erro ao gerar signed URL: ' + error.message);
    return data.signedUrl;
  }

  // ──────────────────────────────────────────────────────────
  // EXPORT GLOBAL
  // ──────────────────────────────────────────────────────────

  window.BeeITAssessments = {
    // CRUD
    createAssessment,
    saveAssessment,
    loadAssessment,
    listAssessments,
    deleteAssessment,
    // Agentes IA
    analyzeProcess,
    reanalyzeProcess,
    removeProcess,
    classifyClient,
    consolidateAssessment,
    // Storage
    uploadPDF,
    getPDFSignedUrl,
    // Helpers (expostos para debug/teste)
    _helpers: { extractJSON, callClaude }
  };

  console.log('[BeeIT] Módulo Assessments carregado:', Object.keys(window.BeeITAssessments));
})();
