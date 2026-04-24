// ═══════════════════════════════════════════════════════════
// BeeIT OS-RT v2 — QDB RM v2.0
// Simétrico ao Protheus v2 — metodologia AS-IS/PADRÃO/GAP/TO-BE/PLANO
// ═══════════════════════════════════════════════════════════

const QDB_RM_CONTEXTO = {
  id: 'rm',
  nome: 'Assessment RM',
  descricao: 'Diagnóstico AS-IS / PADRÃO / GAP / TO-BE / PLANO DE AÇÃO por processo RM',
  metodologia: 'AS-IS → PADRÃO RM → GAP → RISCO → TO-BE → PLANO DE AÇÃO',
  icone: 'R',
  cor: '#00A859',
  estimativa_min_por_processo: 8,

  // ────────── CONTEXTO DO CLIENTE ──────────
  contexto_cliente: {
    id: 'contexto',
    titulo: 'Contexto do Cliente',
    descricao: 'Informações base compartilhadas entre todas as análises de processo',
    perguntas: [
      { id: 'razao_social', label: 'Razão social', tipo: 'text', obrigatorio: true, placeholder: 'Ex: Faculdade XYZ LTDA' },
      { id: 'cnpj', label: 'CNPJ principal', tipo: 'text', obrigatorio: true, mascara: 'cnpj' },
      { id: 'segmento', label: 'Segmento de atuação', tipo: 'select', obrigatorio: true,
        opcoes: ['Educação', 'Saúde', 'Construção Civil', 'Serviços', 'Indústria', 'Condomínios', 'Varejo', 'Outro'] },
      { id: 'segmento_detalhe', label: 'Detalhe do segmento (nicho específico)', tipo: 'text', obrigatorio: false,
        placeholder: 'Ex: Faculdade presencial+EAD / Hospital 120 leitos / Construtora incorporadora' },
      { id: 'n_coligadas', label: 'Nº coligadas no grupo', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 2' },
      { id: 'n_filiais', label: 'Nº filiais/unidades', tipo: 'number', obrigatorio: true, placeholder: 'Ex: 5' },
      { id: 'n_colaboradores', label: 'Nº total de colaboradores (incluindo terceiros)', tipo: 'select', obrigatorio: true,
        opcoes: ['Até 50', '50 – 200', '200 – 1.000', '1.000 – 5.000', 'Acima de 5.000'] },
      { id: 'versao_rm', label: 'Versão/Release RM', tipo: 'text', obrigatorio: false, placeholder: 'Ex: 12.1.2405' },
      { id: 'hospedagem', label: 'Tipo de hospedagem', tipo: 'select', obrigatorio: false,
        opcoes: ['TOTVS Cloud (PaaS)', 'Cloud pública (AWS/Azure/GCP)', 'On-premises', 'Híbrido', 'A decidir'] },
      { id: 'modulos_ativos', label: 'Módulos RM em uso ou escopo', tipo: 'multiselect', obrigatorio: false,
        opcoes: [
          'Fluxus (Financeiro)',
          'Labore (Folha)',
          'Chronus (Ponto)',
          'Nucleus (Back-office)',
          'Gestão de Pessoas',
          'Educacional (Classis/Ensino)',
          'Saldus (Contábil)',
          'Bis (BI)',
          'Portal (Web)',
          'Outro'
        ] },
      { id: 'objetivo_projeto', label: 'Objetivo do assessment', tipo: 'select', obrigatorio: true,
        opcoes: ['Diagnóstico pré-implantação', 'Upgrade de versão', 'Migração de outro sistema', 'Saneamento/Reconfiguração', 'Auditoria de processos', 'Expansão modular'] },
      { id: 'consultor_responsavel', label: 'Consultor BeeIT responsável', tipo: 'text', obrigatorio: true },
      { id: 'contato_cliente', label: 'Contato principal no cliente', tipo: 'text', obrigatorio: false }
    ]
  },

  // ────────── ANÁLISE DE PROCESSO ──────────
  template_analise_processo: {
    id: 'analise_processo_rm',
    titulo: 'Analisar processo RM',
    descricao: 'Descreva o processo atual — a IA vai produzir AS-IS/PADRÃO/GAP/RISCO/TO-BE/PLANO',
    perguntas: [
      { id: 'modulo', label: 'Módulo RM', tipo: 'select', obrigatorio: true,
        opcoes: ['FLUXUS', 'LABORE', 'CHRONUS', 'NUCLEUS', 'GESTAO_PESSOAS', 'EDUCACIONAL', 'OUTRO'] },
      { id: 'processo_nome', label: 'Nome do processo', tipo: 'text-com-sugestoes', obrigatorio: true,
        placeholder: 'Ex: Lançamento Fluxus · Cálculo de folha · Matrícula de aluno',
        sugestoes_fonte: 'PROCESSOS_PADRAO.rm' },
      { id: 'descricao_as_is', label: 'Descrição do processo atual (AS-IS)', tipo: 'textarea', obrigatorio: true,
        placeholder: 'Descreva como o processo é executado hoje.',
        rows: 8 },
      // 7 perguntas inteligentes OFICIAIS do prompt RM
      { id: 'pi_como_inicia',        label: '1) Como o processo inicia?',                       tipo: 'textarea', obrigatorio: true,  rows: 2 },
      { id: 'pi_integracao',         label: '2) Existe integração entre módulos?',              tipo: 'textarea', obrigatorio: true,  rows: 2 },
      { id: 'pi_retrabalho',         label: '3) Existe retrabalho?',                            tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_erro_recorrente',    label: '4) Existe erro recorrente?',                       tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_validacao',          label: '5) Existe validação?',                             tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_automacao',          label: '6) Existe automação?',                             tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'pi_dependencia_modulo', label: '7) O processo depende de outro módulo? Qual?',     tipo: 'textarea', obrigatorio: false, rows: 2 },
      { id: 'observacoes', label: 'Observações adicionais', tipo: 'textarea', obrigatorio: false, rows: 3 }
    ]
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = QDB_RM_CONTEXTO;
