// ═══════════════════════════════════════════════════════════
// BeeIT OS-RT v2 — Document Parser
// 
// Leitura client-side de documentos em múltiplos formatos:
//   - PDF (texto via pdf.js; escaneado → Vision API fallback)
//   - DOCX (mammoth.js)
//   - XLSX/XLS (SheetJS)
//   - CSV (parse direto)
//   - TXT/MD (texto puro)
//   - IMG (PNG/JPG/WebP → Vision API direto)
//
// Todos retornam { success, tipo, texto, metadata, vision_payload? }
//
// Dependências esperadas (lazy-load):
//   - pdf.js     (https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js)
//   - mammoth    (já disponível no BeeIT OS-RT via CDN — confirmar na integração)
//   - SheetJS    (já disponível — XLSX global)
// ═══════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ──────────────────────────────────────────────────────────
  // LAZY LOADERS (CDNs — só carrega quando precisa)
  // ──────────────────────────────────────────────────────────
  const CDN_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const CDN_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const CDN_MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
  const CDN_SHEETJS = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

  const _loadedScripts = new Set();
  function loadScript(url) {
    if (_loadedScripts.has(url)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => { _loadedScripts.add(url); resolve(); };
      s.onerror = () => reject(new Error('Falha ao carregar script: ' + url));
      document.head.appendChild(s);
    });
  }

  async function ensurePdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await loadScript(CDN_PDFJS);
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_PDFJS_WORKER;
      return window.pdfjsLib;
    }
    throw new Error('pdf.js não disponível após carregamento');
  }

  async function ensureMammoth() {
    if (window.mammoth) return window.mammoth;
    await loadScript(CDN_MAMMOTH);
    if (window.mammoth) return window.mammoth;
    throw new Error('mammoth não disponível');
  }

  async function ensureSheetJS() {
    if (window.XLSX) return window.XLSX;
    await loadScript(CDN_SHEETJS);
    if (window.XLSX) return window.XLSX;
    throw new Error('SheetJS (XLSX) não disponível');
  }

  // ──────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────

  function detectFormat(file) {
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (type.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx';
    if (name.endsWith('.doc')) return 'doc_legacy'; // .doc binário — não suportado client-side
    if (type.includes('spreadsheetml') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
    if (type === 'text/csv' || name.endsWith('.csv')) return 'csv';
    if (type === 'text/plain' || name.endsWith('.txt')) return 'txt';
    if (name.endsWith('.md')) return 'md';
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/json' || name.endsWith('.json')) return 'json';
    if (name.endsWith('.xml')) return 'xml';
    return 'unknown';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1]);
      r.onerror = () => reject(new Error('Erro ao ler arquivo como base64'));
      r.readAsDataURL(file);
    });
  }

  function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Erro ao ler arquivo como ArrayBuffer'));
      r.readAsArrayBuffer(file);
    });
  }

  function fileToText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Erro ao ler arquivo como texto'));
      r.readAsText(file, 'UTF-8');
    });
  }

  // ──────────────────────────────────────────────────────────
  // PARSERS ESPECÍFICOS
  // ──────────────────────────────────────────────────────────

  async function parsePDF(file, opts = {}) {
    const pdfjs = await ensurePdfJs();
    const buffer = await fileToArrayBuffer(file);
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pageCount = doc.numPages;
    const pages = [];
    let fullText = '';
    let hasText = false;

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it => it.str).join(' ').trim();
      if (pageText.length > 20) hasText = true;
      pages.push({ page: i, text: pageText });
      fullText += '\n\n--- Página ' + i + ' ---\n' + pageText;
    }

    // Se não extraiu texto suficiente → provável PDF escaneado → sugerir Vision
    if (!hasText || fullText.replace(/[\s-]+/g, '').length < 50) {
      return {
        success: true,
        tipo: 'pdf',
        texto: fullText,
        metadata: {
          paginas: pageCount,
          texto_extraido: false,
          provavel_escaneado: true,
          tamanho_bytes: file.size,
          nome: file.name
        },
        vision_payload: {
          motivo: 'PDF escaneado — texto não extraído, enviando para Vision API',
          base64: await fileToBase64(file),
          media_type: 'application/pdf'
        }
      };
    }

    return {
      success: true,
      tipo: 'pdf',
      texto: fullText.trim(),
      metadata: {
        paginas: pageCount,
        texto_extraido: true,
        tamanho_bytes: file.size,
        nome: file.name,
        caracteres: fullText.length
      }
    };
  }

  async function parseDOCX(file) {
    const mammoth = await ensureMammoth();
    const buffer = await fileToArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return {
      success: true,
      tipo: 'docx',
      texto: result.value.trim(),
      metadata: {
        nome: file.name,
        tamanho_bytes: file.size,
        caracteres: result.value.length,
        avisos: (result.messages || []).map(m => m.message)
      }
    };
  }

  async function parseXLSX(file) {
    const XLSX = await ensureSheetJS();
    const buffer = await fileToArrayBuffer(file);
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetNames = wb.SheetNames;
    const sheets = [];
    let fullText = '';

    sheetNames.forEach(name => {
      const ws = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ' | ' });
      const range = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
      const linhas = range ? (range.e.r - range.s.r + 1) : 0;
      const colunas = range ? (range.e.c - range.s.c + 1) : 0;
      sheets.push({ nome: name, linhas, colunas });
      fullText += `\n\n=== Planilha: ${name} (${linhas} linhas × ${colunas} colunas) ===\n${csv}`;
    });

    return {
      success: true,
      tipo: 'xlsx',
      texto: fullText.trim(),
      metadata: {
        nome: file.name,
        tamanho_bytes: file.size,
        planilhas: sheets
      }
    };
  }

  async function parseCSV(file) {
    const texto = await fileToText(file);
    const linhas = texto.split('\n').length;
    return {
      success: true,
      tipo: 'csv',
      texto: texto.trim(),
      metadata: {
        nome: file.name,
        tamanho_bytes: file.size,
        linhas: linhas,
        caracteres: texto.length
      }
    };
  }

  async function parseTexto(file, tipo = 'txt') {
    const texto = await fileToText(file);
    return {
      success: true,
      tipo,
      texto: texto.trim(),
      metadata: {
        nome: file.name,
        tamanho_bytes: file.size,
        caracteres: texto.length
      }
    };
  }

  async function parseImagem(file) {
    // Imagem sempre via Vision API
    const base64 = await fileToBase64(file);
    return {
      success: true,
      tipo: 'image',
      texto: '', // Vision API vai preencher
      metadata: {
        nome: file.name,
        tamanho_bytes: file.size,
        media_type: file.type
      },
      vision_payload: {
        motivo: 'Imagem — requer Vision API',
        base64: base64,
        media_type: file.type
      }
    };
  }

  // ──────────────────────────────────────────────────────────
  // DISPATCHER PRINCIPAL
  // ──────────────────────────────────────────────────────────

  async function parseDocument(file, opts = {}) {
    if (!file) throw new Error('Arquivo não fornecido');
    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB
    if (file.size > MAX_SIZE) {
      throw new Error(`Arquivo muito grande (${(file.size/1024/1024).toFixed(1)} MB). Máximo: 30 MB.`);
    }

    const formato = detectFormat(file);

    try {
      switch (formato) {
        case 'pdf':   return await parsePDF(file, opts);
        case 'docx':  return await parseDOCX(file);
        case 'xlsx':  return await parseXLSX(file);
        case 'csv':   return await parseCSV(file);
        case 'txt':   return await parseTexto(file, 'txt');
        case 'md':    return await parseTexto(file, 'md');
        case 'json':  return await parseTexto(file, 'json');
        case 'xml':   return await parseTexto(file, 'xml');
        case 'image': return await parseImagem(file);
        case 'doc_legacy':
          throw new Error('Formato .doc (Word 97-2003) não suportado. Salve como .docx e tente novamente.');
        default:
          throw new Error(`Formato não reconhecido: ${file.type || file.name}. Use PDF, DOCX, XLSX, CSV, TXT, MD ou imagem.`);
      }
    } catch (e) {
      return {
        success: false,
        tipo: formato,
        error: e.message,
        metadata: {
          nome: file.name,
          tamanho_bytes: file.size
        }
      };
    }
  }

  // ──────────────────────────────────────────────────────────
  // CHAMADA VISION API (PDF escaneado ou imagem)
  // ──────────────────────────────────────────────────────────

  async function extractViaVision(visionPayload, systemPrompt, userPrompt) {
    let key;
    if (typeof window.cfgGet === 'function') key = window.cfgGet('api_key', '');
    if (!key) key = window.ANTHROPIC_KEY;
    if (!key) throw new Error('API key da Anthropic não configurada. Vá em Configurações → API Key.');

    // Monta content com imagem/PDF + texto
    const content = [];

    if (visionPayload.media_type === 'application/pdf') {
      // PDF direto via Claude (suporta PDF nativo)
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: visionPayload.base64
        }
      });
    } else if (visionPayload.media_type && visionPayload.media_type.startsWith('image/')) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: visionPayload.media_type,
          data: visionPayload.base64
        }
      });
    } else {
      throw new Error('Tipo não suportado para Vision: ' + visionPayload.media_type);
    }

    content.push({ type: 'text', text: userPrompt });

    const body = {
      model: 'claude-sonnet-4-6',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: content }]
    };

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000) // 2min timeout
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Vision API error ${resp.status}: ${err.slice(0, 300)}`);
    }

    const data = await resp.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    return { rawText: text, usage: data.usage, stop_reason: data.stop_reason };
  }

  // ──────────────────────────────────────────────────────────
  // EXTRAÇÃO COMPLETA (integra parser + agente AGENT_EXTRATOR)
  // ──────────────────────────────────────────────────────────

  /**
   * Ponto de entrada único:
   * 1. Tenta extrair texto local
   * 2. Se falhou ou for imagem → Vision API
   * 3. Roda AGENT_EXTRATOR (Claude) para estruturar
   * 4. Retorna JSON estruturado
   */
  async function extractAndStructure(file, contextoCliente, erpEsperado) {
    const AGENTS = window.AGENTS;
    if (!AGENTS?.extrator) throw new Error('AGENT_EXTRATOR não disponível — verifique se agents.js foi carregado');

    // PASSO 1: parsing local
    const parsed = await parseDocument(file);

    if (!parsed.success) {
      return { success: false, error: parsed.error, parseResult: parsed };
    }

    const agent = AGENTS.extrator;
    let rawAIResponse;

    if (parsed.vision_payload) {
      // PASSO 2A: Vision API (imagem ou PDF escaneado)
      const userPrompt = agent.user_prompt_template({
        tipo_documento: parsed.tipo,
        nome_arquivo: parsed.metadata?.nome,
        contexto_cliente: contextoCliente,
        conteudo_texto: '[Documento enviado como imagem/PDF nativo para análise visual]',
        erp_esperado: erpEsperado
      });
      const visionResult = await extractViaVision(parsed.vision_payload, agent.system_prompt, userPrompt);
      rawAIResponse = visionResult.rawText;
    } else {
      // PASSO 2B: Texto já extraído localmente — chamada normal
      const userPrompt = agent.user_prompt_template({
        tipo_documento: parsed.tipo,
        nome_arquivo: parsed.metadata?.nome,
        contexto_cliente: contextoCliente,
        conteudo_texto: parsed.texto,
        erp_esperado: erpEsperado
      });
      // Reutiliza o helper callClaude se disponível, senão inline
      if (window.BeeITAssessments?._helpers?.callClaude) {
        const r = await window.BeeITAssessments._helpers.callClaude(agent, userPrompt);
        return {
          success: true,
          parsed_document: parsed,
          ai_extraction: r.parsed,
          raw: r.rawText,
          usage: r.usage
        };
      }
      throw new Error('BeeITAssessments._helpers.callClaude não disponível');
    }

    // PASSO 3: Parse JSON da IA
    const extractJSON = window.BeeITAssessments?._helpers?.extractJSON;
    if (!extractJSON) throw new Error('extractJSON não disponível');
    const aiParsed = extractJSON(rawAIResponse);

    return {
      success: true,
      parsed_document: parsed,
      ai_extraction: aiParsed,
      raw: rawAIResponse
    };
  }

  // ──────────────────────────────────────────────────────────
  // EXPORT GLOBAL
  // ──────────────────────────────────────────────────────────
  window.BeeITDocParser = {
    parseDocument,
    extractAndStructure,
    extractViaVision,
    detectFormat,
    // Parsers individuais (para testes)
    parsePDF,
    parseDOCX,
    parseXLSX,
    parseCSV,
    parseTexto,
    parseImagem,
    // Helpers
    _helpers: { fileToBase64, fileToArrayBuffer, fileToText }
  };

  console.log('[BeeIT] Document Parser carregado:', Object.keys(window.BeeITDocParser));
})();
