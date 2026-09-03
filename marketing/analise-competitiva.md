# Kuava POS — Análise Competitiva (Moçambique)

*Preparado para: lançamento de produção do vektramz.com — setembro de 2026*
*Contexto: projeto individual, mercado único (Moçambique), sem financiamento externo, sem equipa de vendas.*

## Achado mais importante primeiro

Antes de qualquer comparação de funcionalidades, há uma questão regulatória que pesa mais do que qualquer diferencial de produto: desde maio de 2025, contribuintes que emitem faturas eletronicamente em Moçambique são obrigados a comunicar mensalmente os dados dessas faturas à Autoridade Tributária (AT), num ficheiro no formato SAF-T MZ (XML/CSV/Excel, até 2 MB), submetido através do portal e-Declaração — e essa comunicação só pode ser feita a partir de software **certificado pela AT**. Segundo o que encontrei, a obrigação de usar software certificado aplica-se a quem tem contabilidade organizada, independentemente do volume de negócios, e a quem já usa um programa informático de faturação — havendo também referência a um limiar de volume de negócios (as fontes que encontrei apresentam esse limiar em torno de 50 mil euros, mas é um valor que vi replicado de conteúdo com origem em Portugal, por isso não confio nele como estando correto em Meticais para Moçambique — isto precisa de confirmação direta junto da AT ou de um contabilista moçambicano antes de comunicares isto a clientes).

Confirmei no código da Kuava POS que a fatura atual já guarda NUIT e calcula IVA, mas não existe nenhuma peça de comunicação com a AT nem exportação SAF-T — ainda não é software certificado. Isto significa que, para o segmento de clientes com contabilidade organizada (tipicamente o mesmo segmento que precisa mesmo de emitir faturas formais, não apenas recibos), a Kuava POS não está, hoje, legalmente pronta para ser a ferramenta principal de faturação deles — e todos os concorrentes diretos abaixo já reclamam essa certificação. Isto não é um "recurso em falta" normal — é um risco legal para o cliente que a Kuava tenta servir, e por isso deveria ser o primeiro item a resolver ou a contornar deliberadamente na forma como posicionas e vendes o produto agora, mais do que qualquer outra coisa neste documento.

## Quem são as alternativas reais

Seguindo o exercício de posicionamento habitual (não "quem parece um concorrente", mas "o que o cliente faria se a Kuava não existisse"):

**Concorrentes diretos** — outro software de POS/faturação a competir pelo mesmo orçamento e pela mesma decisão:
- Cegid Vendus
- NetwarePos
- Zumbo Cloud ERP
- Cegid Primavera / Cegid PHC (mais pesados, mas competem pelo mesmo cliente quando este já pensa em "sistema de gestão")

**Alternativas indiretas** — resolvem o problema de forma diferente:
- logicPOS (POS/faturação gratuito e open-source, autoalojado)
- Excel + WhatsApp Business para tirar encomendas e controlar stock manualmente

**Status quo** — o que a maioria dos pequenos negócios moçambicanos provavelmente já faz:
- Caderno físico de vendas + calculadora, sem stock formal, sem faturas — só recibos manuscritos ou nada

Este último grupo é provavelmente o maior mercado em número de negócios, mas também o mais difícil de converter, porque muitos ainda não têm obrigação legal de emitir faturas formais (podem estar no regime simplificado, ISPC) — para eles, a Kuava compete com "não pagar nada por nenhum sistema", não com outro software.

## Perfil dos concorrentes diretos

### Cegid Vendus — o incumbente internacional

Vendus é a face de baixo custo de um grupo bem maior: a Cegid (multinacional francesa de software de gestão) comprou a Primavera e a PHC, e já opera com marca própria em Moçambique (vendus.co.mz), com blog local em português a explicar a comunicação de faturas à AT. Tem certificação AT própria (nº 2230). Os planos vão de aproximadamente €6,25 a €15,83 por mês (faturação anual), cobrindo desde faturação simples até POS de restauração com gestão de stock. Funciona **100% online, sem instalação** — segundo o próprio site, não há modo offline.

Isto é a abertura mais clara para a Kuava: em Moçambique, fora de Maputo, a qualidade e a constância da ligação à internet não são garantidas — um POS que exige ligação permanente é um risco operacional real para uma loja física. A funcionalidade offline-first que acabaste de reforçar com a PWA é uma vantagem competitiva concreta contra o Vendus, não apenas um extra técnico.

