import { useState } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAuthStore } from '../../store/useAuthStore';
import { useColorMode } from '../../theme/ColorModeContext';
import { UserRole } from '../../types';
import { formatMzn } from '../../utils/currency';

const FEATURES = [
  {
    icon: <PointOfSaleIcon color="primary" fontSize="large" />,
    title: 'Ponto de venda rápido',
    description: 'Vender por código de barras ou pesquisa, com IVA calculado automaticamente por produto.',
  },
  {
    icon: <ReceiptLongIcon color="primary" fontSize="large" />,
    title: 'Faturas e recibos',
    description: 'Gera faturas e recibos em PDF prontos para o cliente, com o histórico de vendas sempre à mão.',
  },
  {
    icon: <Inventory2Icon color="primary" fontSize="large" />,
    title: 'Gestão de stock',
    description: 'Catálogo de produtos com alerta de stock baixo. Sabes sempre o que precisa de ser reposto.',
  },
  {
    icon: <WifiOffIcon color="primary" fontSize="large" />,
    title: 'Continua a vender offline',
    description: 'Uma quebra de internet no caixa não pára a venda. Sincroniza sozinho assim que a ligação volta.',
  },
];

// Plano único por estabelecimento, sem níveis por funcionalidade, reflete
// o que o produto realmente é hoje (não há nenhuma funcionalidade bloqueada
// por plano no código, só o período de trial vs. assinatura ativa, ver
// Tenant.subscription_expires_at) e como a arquitetura multi-tenant já escala a
// receita com o tamanho do negócio: um dono com várias lojas regista vários
// estabelecimentos, paga várias assinaturas, não precisa de "planos" por
// nicho (farmácia, ferragem, mercearia, bottle store pagam o mesmo).
// Preço de lançamento (set/2026), calibrado com 3 pontos de referência reais
// em MZN, não convertidos a partir de preços europeus: addon de POS da PHC
// Moçambique (~2.250 MT/mês equivalente), Cegid Vendus Flex, o plano dele
// mais parecido com a Kuava, com POS de retalho (810-1.272 MT/mês ao câmbio
// do BCI), e a Zameda, SaaS de gestão de farmácia no Quénia, no seu plano de
// entrada de uma só loja (~1.245 MT/mês ao câmbio do dia). As três fontes
// convergem para grosso modo 800-2.250 MT/mês; 1.199 MT/mês fica dentro
// desse intervalo, abaixo da farmácia (nicho mais regulado e mais dependente
// de software) e dentro do Vendus Flex.
const MONTHLY_PRICE_MZN = 1199;
const ANNUAL_PRICE_MZN = 11990; // paga 10 meses, ganha 12 (mesmo padrão usado pela Zameda)

const INCLUDED_IN_PLAN = [
  'Vendas por código de barras ou pesquisa, com IVA automático',
  'Faturas e recibos em PDF ilimitados',
  'Gestão de stock com alerta de stock baixo',
  'Funciona offline e sincroniza sozinho',
  'Utilizadores ilimitados por estabelecimento',
  'Atualizações incluídas, sem instalar nada',
];

