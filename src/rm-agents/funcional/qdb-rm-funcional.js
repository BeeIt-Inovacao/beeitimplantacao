// ═══════════════════════════════════════════════════════════
// BeeIT OS-RT v2 — QDB MIT041 Funcional RM
// 10 módulos completos · ~540 perguntas · 68 seções
// 
// Segue exatamente o padrão do QDB Protheus:
//   _M41RM_MODS = [ {id, name, sub, icon, clr, n}, ... ]
//   _M41RM_QDB  = { moduloId: [ {section, qs:[{id,label,...}]} ] }
// 
// Nomenclatura RM: COLIGADA (não "empresa"), FCFO, PFUNC, SALUNO,
// fórmulas visuais, rubricas, eventos Labore, PARAM.GBL
// ═══════════════════════════════════════════════════════════

const _M41RM_MODS = [
  { id:'fluxus',      name:'Financeiro',        sub:'RM FLUXUS',    icon:'FX',  clr:'#3b82f6', n:75 },
  { id:'saldus',      name:'Contábil',          sub:'RM SALDUS',    icon:'SA',  clr:'#6366f1', n:48 },
  { id:'labore',      name:'Folha de Pagamento',sub:'RM LABORE',    icon:'LB',  clr:'#10b981', n:85 },
  { id:'chronus',     name:'Ponto Eletrônico',  sub:'RM CHRONUS',   icon:'CH',  clr:'#f59e0b', n:55 },
  { id:'nucleus',     name:'Back-office',       sub:'RM NUCLEUS',   icon:'NC',  clr:'#ef4444', n:65 },
  { id:'gpessoas',    name:'Gestão de Pessoas', sub:'RM GPESSOAS',  icon:'GP',  clr:'#ec4899', n:50 },
  { id:'classis',     name:'Educacional',       sub:'RM CLASSIS',   icon:'EDU', clr:'#8b5cf6', n:60 },
  { id:'tcop',        name:'Construção/Obras',  sub:'RM TCOP',      icon:'OB',  clr:'#0ea5e9', n:40 },
  { id:'tcgi',        name:'Agrícola/Integrada',sub:'RM TCGI',      icon:'TG',  clr:'#84cc16', n:35 },
  { id:'agilis',      name:'Agendamento/Saúde', sub:'RM AGILIS',    icon:'AG',  clr:'#14b8a6', n:30 }
];