### NetwarePos — o concorrente local mais parecido com a Kuava

Feito especificamente para Moçambique, foca-se em lojistas e distribuidores. Funciona offline, emite faturas com NUIT, recibos, notas de crédito e guias de remessa, reclama conformidade com a AT, e faz reconciliação de caixa por método de pagamento (numerário, M-Pesa, e-Mola, M-Kesh). A diferença estrutural mais importante: vende **licença única vitalícia**, não subscrição — paga-se uma vez, sem mensalidades.

Este é provavelmente o concorrente mais direto da Kuava em termos de cliente-alvo (pequeno retalho/distribuição moçambicana), mas o modelo de negócio é o oposto do teu: a Kuava é SaaS multi-tenant na nuvem com atualizações contínuas; o NetwarePos parece ser instalado localmente por loja, com o cliente a "possuir" o software. Para o dono de uma loja pequena, "pagar uma vez e ser meu para sempre" é uma mensagem emocionalmente forte contra qualquer subscrição mensal — é um argumento que provavelmente vais ouvir de clientes em potencial, e vale a pena teres uma resposta pronta (atualizações incluídas, suporte contínuo, acesso de qualquer dispositivo, sem precisar de um técnico para instalar/manter — ver secção de mensagens abaixo).

### Zumbo Cloud ERP — o ERP completo, vendido com acompanhamento

Posiciona-se como "líder em gestão integrada" em Moçambique e na SADC, com módulos de faturação certificada, inventário multi-armazém, contabilidade, RH (incluindo IRPS/INSS) e CRM, e reclama pagamentos integrados com M-Pesa/e-Mola/mKesh e bancos moçambicanos. Não expõe preços publicamente — os exemplos de cliente que usa (clínica, construção civil, cadeia de retalho) e a "implementação assistida por consultores" sugerem uma venda mais consultiva/enterprise, não self-serve.

Não é uma ameaça direta ao nicho simples de "POS + faturas + stock para uma loja pequena" que a Kuava serve — mas compete pelo mesmo argumento de "somos locais, certificados AT, suporte em português", que precisas de conseguir dizer também.

### Cegid Primavera / Cegid PHC

Já sob o mesmo grupo (Cegid), com presença e parceiros em Moçambique. São soluções de ERP mais robustas e mais caras, tipicamente vendidas a empresas de maior dimensão através de parceiros locais de implementação. Vale sobretudo como contexto estratégico: a Cegid está a consolidar sob uma única empresa a oferta de faturação/ERP em Moçambique do nível mais básico (Vendus) ao mais avançado (Primavera/PHC) — é um adversário bem financiado a cobrir o mercado inteiro, não apenas uma fatia.

## Tabela comparativa

| | **Kuava POS** | Cegid Vendus | NetwarePos | Zumbo Cloud ERP |
|---|---|---|---|---|
| Modelo de preço | Subscrição SaaS | Subscrição (€6,25–15,83/mês) | Licença única vitalícia | Não público (venda consultiva) |
| Funciona offline | Sim (fila de vendas + app instalável) | Não (100% online) | Sim | Não confirmado |
| Faturação certificada AT / SAF-T MZ | **Não, ainda** | Sim (nº 2230) | Reclama conformidade | Reclama certificação |
| M-Pesa / e-Mola | Registo manual de referência | Não confirmado | Reconciliação de caixa por método | Reclama integração |
| Multi-loja / multi-tenant nativo | Sim | Sim (planos superiores) | Não é o foco declarado | Sim |
| Foco de negócio | Loja/retalho pequeno e médio | Retalho, restauração, serviços | Retalho e distribuição | Pequenas a grandes empresas |
| Suporte em português local | A construir | Sim | Sim | Sim |

## Onde a Kuava já ganha

A funcionalidade offline real (fila de vendas mesmo sem rede, e agora instalável como app) é uma vantagem genuína e defensável contra o maior concorrente internacional (Vendus), que é explicitamente 100% online. A arquitetura multi-tenant moderna também coloca a Kuava mais perto, tecnicamente, do Zumbo Cloud do que do NetwarePos — o que é bom, porque significa que consegues competir em "loja pode aceder de qualquer telemóvel/computador, sem instalar nada localmente" contra o NetwarePos, e em "self-serve, sem precisar de consultor" contra o Zumbo Cloud.

## Onde a Kuava está exposta

