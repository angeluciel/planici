# Revisão Consolidada — RFC Planici

Documento revisado: `docs/RFC.md` (v1.0, 10/03/2026)
Data da consolidação: 22/06/2026
Fontes: `review-logic-reqs.md` (Lógica/Requisitos), `review-logic-arch.md` (Arquitetura), `review-legal-spelling.md` (LGPD + Ortografia/Gramática)

---

## 1. Resumo Executivo

O RFC do Planici é abrangente e bem estruturado, cobrindo requisitos funcionais, não funcionais, regras de negócio, arquitetura, segurança e LGPD. No entanto, a revisão identificou **103 achados**, sendo **19 de impacto Alto**, que indicam riscos relevantes antes da implementação.

O problema mais sério é a **inconsistência sistemática entre requisitos e regras de negócio**: os RFs de exclusão (RF-08/12/16) falam em "remover", enquanto as RNs e os fluxos exigem inativação (soft delete). Some-se a isso **conflitos de arquitetura x requisitos** — a réplica PostgreSQL master-slave assíncrona compromete leitura-após-escrita em agenda e financeiro, e o isolamento por RLS não tem mecanismo de propagação de `tenant_id` especificado para a API stateless escalada (risco de vazamento entre tenants).

Há **tensão entre a stack distribuída ambiciosa** (CQRS, master-slave, RabbitMQ, observabilidade) e o contexto declarado de baixo custo, projeto individual e prazo de 13 semanas, claramente subestimado.

No campo **jurídico**, lacunas de LGPD são críticas: dados sensíveis de saúde sem o tratamento diferenciado do art. 11, base legal ausente/incorreta (aceite contratual tratado como "consentimento"), e direitos do titular classificados como "Wants". O documento também expõe um CNPJ real.

O RFC é uma base sólida, mas **não está pronto para implementação** sem corrigir as contradições de requisitos, reconciliar arquitetura com orçamento/prazo e endereçar as lacunas de LGPD.

---

## 2. Top 5 Problemas Críticos (Alto Impacto)

### #1 — Contradição sistemática de soft delete (RF x RN)
Ref.: LÓGICA-001, 002, 003, 032
Os RFs de exclusão (RF-08 cliente, RF-12 procedimento, RF-16 plano) descrevem "remover" sem condição, mas as RNs (RN-05/06/08/24), os UCs (UC-09/14/19) e o Fluxo 3 exigem inativação para entidades com histórico. Contradição direta que afeta integridade de dados e comportamento do sistema.
**Ação:** Reescrever os três RFs distinguindo "editar", "inativar" e "excluir", permitindo exclusão definitiva apenas sem histórico vinculado.

### #2 — Réplica master-slave assíncrona + RLS sem garantia (arquitetura x requisitos)
Ref.: ARQUIT-001, 002, 028
A replicação assíncrona quebra read-after-write em fluxos críticos (criar agendamento → verificar conflito RN-10; registrar pagamento → resumo financeiro RN-15). Além disso, o RLS (RNF-07) depende de propagar `tenant_id` ao contexto de sessão, não especificado para a API stateless escalada com pool de conexões e réplica — risco de vazamento entre tenants e de overbooking por concorrência.
**Ação:** Definir roteamento read-after-write (ler do master quando necessário), garantir detecção de conflito no nível do banco (`EXCLUDE USING gist` / `FOR UPDATE`), e especificar injeção/reset de `tenant_id` por transação. Para o MVP, considerar instância única.

### #3 — KPI "zero perda de dados" incompatível com RPO de 24h
Ref.: LÓGICA-025
O KPI da seção 1.6 exige "zero perda de dados", mas o RNF-06 (backup diário, RPO ≤ 24h) e a replicação assíncrona admitem perda de até 24h em desastre e da última transação no failover.
**Ação:** Reconciliar — reduzir o RPO (replicação síncrona/WAL archiving) ou ajustar o KPI para "zero perda em operação normal; RPO ≤ 24h em desastre".

