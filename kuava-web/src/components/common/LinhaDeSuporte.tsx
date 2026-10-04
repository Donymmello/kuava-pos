import { Button, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import {
  SUPORTE_EMAIL,
  SUPORTE_TELEFONE,
  SUPORTE_WHATSAPP_URL,
  suporteMailto,
} from '../../config/suporte';

interface LinhaDeSuporteProps {
  /** De que ecrã parte o pedido; vai no assunto do email. */
  contexto: string;
  /** Uma frase curta a dizer porque é que esta linha está aqui. */
  texto?: string;
  /** `destaque` para ecrãs de bloqueio, onde o contacto é a saída. */
  variante?: 'discreta' | 'destaque';
}

/**
 * O contacto de suporte, onde o utilizador está preso.
 *
 * WhatsApp primeiro de propósito: em Moçambique é o canal que as pessoas
 * usam de facto, e é o único dos dois que funciona com o telemóvel no
 * balcão e sem plano de dados generoso. O email fica como segunda via, para
 * quem precisa de anexar um comprovativo.
 */
export default function LinhaDeSuporte({
  contexto,
  texto,
  variante = 'discreta',
}: LinhaDeSuporteProps) {
  const destaque = variante === 'destaque';

  return (
    <Stack
      spacing={1.25}
      sx={{
        mt: 2,
        p: destaque ? 2 : 0,
        borderRadius: destaque ? 1 : 0,
        bgcolor: destaque ? 'action.hover' : 'transparent',
      }}
    >
      {texto && (
        <Typography variant="body2" color="text.secondary">
          {texto}
        </Typography>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant={destaque ? 'contained' : 'outlined'}
          color="success"
          size="small"
          startIcon={<WhatsAppIcon />}
          href={SUPORTE_WHATSAPP_URL}
          target="_blank"
          rel="noopener"
        >
          WhatsApp {SUPORTE_TELEFONE}
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<MailOutlineIcon />}
          href={suporteMailto(contexto)}
        >
          {SUPORTE_EMAIL}
        </Button>
      </Stack>
    </Stack>
  );
}
