const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  BorderStyle,
} = require('docx');

const TODAY = 'agosto de 2026';

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...opts })],
    spacing: { after: 160 },
  });
}
function pBold(text) {
  return p(text, { bold: true });
}
function bullet(text) {
  return new Paragraph({
    children: [new TextRun(text)],
    bullet: { level: 0 },
    spacing: { after: 100 },
  });
}
function italicNote(text) {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: '555555' })],
    spacing: { after: 200 },
  });
}
function hr() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { after: 240 },
  });
}
function title(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 40 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  });
}
function subtitle(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: '555555' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
  });
}

const disclaimer = new Paragraph({
  shading: { fill: 'FFF4E5' },
  border: {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'E0A030' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E0A030' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'E0A030' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'E0A030' },
  },
  children: [
    new TextRun({
      text:
        'Nota importante: este documento é um modelo de base, gerado para acelerar o arranque da Kuava POS, e não constitui aconselhamento jurídico. Antes de publicar/usar este documento com clientes reais, deve ser revisto por um advogado moçambicano, em particular para confirmar o enquadramento fiscal (emissão de faturas, NUIT), preencher os campos entre parênteses retos [ ] com os dados legais reais da empresa, e acompanhar a nova Lei de Proteção de Dados Pessoais, aprovada pelo Conselho de Ministros e ainda pendente de aprovação na Assembleia da República à data deste documento. Este texto deverá ser atualizado assim que essa lei entrar em vigor.',
      italics: true,
    }),
  ],
  spacing: { before: 120, after: 320 },
});

// ============================= TERMOS DE SERVIÇO =============================

