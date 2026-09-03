import { Alert, List, ListItem, ListItemText, Typography } from '@mui/material';
import LegalLayout from './LegalLayout';

// TODO(dono): ver a mesma nota em TermosPage.tsx — os contactos abaixo
// precisam dos dados legais reais da empresa.
const EMAIL_CONTACTO = '[EMAIL DE CONTACTO]';
const TELEFONE_CONTACTO = '[TELEFONE DE CONTACTO]';

export default function PoliticaPage() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="agosto de 2026">
      <Alert severity="info">
        Nota importante: este documento é um modelo de base e não constitui aconselhamento jurídico.
        Antes de ser considerado definitivo, deve ser revisto por um advogado moçambicano — em
        particular para confirmar o enquadramento fiscal (emissão de faturas, NUIT), preencher os
        campos entre colchetes com os dados legais reais da empresa, e acompanhar a nova Lei de
        Proteção de Dados Pessoais, aprovada pelo Conselho de Ministros e ainda pendente de aprovação
        na Assembleia da República à data deste documento.
      </Alert>

      <Typography variant="h6">1. Âmbito</Typography>
      <Typography>
        Esta Política de Privacidade explica que dados pessoais a Kuava POS recolhe, para que fins, e
        quais os direitos dos titulares desses dados. Aplica-se a Estabelecimentos e Utilizadores que
        usam o Serviço, e aos clientes finais dos Estabelecimentos cujos dados possam ser inseridos no
        Serviço (ex.: numa fatura).
      </Typography>

      <Typography variant="h6">2. Enquadramento legal atual</Typography>
      <Typography>
        Moçambique ainda não tem, à data desta política, uma lei geral de proteção de dados pessoais
        em vigor — uma proposta de lei já foi aprovada pelo Conselho de Ministros e encontra-se
        pendente de submissão e aprovação pela Assembleia da República. Enquanto isso, aplicam-se as
        proteções gerais da Constituição da República (direito à vida privada) e obrigações
        específicas da Lei das Transações Eletrónicas (2017) para dados tratados eletronicamente.
      </Typography>
      <Typography>
        Mesmo na ausência de uma lei geral em vigor, a Kuava compromete-se a seguir os princípios
        internacionalmente reconhecidos de boa prática em proteção de dados — minimização, finalidade
        definida, segurança e direitos do titular — descritos nesta política, e a atualizá-la assim
        que a nova legislação moçambicana entrar em vigor.
      </Typography>

      <Typography variant="h6">3. Que dados recolhemos</Typography>
      <Typography variant="subtitle2">3.1 Dados do Estabelecimento</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Nome do estabelecimento, NUIT, morada, telefone, email de contacto." />
        </ListItem>
      </List>
      <Typography variant="subtitle2">3.2 Dados dos Utilizadores (contas de acesso)</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Nome, email, palavra-passe (guardada apenas de forma encriptada — nunca em texto simples), função/role dentro do Estabelecimento." />
        </ListItem>
      </List>
      <Typography variant="subtitle2">3.3 Dados operacionais introduzidos pelo Estabelecimento</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Catálogo de produtos e stock." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Registos de vendas e faturas — podem incluir nome/NUIT de clientes finais do Estabelecimento, quando estes são incluídos numa fatura." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Referências de confirmação de pagamento por M-Pesa/e-Mola inseridas manualmente pelo Estabelecimento (ex.: código SMS) — a Kuava POS não processa pagamentos diretamente nem acede a contas M-Pesa/e-Mola." />
        </ListItem>
      </List>
      <Typography>
        A Kuava POS não recolhe nem guarda dados de cartões bancários ou credenciais de pagamento —
        não existe processamento automático de pagamentos dentro do Serviço nesta fase.
      </Typography>

      <Typography variant="h6">4. Para que usamos os dados</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Prestar o Serviço (autenticação, gestão de vendas/stock, geração de faturas e recibos)." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Comunicar sobre a conta — confirmações, avisos de fim de período experimental, ativação de plano, suporte." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Manter a segurança e integridade do Serviço (ex.: prevenção de acessos indevidos, limitação de tentativas de início de sessão)." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Cumprir obrigações legais aplicáveis à Kuava, quando existentes." />
        </ListItem>
      </List>
      <Typography>
        Não vendemos dados pessoais a terceiros, nem os usamos para publicidade de terceiros.
      </Typography>

      <Typography variant="h6">5. Partilha de dados</Typography>
      <Typography>
        Os Dados do Estabelecimento são armazenados em servidores geridos pela Kuava (infraestrutura
        de alojamento/VPS) e não são partilhados com terceiros, exceto:
      </Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="fornecedores de infraestrutura técnica estritamente necessários para operar o Serviço (ex.: alojamento do servidor), sujeitos a obrigações de confidencialidade;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="quando exigido por lei ou ordem de autoridade competente." />
        </ListItem>
      </List>

      <Typography variant="h6">6. Segurança</Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Palavras-passe guardadas com encriptação unidirecional (bcrypt) — a Kuava nunca vê nem consegue recuperar a palavra-passe original de um Utilizador." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Comunicação entre a aplicação e o servidor protegida por TLS/HTTPS." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Isolamento de dados entre Estabelecimentos — um Estabelecimento nunca tem acesso aos dados de outro." />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="Acesso interno da equipa da Kuava aos dados dos Estabelecimentos é restrito e usado apenas para prestar suporte técnico ou operações de manutenção necessárias." />
        </ListItem>
      </List>

      <Typography variant="h6">7. Retenção de dados</Typography>
      <Typography>
        Os Dados do Estabelecimento são conservados enquanto a conta estiver ativa. Após o
        encerramento de uma conta, os dados são conservados por um período razoável (até 90 dias) para
        permitir reativação a pedido do Estabelecimento, findo o qual são eliminados — salvo quando a
        lei moçambicana exigir conservação mais longa (ex.: registos fiscais/faturação).
      </Typography>

      <Typography variant="h6">8. Direitos do titular dos dados</Typography>
      <Typography>
        Mesmo antes da entrada em vigor de uma lei geral de proteção de dados em Moçambique, a Kuava
        reconhece aos Utilizadores e Estabelecimentos o direito de, mediante pedido:
      </Typography>
      <List dense disablePadding>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="aceder aos dados pessoais que a Kuava guarda sobre si;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="solicitar a correção de dados incorretos;" />
        </ListItem>
        <ListItem sx={{ display: 'list-item', pl: 2 }}>
          <ListItemText primary="solicitar a eliminação da conta e dos dados associados, sujeito às exceções de retenção legal referidas na secção 7." />
        </ListItem>
      </List>
      <Typography>Pedidos podem ser feitos através do contacto indicado na secção 10.</Typography>

      <Typography variant="h6">9. Armazenamento local no dispositivo</Typography>
      <Typography>
        Para permitir o funcionamento do ponto de venda sem ligação à internet, a aplicação guarda
        temporariamente no navegador do dispositivo (armazenamento local/IndexedDB) a sessão de
        acesso, o catálogo de produtos e vendas ainda não sincronizadas. Estes dados são enviados para
        o servidor assim que a ligação é restabelecida e não são partilhados com terceiros.
      </Typography>

      <Typography variant="h6">10. Menores</Typography>
      <Typography>
        O Serviço destina-se a uso empresarial por Estabelecimentos e não é dirigido a menores de
        idade.
      </Typography>

      <Typography variant="h6">11. Alterações a esta política</Typography>
      <Typography>
        Esta Política pode ser atualizada periodicamente, nomeadamente para refletir a entrada em
        vigor da nova Lei de Proteção de Dados Pessoais moçambicana. Alterações materiais serão
        comunicadas aos Estabelecimentos com conta ativa.
      </Typography>

      <Typography variant="h6">12. Contacto</Typography>
      <Typography>
        Para questões sobre esta Política ou para exercer os direitos descritos na secção 8:{' '}
        {EMAIL_CONTACTO} / {TELEFONE_CONTACTO}.
      </Typography>
    </LegalLayout>
  );
}
