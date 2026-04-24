// ═══════════════════════════════════════════════════════════
// BeeIT OS-RT v2 — QDB Protheus v2.0
// 
// ⚠️ MUDANÇA ARQUITETURAL v2.0:
// Não é mais formulário gigante. Agora é:
//   1. Contexto do Cliente (dados básicos — 1 tela)
//   2. Análise de Processos (N processos, 1 por vez, usa AGENT_PROTHEUS)
//   3. Consolidação (AGENT_CONSOLIDADOR junta tudo)
// ═══════════════════════════════════════════════════════════

const QDB_PROTHEUS_CONTEXTO = {
  id: 'protheus',
  nome: 'Assessment Protheus',
  descricao: 'Diagnóstico AS-IS / PADRÃO / GAP / TO-BE / PLANO DE AÇÃO por processo',
  metodologia: 'AS-IS → PADRÃO PROTHEUS → GAP → RISCO → TO-BE → PLANO DE AÇÃO',
  icone: 'P',
  cor: '#E84A27',
  estimativa_min_por_processo: 8,

  // ────────── CONTEXTO DO CLIENTE (1 única seção preenchida no início) ──────────
  contexto_cliente: {
    id: 'contexto',
    titulo: 'Contexto do Cliente',
    descricao: 'Informações básicas que serão compartilhadas entre todas as análises de processo',
    perguntas: [
      { id: 'razao_social', label: 'Razão social', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Indústria ABC LTDA' },
      { id: 'cnpj', label: 'CNPJ principal', tipo: 'text', obrigatorio: true, mascara: 'cnpj', placeholder: '00.000.000/0000-00' },
      { id: 'segmento', label: 'Segmento de atuação', tipo: 'select', obrigatorio: true,
        opcoes: ['Indústria', 'Distribuição/Atacado', 'Varejo', 'Agronegócio', 'Construção Civil', 'Logística', 'Serviços', 'Outro'] },
      { id: 'regime_tributario', label: 'Regime tributário', tipo: 'select', obrigatorio: true,
        opcoes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'] },
      { id: 'faturamento_anual', label: 'Faturamento anual aproximado', tipo: 'select', obrigatorio: false,
        opcoes: ['Até R$ 10mi', 'R$ 10mi – 50mi', 'R$ 50mi – 200mi', 'R$ 200mi – 1bi', 'Acima de R$ 1bi'] },
      { id: 'n_funcionarios', label: 'Nº colaboradores', tipo: 'number', obrigatorio: false, placeholder: 'Ex: 250' },
      { id: 'n_filiais', label: 'Nº filiais/CNPJs no grupo', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 3' },
      { id: 'ufs_operacao', label: 'UFs onde opera', tipo: 'multiselect', obrigatorio: true,
        opcoes: ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] },
      { id: 'versao_protheus', label: 'Versão/Release Protheus', tipo: 'text', obrigatorio: false, placeholder: 'Ex: 12.1.33' },
      { id: 'hospedagem', label: 'Tipo de hospedagem', tipo: 'select', obrigatorio: false,
        opcoes: ['TOTVS Cloud (PaaS)', 'Cloud pública (AWS/Azure/GCP)', 'On-premises', 'Híbrido', 'A decidir'] },
      { id: 'vol_nf_mes', label: 'Volume mensal de NFe (entrada + saída)', tipo: 'select', obrigatorio: false,
        opcoes: ['Até 500', '500 – 2.000', '2.000 – 10.000', '10.000 – 50.000', 'Acima de 50.000'] },
      { id: 'objetivo_projeto', label: 'Objetivo do assessment', tipo: 'select', obrigatorio: true,
        opcoes: ['Diagnóstico pré-implantação', 'Upgrade de versão', 'Migração de outro ERP', 'Saneamento/Reconfiguração', 'Auditoria de processos', 'Expansão'] },
      { id: 'consultor_responsavel', label: 'Consultor BeeIT responsável', tipo: 'text', obrigatorio: true, placeholder: 'Nome do consultor' },
      { id: 'contato_cliente', label: 'Contato principal no cliente', tipo: 'text', obrigatorio: false, placeholder: 'Nome · Cargo · Email' }
    ]
  },

  // ────────── ANÁLISE DE PROCESSO (template reutilizável) ──────────
  // Para cada processo adicionado ao assessment, consultor preenche isso:
  template_analise_processo: {
    id: 'analise_processo',
    titulo: 'Analisar processo',
    descricao: 'Descreva o processo atual — a IA vai produzir AS-IS/PADRÃO/GAP/RISCO/TO-BE/PLANO',
    perguntas: [
      { id: 'modulo', label: 'Módulo Protheus', tipo: 'select', obrigatorio: true,
        opcoes: ['FISCAL', 'FATURAMENTO', 'FINANCEIRO', 'ESTOQUE', 'COMPRAS', 'OUTRO'] },
      { id: 'processo_nome', label: 'Nome do processo', tipo: 'text-com-sugestoes', obrigatorio: true,
        placeholder: 'Ex: Emissão de NFe · Baixa de título · Inventário mensal',
        // sugestões dinâmicas baseadas no módulo selecionado (vide PROCESSOS_PADRAO em agents.js)
        sugestoes_fonte: 'PROCESSOS_PADRAO.protheus' },
      { id: 'descricao_as_is', label: 'Descrição do processo atual (AS-IS)', tipo: 'textarea', obrigatorio: true,
        placeholder: 'Descreva como o processo é executado hoje. Quanto mais detalhes, melhor a análise.',
        rows: 8 },
      // As 7 perguntas inteligentes
      { id: 'pi_como_inicia', label: '1) Como o processo inicia?', tipo: 'textarea', obrigatorio: true, rows: 2 },
      { id: 'pi_quem_executa', label: '2) Quem executa (perfil/área)?', tipo: 'text', obrigatorio: true },
      { id: 'pi_validacao', label: '3) Existe validação ou aprovação?', tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_integracao', label: '4) Existe integração com outro módulo?', tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_retrabalho', label: '5) Existe retrabalho?', tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_erros', label: '6) Já ocorreu erro? Descreva.', tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_controle', label: '7) Existe controle ou é manual (planilha paralela, etc.)?', tipo: 'textarea', obrigatorio: false, rows: 2 },
      // Observações adicionais
      { id: 'observacoes', label: 'Observações adicionais (opcional)', tipo: 'textarea', obrigatorio: false, rows: 3,
        placeholder: 'Qualquer contexto extra relevante — ambiente, histórico, restrições, etc.' }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = QDB_PROTHEUS_CONTEXTO;