const termos = new Document({
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 } } }, // A4
      children: [
        title('Termos de Serviço'),
        subtitle('Kuava POS · última atualização: ' + TODAY),
        disclaimer,

        h1('1. Objeto'),
        p('Estes Termos de Serviço ("Termos") regulam o acesso e a utilização da plataforma Kuava POS ("Kuava POS", "o Serviço"), um sistema de gestão de ponto de venda, faturação e stock para pequenas e médias empresas em Moçambique, disponibilizado por [NOME LEGAL DA EMPRESA], NUIT [NÚMERO], com sede em [MORADA] ("Kuava", "nós").'),
        p('Ao criar uma conta ou utilizar o Serviço, o Estabelecimento e os seus Utilizadores aceitam estes Termos na íntegra. Se não concordar com algum ponto, não deve usar o Serviço.'),

        h1('2. Definições'),
        bullet('"Estabelecimento": a empresa/negócio que regista uma conta na Kuava POS (identificado pelo seu NUIT).'),
        bullet('"Conta Administradora" ou "ADMIN": o utilizador responsável pela conta do Estabelecimento, criado no registo.'),
        bullet('"Utilizador": qualquer pessoa com credenciais de acesso ao Serviço em nome de um Estabelecimento (ADMIN, Gerente ou Caixa).'),
        bullet('"Dados do Estabelecimento": toda a informação inserida pelo Estabelecimento no Serviço: catálogo de produtos, vendas, faturas, dados de clientes finais, definições da conta.'),

        h1('3. Registo e conta'),
        p('Para usar o Serviço é necessário registar um Estabelecimento com dados verídicos, incluindo um NUIT válido. O Estabelecimento é responsável por manter os seus dados atualizados e pela veracidade da informação fornecida.'),
        p('O Estabelecimento é responsável por manter a confidencialidade das credenciais de acesso dos seus Utilizadores e por toda a atividade realizada através da sua conta, incluindo a de Utilizadores que já não deveriam ter acesso (ex.: ex-funcionários). A desativação atempada desses acessos é da responsabilidade do Estabelecimento, através da sua Conta Administradora.'),
        p('Apenas um ADMIN pode criar, editar ou desativar outros Utilizadores dentro do seu Estabelecimento.'),

        h1('4. Período experimental e plano de subscrição'),
        p('Todo o Estabelecimento novo tem direito a um período experimental gratuito de 7 (sete) dias a partir do registo, com acesso completo ao Serviço.'),
        p('Terminado o período experimental sem que o plano pago tenha sido ativado, o acesso ao Serviço é automaticamente bloqueado até à ativação. Os Dados do Estabelecimento não são apagados apenas por o trial ter expirado.'),
        p('A confirmação do pagamento e a ativação do plano são feitas manualmente pela Kuava, mediante contacto entre o Estabelecimento e a Kuava fora da plataforma (não existe, nesta fase, processamento automático de pagamentos dentro do Serviço).'),
        p('A Kuava reserva-se o direito de rever os preços e condições do plano, com aviso prévio razoável aos Estabelecimentos com conta ativa.'),

        h1('5. Utilização aceitável'),
        p('O Estabelecimento e os seus Utilizadores comprometem-se a não:'),
        bullet('usar o Serviço para fins ilegais ou fraudulentos, incluindo emissão de documentos comerciais falsos;'),
        bullet('tentar aceder a dados de outro Estabelecimento ou contornar os mecanismos de segurança/isolamento entre contas;'),
        bullet('partilhar credenciais de acesso com terceiros não autorizados;'),
        bullet('sobrecarregar deliberadamente a infraestrutura do Serviço (ex.: automatizar pedidos em massa fora do uso normal da aplicação).'),
        p('A violação destas regras pode levar à suspensão ou encerramento imediato da conta, sem prejuízo de outras medidas legais aplicáveis.'),

        h1('6. Propriedade e dados'),
        p('A Kuava mantém todos os direitos de propriedade intelectual sobre o software, marca e design da Kuava POS.'),
        p('Os Dados do Estabelecimento pertencem ao Estabelecimento. A Kuava atua como fornecedora do Serviço que processa esses dados em nome do Estabelecimento, nos termos da Política de Privacidade. O Estabelecimento é responsável por assegurar que tem uma base legítima para tratar os dados pessoais dos seus próprios clientes que insere no Serviço (ex.: nome/NUIT numa fatura).'),
        p('O Estabelecimento é o único responsável pela exatidão fiscal e legal dos documentos (faturas, recibos) emitidos através do Serviço. A Kuava POS é uma ferramenta de apoio à gestão, não um substituto de aconselhamento contabilístico ou fiscal.'),

        h1('7. Disponibilidade do Serviço'),
        p('A Kuava envida esforços comercialmente razoáveis para manter o Serviço disponível, mas não garante disponibilidade ininterrupta. Podem ocorrer períodos de manutenção, com aviso prévio sempre que possível.'),
        p('O Serviço inclui uma funcionalidade de funcionamento offline no ponto de venda, que permite continuar a registar vendas durante quebras de ligação à internet e sincronizá-las automaticamente quando a ligação for restabelecida. Esta funcionalidade não elimina a necessidade de uma ligação à internet para o funcionamento normal do Serviço.'),

        h1('8. Limitação de responsabilidade'),
        p('Na máxima medida permitida pela lei aplicável, a Kuava não é responsável por danos indiretos, lucros cessantes, ou perda de dados resultante de uso indevido do Serviço pelo Estabelecimento ou dos seus Utilizadores, falhas de conectividade à internet do lado do Estabelecimento, ou eventos fora do controlo razoável da Kuava.'),
        p('Nada nestes Termos exclui responsabilidade que não possa ser legalmente excluída ao abrigo da lei moçambicana.'),

        h1('9. Rescisão'),
        p('O Estabelecimento pode cessar a utilização do Serviço a qualquer momento, contactando a Kuava para encerramento da conta.'),
        p('A Kuava pode suspender ou encerrar uma conta em caso de incumprimento destes Termos, falta de pagamento após o período experimental, ou por decisão de descontinuar o Serviço, mediante aviso prévio razoável sempre que a situação o permita.'),
        p('Após o encerramento, os Dados do Estabelecimento serão conservados pelo período descrito na Política de Privacidade antes de eliminados, salvo obrigação legal de conservação por período mais longo (ex.: dados fiscais).'),

        h1('10. Alterações aos Termos'),
        p('A Kuava pode atualizar estes Termos periodicamente. Alterações materiais serão comunicadas aos Estabelecimentos com conta ativa, com antecedência razoável antes de entrarem em vigor.'),

        h1('11. Lei aplicável e foro'),
        p('Estes Termos regem-se pela lei da República de Moçambique. Quaisquer litígios serão submetidos aos tribunais moçambicanos competentes.'),

        h1('12. Contacto'),
        p('Para questões sobre estes Termos: [EMAIL DE CONTACTO] / [TELEFONE DE CONTACTO].'),
      ],
    },
  ],
});

// ============================= POLÍTICA DE PRIVACIDADE =============================