const _M41RM_QDB = {

  // ══════════════════════════════════════════════════════════
  // RM FLUXUS — Financeiro (75 perguntas)
  // ══════════════════════════════════════════════════════════
  fluxus: [
    { section:'Ambiente e Estrutura', qs:[
      { id:'n_coligadas', label:'Quantas coligadas serão implantadas?', type:'num' },
      { id:'n_filiais',   label:'Quantas filiais por coligada?', type:'text' },
      { id:'multi_moeda', label:'Uso de múltiplas moedas?', type:'yn' },
      { id:'moedas',      label:'Quais moedas? (BRL, USD, EUR...)', type:'text', dep:'multi_moeda' },
      { id:'plano_contas_unico', label:'Plano de contas é único entre coligadas?', type:'yn' },
      { id:'ano_inicio',  label:'Ano de início do uso do Fluxus', type:'text' }
    ]},
    { section:'Cadastros Básicos', qs:[
      { id:'fcfo_tipos',  label:'Tipos de FCFO em uso (Cliente, Fornecedor, Banco...)', type:'list', options:['Cliente','Fornecedor','Banco','Funcionário','Outro'] },
      { id:'natureza_financeira', label:'Como é estruturada a tabela de naturezas financeiras?', type:'text' },
      { id:'centro_custo', label:'Usa centro de custo?', type:'yn' },
      { id:'cc_hierarquia', label:'Hierarquia de centros de custo (níveis)', type:'text', dep:'centro_custo' },
      { id:'departamento',  label:'Vincula lançamentos a departamento?', type:'yn' },
      { id:'projeto_vinculo', label:'Vincula lançamentos a projeto/obra?', type:'yn' }
    ]},
    { section:'Contas a Pagar', qs:[
      { id:'tipos_documento', label:'Tipos de documento usados (NF, Boleto, Fatura, Duplicata...)', type:'list', options:['NF','Boleto','Fatura','Duplicata','DDA','Outro'] },
      { id:'aprovacao_cp', label:'Existe workflow de aprovação?', type:'yn' },
      { id:'aprovacao_alcadas', label:'Como são as alçadas de aprovação?', type:'text', dep:'aprovacao_cp' },
      { id:'rateio_cp', label:'Rateio de despesas entre CC/dept?', type:'yn' },
      { id:'retencoes_fontes', label:'Retenções na fonte (IR/INSS/ISS/CSLL/PIS/COFINS)?', type:'yn' },
      { id:'dirf_gera',  label:'DIRF é gerada pelo Fluxus?', type:'yn' },
      { id:'antecipacao', label:'Usa antecipação a fornecedor?', type:'yn' },
      { id:'reembolso',  label:'Controle de reembolso de despesas?', type:'yn' }
    ]},
    { section:'Contas a Receber', qs:[
      { id:'tipos_recebimento', label:'Tipos de recebimento (Boleto, PIX, Cartão, TED...)', type:'list', options:['Boleto','PIX','Cartão','TED','Dinheiro','Cheque','DDA'] },
      { id:'recorrencia', label:'Uso de cobrança recorrente (mensalidades)?', type:'yn' },
      { id:'recorrencia_vol', label:'Volume mensal de boletos recorrentes', type:'text', dep:'recorrencia' },
      { id:'juros_multa', label:'Cálculo de juros/multa por atraso?', type:'yn' },
      { id:'juros_regra', label:'Regra de juros/multa (% dia, mês, fixo)', type:'text', dep:'juros_multa' },
      { id:'negociacao',  label:'Processo de renegociação de dívida?', type:'yn' },
      { id:'protesto_spc', label:'Envio para cartório/SPC/Serasa?', type:'yn' }
    ]},
    { section:'Banco e Conciliação', qs:[
      { id:'n_contas_banc', label:'Quantas contas bancárias (ativas)?', type:'num' },
      { id:'bancos_usados', label:'Bancos em uso', type:'text' },
      { id:'cnab_versao',  label:'Versão CNAB usada (240, 400)', type:'choice', options:['CNAB 240','CNAB 400','Ambos','Outro'] },
      { id:'conciliacao_auto', label:'Conciliação bancária automática?', type:'yn' },
      { id:'conciliacao_freq', label:'Frequência da conciliação', type:'choice', options:['Diária','Semanal','Quinzenal','Mensal'] },
      { id:'ofx_bb', label:'Importa OFX/BB extratos?', type:'yn' }
    ]},
    { section:'Fluxo de Caixa', qs:[
      { id:'fluxo_previsto', label:'Usa fluxo de caixa previsto?', type:'yn' },
      { id:'fluxo_horizonte', label:'Horizonte do fluxo (dias)', type:'text', dep:'fluxo_previsto' },
      { id:'fluxo_cenarios', label:'Trabalha com cenários de fluxo?', type:'yn' },
      { id:'dre_gerencial', label:'Gera DRE gerencial pelo Fluxus?', type:'yn' }
    ]},
    { section:'Integrações', qs:[
      { id:'int_saldus',  label:'Integra automaticamente com Saldus (contábil)?', type:'yn' },
      { id:'int_nucleus', label:'Integra com Nucleus (faturamento)?', type:'yn' },
      { id:'int_labore',  label:'Integra com Labore (folha → Fluxus)?', type:'yn' },
      { id:'int_classis', label:'Integra com Classis (mensalidade)?', type:'yn' },
      { id:'int_externas', label:'Integrações externas (BI, ERP satélite, bancos)?', type:'text' }
    ]},
    { section:'Relatórios e Dashboards', qs:[
      { id:'rel_padrao',  label:'Relatórios padrão atendem?', type:'yn' },
      { id:'rel_custom',  label:'Relatórios customizados (quais)?', type:'text' },
      { id:'bi_fluxus',   label:'Usa RM Bis/BI para Fluxus?', type:'yn' },
      { id:'portal_gestor', label:'Portal do gestor para aprovações?', type:'yn' }
    ]},
    { section:'Processos Críticos', qs:[
      { id:'fechamento_mensal', label:'Fechamento mensal do Fluxus (em dias)', type:'text' },
      { id:'retrabalho',  label:'Existe retrabalho recorrente no processo?', type:'text' },
      { id:'dores_atuais',label:'Principais dores do cliente no Fluxus atual', type:'text' },
      { id:'expectativas',label:'Expectativas/objetivos da implantação', type:'text' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM SALDUS — Contábil (48 perguntas)
  // ══════════════════════════════════════════════════════════
  saldus: [
    { section:'Plano de Contas', qs:[
      { id:'plano_niveis', label:'Quantos níveis no plano de contas?', type:'num' },
      { id:'plano_origem', label:'Plano segue padrão (TOTVS, Contábil-Fiscal, próprio)?', type:'choice', options:['Padrão TOTVS','Contábil-Fiscal','Próprio','Misto'] },
      { id:'ifrs',         label:'Adota IFRS (demonstrações em padrão internacional)?', type:'yn' },
      { id:'dupla_visao',  label:'Dupla visão (gerencial + fiscal)?', type:'yn' }
    ]},
    { section:'Lançamentos', qs:[
      { id:'tipos_lancamentos', label:'Tipos de lançamento em uso', type:'list', options:['Manual','Automático (integração)','Recorrente','Provisão','Ajuste'] },
      { id:'integracao_auto', label:'% de lançamentos que vêm integrados (não manuais)', type:'text' },
      { id:'lote_lcto',    label:'Usa lotes de lançamento?', type:'yn' },
      { id:'revisao_antes_efetiva', label:'Processo de revisão antes de efetivar?', type:'yn' }
    ]},
    { section:'Integrações Contábeis', qs:[
      { id:'int_fluxus',   label:'Integração Fluxus → Saldus funciona corretamente?', type:'yn' },
      { id:'int_labore',   label:'Integração Labore → Saldus (folha)?', type:'yn' },
      { id:'int_nucleus',  label:'Integração Nucleus → Saldus (faturamento/estoque)?', type:'yn' },
      { id:'int_atf',      label:'Integração com Ativo Fixo (depreciação)?', type:'yn' },
      { id:'falhas_int',   label:'Falhas recorrentes em alguma integração?', type:'text' }
    ]},
    { section:'Fechamento Mensal', qs:[
      { id:'dias_fechamento', label:'Quantos dias leva o fechamento mensal?', type:'num' },
      { id:'checklist_fech', label:'Usa checklist de fechamento?', type:'yn' },
      { id:'apuracao_resultado', label:'Apuração automática de resultado?', type:'yn' },
      { id:'conciliacoes_fech', label:'Quais conciliações (contas, fornecedores, estoque...)?', type:'text' }
    ]},
    { section:'SPED e Obrigações', qs:[
      { id:'ecd',          label:'SPED ECD (Contábil)', type:'choice', options:['Gera pelo Saldus','Externo','Não gera'] },
      { id:'ecf',          label:'SPED ECF (Fiscal)', type:'choice', options:['Gera pelo Saldus','Externo','Não gera'] },
      { id:'fcont',        label:'FCont/LALUR/LACS', type:'choice', options:['Gera pelo Saldus','Externo','Não gera'] },
      { id:'dmpl',         label:'DMPL (patrimônio líquido)?', type:'yn' }
    ]},
    { section:'Relatórios Contábeis', qs:[
      { id:'balancete',    label:'Gera balancete padrão?', type:'yn' },
      { id:'dre_saldus',   label:'Gera DRE?', type:'yn' },
      { id:'balanco',      label:'Gera balanço patrimonial?', type:'yn' },
      { id:'rel_custom_saldus', label:'Relatórios customizados', type:'text' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM LABORE — Folha (85 perguntas)
  // ══════════════════════════════════════════════════════════
  labore: [
    { section:'Estrutura Organizacional', qs:[
      { id:'n_funcionarios', label:'Total de funcionários ativos', type:'num' },
      { id:'regime',       label:'Regimes (CLT, Estatutário, PJ, Autônomo)', type:'list', options:['CLT','Estatutário','PJ','Autônomo','Estagiário','Jovem Aprendiz'] },
      { id:'sindicatos',   label:'Quantos sindicatos diferentes?', type:'num' },
      { id:'acordos',      label:'Usa acordos/convenções coletivas distintos?', type:'yn' }
    ]},
    { section:'Cadastros', qs:[
      { id:'secoes',       label:'Quantas seções/departamentos?', type:'text' },
      { id:'cargos_sal',   label:'Tabela de cargos e salários estruturada?', type:'yn' },
      { id:'centros_custo_folha', label:'Rateio de folha por centro de custo?', type:'yn' },
      { id:'lotacao_fisica', label:'Controla lotação física (local trabalho)?', type:'yn' }
    ]},
    { section:'Eventos e Rubricas', qs:[
      { id:'n_eventos',    label:'Quantos eventos (rubricas) cadastrados?', type:'text' },
      { id:'eventos_custom', label:'Eventos customizados com fórmula visual?', type:'yn' },
      { id:'eventos_qtd_custom', label:'Quantos eventos customizados?', type:'text', dep:'eventos_custom' },
      { id:'formulas_complexas', label:'Fórmulas envolvendo histórico, buscas, cálculos condicionais?', type:'yn' },
      { id:'insalubridade', label:'Adicional de insalubridade/periculosidade?', type:'yn' },
      { id:'noturno',      label:'Cálculo de adicional noturno?', type:'yn' },
      { id:'hora_extra',   label:'Regras de hora extra (50%, 100%, DSR)?', type:'text' }
    ]},
    { section:'Cálculo Mensal', qs:[
      { id:'rotina_mensal', label:'Processo do fechamento mensal (passos)', type:'text' },
      { id:'periodo_apuracao', label:'Período de apuração (dia X a Y)', type:'text' },
      { id:'adto_salario', label:'Paga adiantamento salarial?', type:'yn' },
      { id:'adto_regra',   label:'Regra de adiantamento (% salário, valor fixo)', type:'text', dep:'adto_salario' },
      { id:'vt_vale_ref',  label:'VT, VR/VA, auxílios (como são calculados)', type:'text' },
      { id:'pensao_alim',  label:'Pensão alimentícia (percentual, líquido, bruto)', type:'text' }
    ]},
    { section:'Férias e 13º', qs:[
      { id:'ferias_colet', label:'Férias coletivas?', type:'yn' },
      { id:'ferias_prog',  label:'Programação automática de férias?', type:'yn' },
      { id:'ferias_abono', label:'Uso de abono pecuniário (10 dias)?', type:'yn' },
      { id:'decimo_1a2', label:'Pagamento 13º (1ª e 2ª parcela)', type:'yn' },
      { id:'decimo_adto_ferias', label:'13º junto com férias?', type:'yn' }
    ]},
    { section:'Rescisão', qs:[
      { id:'tipos_rescisao', label:'Tipos de rescisão comuns (pedido, sem justa causa, acordo)', type:'list', options:['Pedido','Sem justa causa','Com justa causa','Acordo (Reforma)','Aposentadoria','Óbito'] },
      { id:'aviso_previo', label:'Cálculo de aviso prévio (trabalhado/indenizado)', type:'text' },
      { id:'homologacao',  label:'Processo de homologação (sindicato/MTE)', type:'yn' },
      { id:'grrf',         label:'Gera GRRF automaticamente?', type:'yn' }
    ]},
    { section:'eSocial', qs:[
      { id:'esocial_status', label:'Status atual do eSocial', type:'choice', options:['Em produção, OK','Em produção com rejeições','Em homologação','Não implementado'] },
      { id:'esocial_eventos', label:'Eventos em uso (S-1200, S-1210, S-2200, S-2299, S-2300...)', type:'text' },
      { id:'esocial_rejeicoes', label:'% de rejeições mensais', type:'text' },
      { id:'dctfweb',      label:'DCTFWeb — Labore gera corretamente?', type:'yn' },
      { id:'efd_reinf',    label:'EFD-Reinf (R-1000, R-2010...)', type:'yn' },
      { id:'mit_manad',    label:'MIT/MANAD (se aplicável)', type:'yn' }
    ]},
    { section:'Benefícios e Convênios', qs:[
      { id:'vt_benef',     label:'Vale-transporte (gestão e desconto)', type:'yn' },
      { id:'plano_saude',  label:'Plano de saúde (coparticipação?)', type:'yn' },
      { id:'plano_odont',  label:'Plano odontológico?', type:'yn' },
      { id:'pl_participacao', label:'PLR (Programa de Participação nos Lucros)?', type:'yn' },
      { id:'emprestimos_consignados', label:'Empréstimos consignados?', type:'yn' }
    ]},
    { section:'Integrações e Portal', qs:[
      { id:'int_chronus',  label:'Integração com Chronus (Ponto) OK?', type:'yn' },
      { id:'int_gpessoas', label:'Integração com Gestão de Pessoas?', type:'yn' },
      { id:'int_fluxus_labore', label:'Labore → Fluxus (pagamentos) OK?', type:'yn' },
      { id:'portal_colab', label:'Portal do colaborador em uso?', type:'yn' },
      { id:'portal_func',  label:'Funcionalidades do portal', type:'list', options:['Contracheque','Férias','Informe de rendimentos','Empréstimos','Solicitações','Alteração cadastral'] }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM CHRONUS — Ponto (55 perguntas)
  // ══════════════════════════════════════════════════════════
  chronus: [
    { section:'Tipo de REP e Infraestrutura', qs:[
      { id:'tipo_rep',     label:'Tipo de REP em uso', type:'choice', options:['REP-C (convencional)','REP-A (alternativo)','REP-P (programa)','Sem REP','Portaria 671/2021'] },
      { id:'fabricante_rep', label:'Fabricante do REP', type:'text' },
      { id:'n_reps',       label:'Quantos REPs distribuídos?', type:'num' },
      { id:'biometria',    label:'Usa biometria (digital, facial)?', type:'yn' },
      { id:'portaria_671', label:'Já adequado à Portaria 671/2021?', type:'yn' }
    ]},
    { section:'Jornadas e Escalas', qs:[
      { id:'tipos_jornada', label:'Tipos de jornada em uso', type:'list', options:['Padrão 8h','Escala 6x1','Escala 12x36','Flexível','Intermitente','Home office'] },
      { id:'turno_fixo',   label:'Turno fixo ou rotativo?', type:'choice', options:['Fixo','Rotativo','Misto'] },
      { id:'intrajornada', label:'Controle de intrajornada (almoço)?', type:'yn' },
      { id:'tolerancia',   label:'Tolerâncias de entrada/saída (minutos)', type:'text' }
    ]},
    { section:'Marcações e Apuração', qs:[
      { id:'origem_marcacoes', label:'Origem das marcações', type:'list', options:['REP físico','App mobile','Web','Integração ponto externo','Manual'] },
      { id:'app_mobile',   label:'Uso de app mobile?', type:'yn' },
      { id:'geolocalizacao', label:'Exige geolocalização nas marcações?', type:'yn' },
      { id:'apuracao_auto', label:'Apuração automática diária?', type:'yn' },
      { id:'espelho_ponto', label:'Espelho de ponto impresso/digital?', type:'choice', options:['Impresso','Digital','Ambos'] }
    ]},
    { section:'Banco de Horas e H.E.', qs:[
      { id:'banco_horas',  label:'Controle de banco de horas?', type:'yn' },
      { id:'bh_limite',    label:'Limite máximo (horas)', type:'text', dep:'banco_horas' },
      { id:'bh_prazo_compensacao', label:'Prazo de compensação', type:'text', dep:'banco_horas' },
      { id:'hora_extra_regras', label:'Regras de hora extra e adicionais', type:'text' },
      { id:'dsr_calculo',  label:'Cálculo de DSR automatizado?', type:'yn' }
    ]},
    { section:'Ocorrências e Ausências', qs:[
      { id:'afastamentos', label:'Tipos de afastamento (INSS, atestado, férias, licenças)', type:'list', options:['INSS','Atestado médico','Férias','Licença maternidade','Licença paternidade','Ausência justificada','Abono','Outros'] },
      { id:'atestado_digital', label:'Atestados digitalizados/armazenados?', type:'yn' },
      { id:'aprovacao_ocor', label:'Workflow de aprovação de ocorrências?', type:'yn' }
    ]},
    { section:'Integração com Labore', qs:[
      { id:'int_chronus_labore', label:'Integração automática Chronus → Labore?', type:'yn' },
      { id:'freq_int',     label:'Frequência da integração', type:'choice', options:['Tempo real','Diária','Semanal','Mensal (fechamento)'] },
      { id:'falhas_int_ch', label:'Falhas recorrentes na integração?', type:'text' },
      { id:'afd_apdt_api', label:'Geração de AFD/AFDT/API?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM NUCLEUS — Back-office (65 perguntas)
  // ══════════════════════════════════════════════════════════
  nucleus: [
    { section:'Estrutura e Cadastros', qs:[
      { id:'vol_itens',    label:'Volume de itens/produtos cadastrados', type:'text' },
      { id:'classificacao', label:'Estrutura de classificação de produtos', type:'text' },
      { id:'unid_medida',  label:'Unidades de medida e conversões', type:'text' },
      { id:'curva_abc',    label:'Gestão por curva ABC?', type:'yn' },
      { id:'codigo_barras', label:'Uso de código de barras/EAN?', type:'yn' }
    ]},
    { section:'Compras', qs:[
      { id:'requisicao',   label:'Processo de requisição de compra', type:'text' },
      { id:'workflow_compras', label:'Workflow de aprovação?', type:'yn' },
      { id:'cotacao',      label:'Uso de cotação eletrônica?', type:'yn' },
      { id:'pedido_compra', label:'Pedido de compra integrado ao recebimento?', type:'yn' },
      { id:'qualificacao_forn', label:'Qualificação de fornecedores?', type:'yn' }
    ]},
    { section:'Estoque', qs:[
      { id:'n_depositos',  label:'Quantos depósitos/almoxarifados?', type:'num' },
      { id:'inventario',   label:'Periodicidade do inventário', type:'choice', options:['Mensal','Trimestral','Semestral','Anual','Cíclico'] },
      { id:'reserva_estoque', label:'Reserva de estoque para pedidos?', type:'yn' },
      { id:'custo_medio',  label:'Método de custeio (médio, PEPS, padrão)', type:'choice', options:['Médio','PEPS','Padrão','UEPS'] },
      { id:'saldo_negativo', label:'Permite saldo negativo?', type:'yn' }
    ]},
    { section:'Faturamento e Documentos', qs:[
      { id:'tipos_docs',   label:'Tipos de documento emitidos', type:'list', options:['NFe','NFSe','NFCe','Boleto','Recibo','Orçamento','Pedido','Romaneio'] },
      { id:'vol_nfe',      label:'Volume mensal de NFe', type:'text' },
      { id:'nfe_rejeicoes', label:'% de rejeições na SEFAZ', type:'text' },
      { id:'carta_correcao', label:'Uso de carta de correção?', type:'yn' },
      { id:'cancelamento_nfe', label:'Processo de cancelamento NFe?', type:'text' }
    ]},
    { section:'Fiscal', qs:[
      { id:'regime_trib',  label:'Regime tributário', type:'choice', options:['Simples Nacional','Lucro Presumido','Lucro Real','Misto'] },
      { id:'sped_fiscal',  label:'SPED Fiscal (EFD-ICMS/IPI)', type:'choice', options:['Gera pelo RM','Externo','Não gera'] },
      { id:'sped_contrib', label:'EFD-Contribuições', type:'choice', options:['Gera pelo RM','Externo','Não gera'] },
      { id:'st_icms',      label:'Trabalha com substituição tributária?', type:'yn' },
      { id:'difal',        label:'Cálculo de DIFAL (EC 87/15)?', type:'yn' },
      { id:'reforma_trib', label:'Preparação para Reforma (CBS/IBS/IS)', type:'choice', options:['Não iniciada','Em estudo','Em andamento','Parcial'] }
    ]},
    { section:'Integrações', qs:[
      { id:'int_fluxus_nuc', label:'Integração Nucleus → Fluxus (CR/CP)?', type:'yn' },
      { id:'int_saldus_nuc', label:'Integração Nucleus → Saldus?', type:'yn' },
      { id:'int_ecommerce', label:'Integração com e-commerce?', type:'yn' },
      { id:'edi',          label:'EDI com fornecedores/clientes?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM GPESSOAS — Gestão de Pessoas (50 perguntas)
  // ══════════════════════════════════════════════════════════
  gpessoas: [
    { section:'Estrutura e Cargos', qs:[
      { id:'plano_cargos', label:'Plano de cargos e salários formalizado?', type:'yn' },
      { id:'niveis',       label:'Níveis hierárquicos?', type:'num' },
      { id:'competencias', label:'Gestão por competências?', type:'yn' },
      { id:'descrições_cargos', label:'Descrições de cargo documentadas?', type:'yn' }
    ]},
    { section:'Recrutamento e Seleção', qs:[
      { id:'r_s_rm',       label:'Recrutamento e Seleção é feito no RM?', type:'yn' },
      { id:'banco_talentos', label:'Banco de talentos?', type:'yn' },
      { id:'processo_seletivo', label:'Etapas do processo seletivo', type:'text' },
      { id:'integracao_admissao', label:'Integração Admissão → Labore?', type:'yn' }
    ]},
    { section:'Treinamento', qs:[
      { id:'treinamentos_controle', label:'Controle de treinamentos no RM?', type:'yn' },
      { id:'tna',          label:'Análise de necessidades (TNA)?', type:'yn' },
      { id:'certificacoes', label:'Controle de certificações/reciclagens?', type:'yn' }
    ]},
    { section:'Avaliação e Desempenho', qs:[
      { id:'aval_desempenho', label:'Avaliação de desempenho?', type:'yn' },
      { id:'tipo_aval',    label:'Tipo de avaliação', type:'choice', options:['90°','180°','360°','Misto'] },
      { id:'pdi',          label:'PDI (Plano de Desenvolvimento Individual)?', type:'yn' }
    ]},
    { section:'Workflow e Portal', qs:[
      { id:'wf_ferias',    label:'Workflow de solicitação de férias?', type:'yn' },
      { id:'wf_desligamento', label:'Workflow de desligamento?', type:'yn' },
      { id:'wf_alteracoes', label:'Workflow de alteração cadastral?', type:'yn' },
      { id:'portal_gestor_gp', label:'Portal do gestor (aprovações, indicadores)?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM CLASSIS — Educacional (60 perguntas)
  // ══════════════════════════════════════════════════════════
  classis: [
    { section:'Estrutura Educacional', qs:[
      { id:'niveis_ensino', label:'Níveis de ensino atendidos', type:'list', options:['Ed. Infantil','Fundamental I','Fundamental II','Ensino Médio','Técnico','Graduação','Pós-graduação','EAD'] },
      { id:'qtd_unidades', label:'Quantas unidades/campus?', type:'num' },
      { id:'qtd_alunos',   label:'Total de alunos ativos', type:'num' },
      { id:'presencial_ead', label:'Presencial, EAD ou híbrido?', type:'choice', options:['100% Presencial','100% EAD','Híbrido'] }
    ]},
    { section:'Matrícula', qs:[
      { id:'periodo_matricula', label:'Período de matrícula (semestral, anual)', type:'choice', options:['Semestral','Anual','Contínuo'] },
      { id:'rematricula_auto', label:'Rematrícula automática?', type:'yn' },
      { id:'doc_exigida',  label:'Documentos exigidos (lista)', type:'text' },
      { id:'matricula_online', label:'Matrícula online disponível?', type:'yn' },
      { id:'analise_credito', label:'Análise de crédito/SPC antes da matrícula?', type:'yn' },
      { id:'aprovacao_matricula', label:'Workflow de aprovação?', type:'yn' }
    ]},
    { section:'Contrato Educacional', qs:[
      { id:'tipos_contrato', label:'Tipos de contrato (integral, meio período, bolsista)', type:'list', options:['Integral','Meio período','Bolsista','Convênio','FIES','PROUNI'] },
      { id:'reajuste',     label:'Reajuste anual automático?', type:'yn' },
      { id:'contrato_digital', label:'Contrato digital (assinatura eletrônica)?', type:'yn' }
    ]},
    { section:'Cobrança e Mensalidade', qs:[
      { id:'geracao_boletos', label:'Geração automática de boletos recorrentes?', type:'yn' },
      { id:'freq_cobranca', label:'Frequência da cobrança', type:'choice', options:['Mensal','Semestral','Anual'] },
      { id:'descontos',    label:'Regras de desconto (pontualidade, irmão, bolsa)', type:'text' },
      { id:'renegociacao_aluno', label:'Processo de renegociação de inadimplência?', type:'yn' },
      { id:'cobranca_externa', label:'Envio a escritório de cobrança?', type:'yn' }
    ]},
    { section:'Acadêmico', qs:[
      { id:'diario_classe', label:'Diário de classe no Classis?', type:'yn' },
      { id:'notas_freq',   label:'Controle de notas e frequência?', type:'yn' },
      { id:'periodos_avaliacao', label:'Períodos de avaliação (bimestre, trimestre)', type:'text' },
      { id:'dependencias', label:'Controle de dependências e adaptações?', type:'yn' }
    ]},
    { section:'Portal e Integrações', qs:[
      { id:'portal_aluno', label:'Portal do aluno?', type:'yn' },
      { id:'portal_func',  label:'Funcionalidades', type:'list', options:['Boletos','Notas','Frequência','Contrato','Biblioteca','Secretaria online'] },
      { id:'int_financeiro', label:'Integração Classis → Fluxus (mensalidade)?', type:'yn' },
      { id:'ambientes_ead', label:'Integração com Moodle/AVA?', type:'yn' },
      { id:'app_aluno',    label:'App mobile para alunos?', type:'yn' }
    ]},
    { section:'Censo e Obrigações', qs:[
      { id:'censo_escolar', label:'Gera Censo Escolar/Educacenso?', type:'yn' },
      { id:'enade',        label:'Gestão de alunos ENADE?', type:'yn' },
      { id:'mec_portaria', label:'Atende requisitos MEC (credenciamento)?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM TCOP — Construção/Obras (40 perguntas)
  // ══════════════════════════════════════════════════════════
  tcop: [
    { section:'Tipo de Operação', qs:[
      { id:'tipos_op',     label:'Tipo de operação', type:'list', options:['Incorporação','Construção própria','Construção para terceiros','Administração de obras','Reforma'] },
      { id:'n_obras',      label:'Obras simultâneas', type:'text' },
      { id:'duracao_media', label:'Duração média das obras (meses)', type:'text' }
    ]},
    { section:'Planejamento', qs:[
      { id:'epc',          label:'Estrutura de composição de custo (EPC)?', type:'yn' },
      { id:'cronograma_fisico', label:'Cronograma físico detalhado?', type:'yn' },
      { id:'integra_ms_project', label:'Integração com MS Project ou outro?', type:'yn' }
    ]},
    { section:'Orçamento', qs:[
      { id:'orc_padrao',   label:'Orçamento padrão (SINAPI, TCPO)?', type:'choice', options:['SINAPI','TCPO','Próprio','Misto'] },
      { id:'aditivo_contrato', label:'Controle de aditivos contratuais?', type:'yn' },
      { id:'revisao_orc',  label:'Frequência de revisão orçamentária', type:'choice', options:['Mensal','Trimestral','Por marco','Eventual'] }
    ]},
    { section:'Medição', qs:[
      { id:'periodicidade_medicao', label:'Periodicidade das medições', type:'choice', options:['Semanal','Quinzenal','Mensal'] },
      { id:'aprov_medicao', label:'Workflow de aprovação de medição?', type:'yn' },
      { id:'curva_s',      label:'Usa curva S de avanço?', type:'yn' }
    ]},
    { section:'Apropriação de Custos', qs:[
      { id:'apropria_mo',  label:'Apropriação de mão-de-obra?', type:'yn' },
      { id:'apropria_material', label:'Apropriação de material à obra?', type:'yn' },
      { id:'apropria_equip', label:'Apropriação de equipamentos?', type:'yn' },
      { id:'reembolso_despesa', label:'Reembolso de despesas campo?', type:'yn' }
    ]},
    { section:'Integrações TCOP', qs:[
      { id:'int_fluxus_tcop', label:'TCOP → Fluxus (pagamentos)?', type:'yn' },
      { id:'int_nucleus_tcop', label:'TCOP → Nucleus (compras/estoque)?', type:'yn' },
      { id:'int_labore_tcop', label:'TCOP → Labore (folha campo)?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM TCGI — Agrícola/Gestão Integrada (35 perguntas)
  // ══════════════════════════════════════════════════════════
  tcgi: [
    { section:'Perfil Agrícola', qs:[
      { id:'tipo_agro',    label:'Tipo de operação', type:'list', options:['Grãos','Pecuária','Cana','Café','Fruticultura','Hortifruti','Silvicultura'] },
      { id:'area_hectares', label:'Área total (hectares)', type:'num' },
      { id:'safras_ano',   label:'Safras por ano', type:'num' }
    ]},
    { section:'Talhões e Unidades', qs:[
      { id:'n_fazendas',   label:'Quantas fazendas/unidades?', type:'num' },
      { id:'n_talhoes',    label:'Quantos talhões?', type:'num' },
      { id:'mapeamento_gps', label:'Mapeamento georreferenciado?', type:'yn' }
    ]},
    { section:'Planejamento Safra', qs:[
      { id:'plantio',      label:'Planejamento de plantio?', type:'yn' },
      { id:'controle_insumos', label:'Controle de insumos (sementes, fertilizantes, defensivos)?', type:'yn' },
      { id:'rastreabilidade', label:'Rastreabilidade por lote/talhão?', type:'yn' },
      { id:'receituario_agro', label:'Receituário agronômico digital?', type:'yn' }
    ]},
    { section:'Operações', qs:[
      { id:'apontamento_campo', label:'Apontamento de operações de campo?', type:'yn' },
      { id:'maquinas_frota', label:'Gestão de frota/máquinas?', type:'yn' },
      { id:'manutencao_agro', label:'Controle de manutenção preventiva?', type:'yn' }
    ]},
    { section:'Colheita e Custo', qs:[
      { id:'colheita_apont', label:'Apontamento da colheita?', type:'yn' },
      { id:'custo_hectare', label:'Apuração de custo por hectare/talhão?', type:'yn' },
      { id:'silos_armazenagem', label:'Gestão de silos/armazenagem?', type:'yn' }
    ]},
    { section:'Integrações TCGI', qs:[
      { id:'int_fluxus_tcgi', label:'TCGI → Fluxus?', type:'yn' },
      { id:'int_nucleus_tcgi', label:'TCGI → Nucleus (comercialização)?', type:'yn' },
      { id:'telemetria',   label:'Integração com telemetria (tratores, drones)?', type:'yn' }
    ]}
  ],

  // ══════════════════════════════════════════════════════════
  // RM AGILIS — Agendamento/Saúde (30 perguntas)
  // ══════════════════════════════════════════════════════════
  agilis: [
    { section:'Perfil da Operação', qs:[
      { id:'tipo_saude',   label:'Tipo de operação', type:'list', options:['Clínica ambulatorial','Hospital','Laboratório','Imagem/Diagnóstico','Home care','Consultório'] },
      { id:'especialidades', label:'Especialidades atendidas', type:'text' },
      { id:'n_profissionais', label:'Quantidade de profissionais', type:'num' }
    ]},
    { section:'Agendamento', qs:[
      { id:'agenda_online', label:'Agendamento online (portal, app)?', type:'yn' },
      { id:'agenda_multi_canal', label:'Canais (site, telefone, WhatsApp)?', type:'list', options:['Site','App','Telefone','WhatsApp','Presencial','Chat'] },
      { id:'reagend_cancel', label:'Reagendamento/cancelamento automático?', type:'yn' },
      { id:'lembretes',    label:'Envio de lembretes (SMS/email/WhatsApp)?', type:'yn' }
    ]},
    { section:'Atendimento', qs:[
      { id:'prontuario',   label:'Prontuário eletrônico?', type:'yn' },
      { id:'receita_digital', label:'Receita digital?', type:'yn' },
      { id:'atestado_digital_med', label:'Atestado médico digital?', type:'yn' }
    ]},
    { section:'Convênios (TISS)', qs:[
      { id:'convenios',    label:'Trabalha com convênios?', type:'yn' },
      { id:'qtd_convenios', label:'Quantos convênios?', type:'text', dep:'convenios' },
      { id:'tiss_envio',   label:'Envio TISS/TUSS automatizado?', type:'yn', dep:'convenios' },
      { id:'glosas',       label:'Controle de glosas?', type:'yn', dep:'convenios' }
    ]},
    { section:'Financeiro Saúde', qs:[
      { id:'particular',   label:'% atendimento particular', type:'text' },
      { id:'faturamento_medico', label:'Rateio/repasse para médicos?', type:'yn' },
      { id:'int_fluxus_agilis', label:'Agilis → Fluxus (recebimento)?', type:'yn' }
    ]}
  ]
};

// Export no padrão existente BeeIT
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { _M41RM_MODS, _M41RM_QDB };
}