A certificação AT / SAF-T MZ é o risco maior — todos os quatro concorrentes diretos já a reclamam publicamente. Isto não se resolve com uma funcionalidade de código; é um processo formal junto da AT que precisa de ser iniciado. Até lá, para não vender algo que pareça mais do que é, o site e as conversas de venda deveriam ser explícitos sobre o que a Kuava emite hoje (faturas e recibos com NUIT e IVA, para controlo interno do negócio) e não afirmar "conforme" ou "certificado pela AT" enquanto isso não for verdade.

O segundo risco é o argumento do preço/modelo de negócio do NetwarePos — "pagar uma vez" é psicologicamente forte para um pequeno comerciante moçambicano habituado a pensar em custos fixos baixos. Vale a pena testar, nas primeiras conversas de venda reais, se essa objeção aparece, e teres pronta uma resposta centrada em continuidade (atualizações, suporte, acesso multi-dispositivo) em vez de tentar competir no preço da subscrição isoladamente.

## Recomendação de posicionamento (realista para agora)

Dada a situação — produto pronto tecnicamente, sem certificação AT ainda, sem equipa de vendas, mercado único — a recomendação mais honesta é não competir já pelo cliente com contabilidade organizada que precisa de comunicar faturas à AT todos os meses (é aí que a falta de certificação pesa mais). Faz mais sentido lançar e validar primeiro com lojas pequenas para quem o valor imediato é "vender mais rápido, saber o que tenho em stock, e ter um recibo/fatura organizado para o cliente" — e ser transparente, desde já, contigo mesmo e com os primeiros clientes, de que a certificação AT é o próximo marco a atingir, não algo já resolvido. Isso evita prometer conformidade fiscal que ainda não existe, ao mesmo tempo que deixa a vantagem real (offline, moderno, simples de usar em qualquer dispositivo) fazer o trabalho de diferenciação nesta fase.

## Próximos passos concretos

1. Confirmar diretamente com a AT (ou com um contabilista moçambicano) o processo real de certificação de software de faturação e o limiar exato de obrigatoriedade em Meticais — os números em euros que encontrei nas fontes não são fiáveis para Moçambique.
2. Decidir, com essa informação, se vale a pena iniciar já o processo de certificação antes de divulgar amplamente o site, ou lançar primeiro para o segmento que ainda não é obrigado a ter software certificado.
3. Rever a cópia do site e dos termos para não sugerir conformidade AT que ainda não existe.
4. Ao falar com os primeiros clientes-piloto, perguntar explicitamente se já usam algum dos concorrentes acima (Vendus, NetwarePos, Zumbo Cloud) ou papel/Excel — a resposta vai validar ou corrigir muita coisa deste documento com dados reais.

## Fontes consultadas

- [Software certificado: para quem é obrigatório? — Cegid Vendus](https://www.vendus.co.mz/blog/obrigado-utilizar-software-certificado/)
- [Saiba como comunicar as faturas à Autoridade Tributária — Cegid Vendus](https://www.vendus.co.mz/blog/comunicar-faturas-autoridade-tributaria-mocambique/)
- [Cegid Vendus Moçambique — planos e funcionalidades](https://www.vendus.co.mz/)
- [NetwarePos — Sistema de Ponto de Venda e Gestão de Stock em Moçambique](https://netwarepos.com/)
- [Zumbo Cloud ERP — Facturação Certificada pela AT em Moçambique](https://zumbocloud.com/facturacao-certificada-at)
- [Novo procedimento de comunicação de faturas à AT de Moçambique — Cegid Primavera](https://mz.primaverabss.com/pt/blog/comunicacao-faturas-autoridade-tributaria-mocambique/)
- [SAF-T em Moçambique: novas regras e impacto nas empresas — Cegid PHC](https://phcsoftware.com/mz/artigo/saf-t-mocambique-novas-regras-impacto-empresas/)
- [Perguntas frequentes sobre a facturação eletrónica — OCAM](https://ocam.org.mz/2025/06/27/perguntas-frequentes-sobre-a-facturacao-electronica/)
- [Máquinas fiscais transformaram sistema tributário Moçambicano — 2iBi](https://2ibi.com/maquinas-fiscais-transformaram-sistema-tributario-mocambicano/)
- [Cegid anuncia a aquisição da PHC Business Software](https://phcsoftware.com/mz/noticias/cegid-anuncia-a-aquisicao-da-phc-business-software/)
- [logicPOS — Software de Faturação e POS Gratuito / Open Source](https://logic-pos.com/)
