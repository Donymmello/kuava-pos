import { Alert, List, ListItem, ListItemText, Typography } from '@mui/material';
import LegalLayout from './LegalLayout';

// TODO(dono): substituir os campos entre colchetes pelos dados legais reais
// da empresa (nome legal, NUIT, morada, contactos) assim que definidos —
// ver legal/termos-de-servico.docx na raiz do repo para a versão .docx
// equivalente, gerada na mesma sessão em que este texto foi escrito.
const NOME_LEGAL_EMPRESA = '[NOME LEGAL DA EMPRESA]';
const NUIT_EMPRESA = '[NÚMERO]';
const MORADA_EMPRESA = '[MORADA]';
const EMAIL_CONTACTO = '[EMAIL DE CONTACTO]';
const TELEFONE_CONTACTO = '[TELEFONE DE CONTACTO]';

export default function TermosPage() {
  return (
    <LegalLayout title="Termos de Serviço" updatedAt="agosto de 2026">
      <Alert severity="info">
        Nota importante: este documento é um modelo de base e não constitui aconselhamento jurídico.
        Antes de ser considerado definitivo, deve ser revisto por um advogado moçambicano — em
        particular para confirmar o enquadramento fiscal (emissão de faturas, NUIT), preencher os
        campos entre colchetes com os dados legais reais da empresa, e acompanhar a nova Lei de
        Proteção de Dados Pessoais, aprovada pelo Conselho de Ministros e ainda pendente de aprovação
        na Assembleia da República à data deste documento.
      </Alert>

      <Typography variant="h6">1. Objeto</Typography>
      <Typography>
        Estes Termos de Serviço ("Termos") regulam o acesso e a utilização da plataforma Kuava POS
        ("Kuava POS", "o Serviço"), um sistema de gestão de ponto de venda, faturação e stock para
        pequenas e médias empresas em Moçambique, disponibilizado por {NOME_LEGAL_EMPRESA}, NUIT{' '}
        {NUIT_EMPRESA}, com sede em {MORADA_EMPRESA} ("Kuava", "nós").
      </Typography>
      <Typography>
        Ao criar uma conta ou utilizar o Serviço, o Estabelecimento e os seus Utilizadores aceitam
        estes Termos na íntegra. Se não concordar com algum ponto, não deve usar o Serviço.
      </Typography>

      <Typography variant="h6">2. Definições</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary='"Estabelecimento": a empresa/negócio que regista uma conta na Kuava POS (identificado pelo seu NUIT).' />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary='"Conta Administradora" ou "ADMIN": o utilizador responsável pela conta do Estabelecimento, criado no registo.' />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary='"Utilizador": qualquer pessoa com credenciais de acesso ao Serviço em nome de um Estabelecimento (ADMIN, Gerente ou Caixa).' />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary='"Dados do Estabelecimento": toda a informação inserida pelo Estabelecimento no Serviço — catálogo de produtos, vendas, faturas, dados de clientes finais, definições da conta.' />
        </ListItem>
      </List>

      <Typography variant="h6">3. Registo e conta</Typography>
      <Typography>
        Para usar o Serviço é necessário registar um Estabelecimento com dados verídicos, incluindo
        um NUIT válido. O Estabelecimento é responsável por manter os seus dados atualizados e pela
        veracidade da informação fornecida.
      </Typography>
      <Typography>
        O Estabelecimento é responsável por manter a confidencialidade das credenciais de acesso dos
        seus Utilizadores e por toda a atividade realizada através da sua conta, incluindo a de
        Utilizadores que já não deveriam ter acesso (ex.: ex-funcionários) — a desativação atempada
        desses acessos é da responsabilidade do Estabelecimento, através da sua Conta Administradora.
      </Typography>
      <Typography>
        Apenas um ADMIN pode criar, editar ou desativar outros Utilizadores dentro do seu
        Estabelecimento.
      </Typography>

      <Typography variant="h6">4. Período experimental e plano de subscrição</Typography>
      <Typography>
        Todo o Estabelecimento novo tem direito a um período experimental gratuito de 7 (sete) dias a
        partir do registo, com acesso completo ao Serviço.
      </Typography>
      <Typography>
        Terminado o período experimental sem que o plano pago tenha sido ativado, o acesso ao Serviço
        é automaticamente bloqueado até à ativação. Os Dados do Estabelecimento não são apagados
        apenas por o trial ter expirado.
      </Typography>
      <Typography>
        A confirmação do pagamento e a ativação do plano são feitas manualmente pela Kuava, mediante
        contacto entre o Estabelecimento e a Kuava fora da plataforma (não existe, nesta fase,
        processamento automático de pagamentos dentro do Serviço).
      </Typography>
      <Typography>
        A Kuava reserva-se o direito de rever os preços e condições do plano, com aviso prévio
        razoável aos Estabelecimentos com conta ativa.
      </Typography>

      <Typography variant="h6">5. Utilização aceitável</Typography>
      <Typography>O Estabelecimento e os seus Utilizadores comprometem-se a não:</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="usar o Serviço para fins ilegais ou fraudulentos, incluindo emissão de documentos comerciais falsos;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="tentar aceder a dados de outro Estabelecimento ou contornar os mecanismos de segurança/isolamento entre contas;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="partilhar credenciais de acesso com terceiros não autorizados;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="sobrecarregar deliberadamente a infraestrutura do Serviço (ex.: automatizar pedidos em massa fora do uso normal da aplicação)." />
        </ListItem>
      </List>
      <Typography>
        A violação destas regras pode levar à suspensão ou encerramento imediato da conta, sem
        prejuízo de outras medidas legais aplicáveis.
      </Typography>

      <Typography variant="h6">6. Propriedade e dados</Typography>
      <Typography>
        A Kuava mantém todos os direitos de propriedade intelectual sobre o software, marca e design
        da Kuava POS.
      </Typography>
      <Typography>
        Os Dados do Estabelecimento pertencem ao Estabelecimento. A Kuava atua como fornecedora do
        Serviço que processa esses dados em nome do Estabelecimento, nos termos da Política de
        Privacidade. O Estabelecimento é responsável por assegurar que tem uma base legítima para
        tratar os dados pessoais dos seus próprios clientes que insere no Serviço (ex.: nome/NUIT
        numa fatura).
      </Typography>
      <Typography>
        O Estabelecimento é o único responsável pela exatidão fiscal e legal dos documentos (faturas,
        recibos) emitidos através do Serviço — a Kuava POS é uma ferramenta de apoio à gestão, não um
        substituto de aconselhamento contabilístico ou fiscal.
      </Typography>

      <Typography variant="h6">7. Disponibilidade do Serviço</Typography>
      <Typography>
        A Kuava envida esforços comercialmente razoáveis para manter o Serviço disponível, mas não
        garante disponibilidade ininterrupta. Podem ocorrer períodos de manutenção, com aviso prévio
        sempre que possível.
      </Typography>
      <Typography>
        O Serviço inclui uma funcionalidade de funcionamento offline no ponto de venda, que permite
        continuar a registar vendas durante quebras de ligação à internet e sincronizá-las
        automaticamente quando a ligação for restabelecida — esta funcionalidade não elimina a
        necessidade de uma ligação à internet para o funcionamento normal do Serviço.
      </Typography>

      <Typography variant="h6">8. Limitação de responsabilidade</Typography>
      <Typography>
        Na máxima medida permitida pela lei aplicável, a Kuava não é responsável por danos indiretos,
        lucros cessantes, ou perda de dados resultante de uso indevido do Serviço pelo Estabelecimento
        ou dos seus Utilizadores, falhas de conectividade à internet do lado do Estabelecimento, ou
        eventos fora do controlo razoável da Kuava.
      </Typography>
      <Typography>
        Nada nestes Termos exclui responsabilidade que não possa ser legalmente excluída ao abrigo da
        lei moçambicana.
      </Typography>

      <Typography variant="h6">9. Rescisão</Typography>
      <Typography>
        O Estabelecimento pode cessar a utilização do Serviço a qualquer momento, contactando a Kuava
        para encerramento da conta.
      </Typography>
      <Typography>
        A Kuava pode suspender ou encerrar uma conta em caso de incumprimento destes Termos, falta de
        pagamento após o período experimental, ou por decisão de descontinuar o Serviço, mediante
        aviso prévio razoável sempre que a situação o permita.
      </Typography>
      <Typography>
        Após o encerramento, os Dados do Estabelecimento serão conservados pelo período descrito na
        Política de Privacidade antes de eliminados, salvo obrigação legal de conservação por período
        mais longo (ex.: dados fiscais).
      </Typography>

      <Typography variant="h6">10. Alterações aos Termos</Typography>
      <Typography>
        A Kuava pode atualizar estes Termos periodicamente. Alterações materiais serão comunicadas aos
        Estabelecimentos com conta ativa, com antecedência razoável antes de entrarem em vigor.
      </Typography>

      <Typography variant="h6">11. Lei aplicável e foro</Typography>
      <Typography>
        Estes Termos regem-se pela lei da República de Moçambique. Quaisquer litígios serão submetidos
        aos tribunais moçambicanos competentes.
      </Typography>

      <Typography variant="h6">12. Contacto</Typography>
      <Typography>
        Para questões sobre estes Termos: {EMAIL_CONTACTO} / {TELEFONE_CONTACTO}.
      </Typography>
    </LegalLayout>
  );
}