const privacidade = new Document({
  sections: [
    {
      properties: { page: { size: { width: 11906, height: 16838 } } },
      children: [
        title('Política de Privacidade'),
        subtitle('Kuava POS · última atualização: ' + TODAY),
        disclaimer,

        h1('1. Âmbito'),
        p('Esta Política de Privacidade explica que dados pessoais a Kuava POS recolhe, para que fins, e quais os direitos dos titulares desses dados. Aplica-se a Estabelecimentos e Utilizadores que usam o Serviço, e aos clientes finais dos Estabelecimentos cujos dados possam ser inseridos no Serviço (ex.: numa fatura).'),

        h1('2. Enquadramento legal atual'),
        p('Moçambique ainda não tem, à data desta política, uma lei geral de proteção de dados pessoais em vigor. Uma proposta de lei já foi aprovada pelo Conselho de Ministros e encontra-se pendente de submissão e aprovação pela Assembleia da República. Enquanto isso, aplicam-se as proteções gerais da Constituição da República (direito à vida privada) e obrigações específicas da Lei das Transações Eletrónicas (2017) para dados tratados eletronicamente.'),
        p('Mesmo na ausência de uma lei geral em vigor, a Kuava compromete-se a seguir os princípios internacionalmente reconhecidos de boa prática em proteção de dados (minimização, finalidade definida, segurança e direitos do titular) descritos nesta política, e a atualizá-la assim que a nova legislação moçambicana entrar em vigor.'),

        h1('3. Que dados recolhemos'),
        h2('3.1 Dados do Estabelecimento'),
        bullet('Nome do estabelecimento, NUIT, morada, telefone, email de contacto.'),
        h2('3.2 Dados dos Utilizadores (contas de acesso)'),
        bullet('Nome, email, palavra-passe (guardada apenas de forma encriptada, nunca em texto simples), função/role dentro do Estabelecimento.'),
        h2('3.3 Dados operacionais introduzidos pelo Estabelecimento'),
        bullet('Catálogo de produtos e stock.'),
        bullet('Registos de vendas e faturas: podem incluir nome/NUIT de clientes finais do Estabelecimento, quando estes são incluídos numa fatura.'),
        bullet('Referências de confirmação de pagamento por M-Pesa/e-Mola inseridas manualmente pelo Estabelecimento (ex.: código SMS). A Kuava POS não processa pagamentos diretamente nem acede a contas M-Pesa/e-Mola.'),
        p('A Kuava POS não recolhe nem guarda dados de cartões bancários ou credenciais de pagamento. Não existe processamento automático de pagamentos dentro do Serviço nesta fase.'),

        h1('4. Para que usamos os dados'),
        bullet('Prestar o Serviço (autenticação, gestão de vendas/stock, geração de faturas e recibos).'),
        bullet('Comunicar sobre a conta: confirmações, avisos de fim de período experimental, ativação de plano, suporte.'),
        bullet('Manter a segurança e integridade do Serviço (ex.: prevenção de acessos indevidos, limitação de tentativas de início de sessão).'),
        bullet('Cumprir obrigações legais aplicáveis à Kuava, quando existentes.'),
        p('Não vendemos dados pessoais a terceiros, nem os usamos para publicidade de terceiros.'),

        h1('5. Partilha de dados'),
        p('Os Dados do Estabelecimento são armazenados em servidores geridos pela Kuava (infraestrutura de alojamento/VPS) e não são partilhados com terceiros, exceto:'),
        bullet('fornecedores de infraestrutura técnica estritamente necessários para operar o Serviço (ex.: alojamento do servidor), sujeitos a obrigações de confidencialidade;'),
        bullet('quando exigido por lei ou ordem de autoridade competente.'),

        h1('6. Segurança'),
        bullet('Palavras-passe guardadas com encriptação unidirecional (bcrypt). A Kuava nunca vê nem consegue recuperar a palavra-passe original de um Utilizador.'),
        bullet('Comunicação entre a aplicação e o servidor protegida por TLS/HTTPS.'),
        bullet('Isolamento de dados entre Estabelecimentos: um Estabelecimento nunca tem acesso aos dados de outro.'),
        bullet('Acesso interno da equipa da Kuava aos dados dos Estabelecimentos é restrito e usado apenas para prestar suporte técnico ou operações de manutenção necessárias.'),

        h1('7. Retenção de dados'),
        p('Os Dados do Estabelecimento são conservados enquanto a conta estiver ativa. Após o encerramento de uma conta, os dados são conservados por um período razoável (até 90 dias) para permitir reativação a pedido do Estabelecimento, findo o qual são eliminados, salvo quando a lei moçambicana exigir conservação mais longa (ex.: registos fiscais/faturação).'),

        h1('8. Direitos do titular dos dados'),
        p('Mesmo antes da entrada em vigor de uma lei geral de proteção de dados em Moçambique, a Kuava reconhece aos Utilizadores e Estabelecimentos o direito de, mediante pedido:'),
        bullet('aceder aos dados pessoais que a Kuava guarda sobre si;'),
        bullet('solicitar a correção de dados incorretos;'),
        bullet('solicitar a eliminação da conta e dos dados associados, sujeito às exceções de retenção legal referidas na secção 7.'),
        p('Pedidos podem ser feitos através do contacto indicado na secção 10.'),

        h1('9. Armazenamento local no dispositivo'),
        p('Para permitir o funcionamento do ponto de venda sem ligação à internet, a aplicação guarda temporariamente no navegador do dispositivo (armazenamento local/IndexedDB) a sessão de acesso, o catálogo de produtos e vendas ainda não sincronizadas. Estes dados são enviados para o servidor assim que a ligação é restabelecida e não são partilhados com terceiros.'),

        h1('10. Menores'),
        p('O Serviço destina-se a uso empresarial por Estabelecimentos e não é dirigido a menores de idade.'),

        h1('11. Alterações a esta política'),
        p('Esta Política pode ser atualizada periodicamente, nomeadamente para refletir a entrada em vigor da nova Lei de Proteção de Dados Pessoais moçambicana. Alterações materiais serão comunicadas aos Estabelecimentos com conta ativa.'),

        h1('12. Contacto'),
        p('Para questões sobre esta Política ou para exercer os direitos descritos na secção 8: [EMAIL DE CONTACTO] / [TELEFONE DE CONTACTO].'),
      ],
    },
  ],
});

Packer.toBuffer(termos).then((buf) => require('fs').writeFileSync('termos-de-servico.docx', buf));
Packer.toBuffer(privacidade).then((buf) => require('fs').writeFileSync('politica-de-privacidade.docx', buf));
console.log('done');
