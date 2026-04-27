# Sync HUD — Regras de Atualização e Economia de Tokens

## WORKFLOW CRÍTICO DE ATUALIZAÇÃO

O arquivo `Governanca/bdapowered.html` (e sua cópia `bdapowered.html`) contém o histórico
completo e o planejamento do projeto na variável `DEFAULT_CARDS`.

### Regra estrita de sessão

Ao trabalhar em novas implementações:

1. **Processe no máximo 2 ou 3 tarefas por sessão.**
2. **Ao concluir essas tarefas, você é OBRIGADO a:**
   - Atualizar `docs/ROADMAP.md` refletindo o novo status das tarefas concluídas.
   - Atualizar a variável `DEFAULT_CARDS` dentro de `Governanca/bdapowered.html`, ajustando
     o campo `col` de cada card concluído (`'wip'` ou `'todo'` → `'done'`) e o campo `sprint`.
3. **Fazer o commit das alterações em `docs/ROADMAP.md`** (o HUD não entra no commit — está no .gitignore).
4. **PARAR a execução imediatamente** após o commit.
5. **Sugerir a próxima tarefa prioritária em uma nova sessão** para economizar tokens e manter o contexto limpo.

### Por que esse fluxo existe

- O contexto do Claude tem limite. Sessões longas degradam qualidade e desperdiçam tokens.
- O `DEFAULT_CARDS` é a fonte de verdade do estado do projeto. Desatualizado = projeto cego.
- Commits atômicos e curtos facilitam revisão e rollback.

### Não fazer

- Não executar mais de 3 tarefas em sequência sem atualizar o HUD.
- Não commitar `Governanca/bdapowered.html` — ele é privado e está no `.gitignore`.
- Não deixar o ROADMAP.md dessincronizado com o estado real de desenvolvimento.