function defaultRouteForRole(role: UserRole | undefined): string {
  return role === UserRole.SUPERADMIN ? '/superadmin' : '/pos';
}

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const user = useAuthStore((state) => state.user);
  // Mesmo contexto de tema partilhado pelo resto da app (ver App.tsx),
  // não o hook useColorScheme do MUI, que só funciona com CssVarsProvider
  // e este projeto usa ThemeProvider normal.
  const { mode } = useColorMode();

  // Quem já tem sessão não precisa de ver a landing, vai direto para
  // onde a LoginPage também o mandaria.
  if (user) {
    return <Navigate to={defaultRouteForRole(user.role)} replace />;
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 4, md: 8 } }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PointOfSaleIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Kuava POS
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Button href="#precos" color="inherit" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              Preços
            </Button>
            <Button component={RouterLink} to="/login" color="inherit">
              Entrar
            </Button>
            <Button component={RouterLink} to="/register" variant="contained">
              Criar conta
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={6} alignItems="center" sx={{ mb: { xs: 6, md: 10 } }}>
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '2rem', md: '2.75rem' } }}>
                Ponto de venda, faturação e stock. Feito para o teu negócio em Moçambique.
              </Typography>
              <Typography variant="h6" color="text.secondary" fontWeight={400}>
                Regista o teu estabelecimento e começa a vender em minutos. 7 dias grátis, sem
                cartão de crédito.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={RouterLink} to="/register" variant="contained" size="large">
                  Começar agora, 7 dias grátis
                </Button>
                <Button component={RouterLink} to="/login" variant="outlined" size="large">
                  Já tenho conta
                </Button>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: (theme) =>
                  mode === 'dark' ? theme.palette.background.paper : alpha(theme.palette.primary.main, 0.06),
                borderStyle: 'dashed',
              }}
            >
              <PointOfSaleIcon color="primary" sx={{ fontSize: 96 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Funciona no telemóvel, tablet ou computador do balcão, sem instalar nada.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: { xs: 6, md: 10 } }}>
          {FEATURES.map((feature) => (
            <Grid item xs={12} sm={6} md={3} key={feature.title}>
              <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                <Stack spacing={1.5}>
                  {feature.icon}
                  <Typography variant="subtitle1" fontWeight={600}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Box id="precos" sx={{ mb: { xs: 6, md: 10 }, scrollMarginTop: 24 }}>
          <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: { xs: 3, md: 5 } }}>
            <Typography variant="h4" fontWeight={700}>
              Preços
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={480}>
              Um preço simples, sem níveis confusos nem limite de utilizadores.
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="center" sx={{ mb: 4 }}>
            <ToggleButtonGroup
              value={billingPeriod}
              exclusive
              onChange={(_event, value: 'monthly' | 'annual' | null) => value && setBillingPeriod(value)}
              size="small"
              color="primary"
            >
              <ToggleButton value="monthly">Mensal</ToggleButton>
              <ToggleButton value="annual">Anual, 2 meses grátis</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Grid container justifyContent="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={9} md={6} lg={5}>
              <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
                <Stack spacing={3}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                      <Typography variant="h3" fontWeight={700}>
                        {billingPeriod === 'monthly'
                          ? formatMzn(MONTHLY_PRICE_MZN)
                          : formatMzn(Math.round(ANNUAL_PRICE_MZN / 12))}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        /mês
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {billingPeriod === 'monthly'
                        ? 'Cobrado mensalmente. Cancela quando quiseres.'
                        : `Cobrado ${formatMzn(ANNUAL_PRICE_MZN)}/ano.`}
                    </Typography>
                  </Stack>

                  <Divider />

                  <Stack spacing={1.25}>
                    {INCLUDED_IN_PLAN.map((item) => (
                      <Stack direction="row" spacing={1} alignItems="flex-start" key={item}>
                        <CheckCircleOutlineIcon color="primary" fontSize="small" sx={{ mt: '2px' }} />
                        <Typography variant="body2">{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>

                  <Button component={RouterLink} to="/register" variant="contained" size="large" fullWidth>
                    Criar conta grátis, 7 dias
                  </Button>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    Sem cartão de crédito. Testa tudo antes de decidir.
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3 },
              textAlign: 'center',
              maxWidth: 640,
              mx: 'auto',
              borderStyle: 'dashed',
              bgcolor: (theme) =>
                mode === 'dark' ? theme.palette.background.paper : alpha(theme.palette.primary.main, 0.06),
            }}
          >
            <Typography variant="body2">
              <strong>Conheces outro comerciante?</strong> Indica a Kuava POS e ganha 1 mês grátis
              quando ele criar a conta do estabelecimento dele.
            </Typography>
          </Paper>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Stack spacing={2} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Pronto para experimentar?
            </Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={480}>
              Cria a conta do teu estabelecimento agora. Tens 7 dias com acesso completo, sem
              qualquer compromisso.
            </Typography>
            <Button component={RouterLink} to="/register" variant="contained" size="large">
              Criar estabelecimento
            </Button>
          </Stack>
        </Paper>

        <Divider sx={{ mb: 3 }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ pb: 4 }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Kuava POS. Todos os direitos reservados.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link component={RouterLink} to="/termos" underline="hover" color="text.secondary" variant="body2">
              Termos de Serviço
            </Link>
            <Link component={RouterLink} to="/politica" underline="hover" color="text.secondary" variant="body2">
              Política de Privacidade
            </Link>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