### #4 — Lacunas críticas de LGPD (dados sensíveis e base legal)
Ref.: LGPD-003, 001, 008, 005, 002
Dados sensíveis de saúde (terapeutas/nutricionistas/psicólogos) tratados como apenas "potencialmente sensíveis", sem o regime do art. 11 (consentimento específico, RIPD). Base legal do tratamento não identificada (art. 7) e aceite de Termos tratado erroneamente como "consentimento". Direitos do titular (acesso, portabilidade, exclusão) classificados como "Wants", contrariando o caráter incondicional dos arts. 18/19. Papéis controlador/operador (art. 39) indefinidos.
**Ação:** Mapear bases legais por finalidade; reconhecer dados sensíveis com tratamento diferenciado; garantir os direitos do titular já no MVP com canal e prazo (art. 19); formalizar cláusula controlador/operador.

### #5 — Cronograma subestimado e link público sem RF nem proteção
Ref.: ARQUIT-021, 022, LÓGICA-031, ARQUIT-025
As 13 semanas comprimem módulos pesados em 1 semana cada (M7: formulários dinâmicos + workspace + labels + notificações multicanal). O passo central do onboarding ("criar tenant") não tem RF formal (RF-01 a RF-43). O link público não autenticado (RF-23) não tem CAPTCHA, anti-enumeração de slug nem anti-spam de solicitações.
**Ação:** Repriorizar o MVP (mover WANTS para fora), dividir M7, criar RF de "criar/selecionar tenant", e especificar controles anti-abuso do link público.

---

## 3. Tabela de Achados por Categoria

| Categoria | Total | Alto | Médio | Baixo |
|---|---|---|---|---|
| Lógica / Requisitos | 36 | 6 | 17 | 13 |
| Arquitetura | 31 | 8 | 16 | 7 |
| LGPD / Jurídico | 10 | 5 | 5 | 0 |
| Ortografia / Gramática | 26 | 0 | 9 | 17 |
| **Total** | **103** | **19** | **47** | **37** |

Observação: o achado ORTOG-026 é referência cruzada e não conta como item distinto.

---

## 4. Próximos Passos Recomendados

1. **Corrigir contradições de requisitos (bloqueante)** — Padronizar os RFs de exclusão com as RNs de soft delete; alinhar RFs de notificação (RF-33/34/35) à condicional da RN-17; criar o RF ausente de "criar/selecionar tenant".

2. **Reconciliar arquitetura com contexto real (bloqueante)** — Decidir entre simplificar a stack do MVP (Postgres single-node, fila no banco) ou manter a stack distribuída com prazo/orçamento realistas. Especificar read-after-write, concorrência de overbooking, propagação de `tenant_id` para RLS e componente de object storage (RF-04/RF-38).

3. **Endereçar LGPD antes do desenvolvimento (bloqueante)** — Mapear bases legais (art. 7), tratar dados sensíveis (art. 11), garantir direitos do titular no MVP (arts. 18/19), formalizar controlador/operador (art. 39), indicar Encarregado (art. 41) e plano de incidentes (art. 48). Adicionar aviso de privacidade ao cliente final do link público. Remover/mascarar o CNPJ exposto.

4. **Repriorizar e reescalonar o cronograma** — Reduzir o MVP a um núcleo (agenda + clientes + pagamentos manuais), mover funcionalidades WANTS (multiusuário/RBAC, formulários dinâmicos) para fase posterior, distribuir testes e entregáveis de segurança/LGPD ao longo dos marcos (não concentrar em M8).

5. **Harmonizar métricas e remover ambiguidades** — Unificar os alvos de desempenho (KPI 500ms vs. RNF-01/02) e de "agendamento rápido" (4 min / 5 min / 5 cliques); definir critérios mensuráveis para política de senha, "validação adicional" (RN-25), pagamentos futuros (RN-13) e precedência de disponibilidade (RN-09).

6. **Revisão linguística final** — Corrigir erros de digitação (incl. "Domain-Driver" → "Domain-Driven"), crases indevidas, numeração de seções, e fixar terminologia canônica (procedimento vs. serviço) em um glossário. Padronizar idioma dos cabeçalhos e definir siglas na primeira ocorrência.

7. **Adicionar personas e rastreabilidade** — Incluir persona alinhada à usuária-origem (terapeuta) e personas de colaborador e cliente externo; garantir que toda funcionalidade de UX (verificação de e-mail, dashboard, apelido/slug, sugestão de labels) tenha RF rastreável.

---

*Documento gerado a partir da revisão paralela em três frentes: Lógica/Requisitos, Arquitetura e Jurídico/Linguística.*
