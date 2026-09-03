import { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Link, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface LegalLayoutProps {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

/**
 * Layout partilhado por /termos e /politica — os dois documentos legais
 * (gerados a partir de legal/termos-de-servico.docx e
 * legal/politica-de-privacidade.docx) só existem aqui como texto simples,
 * sem lógica nenhuma: a fonte da verdade continua a ser o .docx.
 */
export default function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Link
            component={RouterLink}
            to="/"
            underline="hover"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}
          >
            <ArrowBackIcon fontSize="small" /> Voltar à Kuava POS
          </Link>

          <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Kuava POS — última atualização: {updatedAt}
                </Typography>
              </Box>

              {children}
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
