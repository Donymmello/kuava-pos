import { Stack, TextField, Typography } from '@mui/material';

interface TransferDetailsFormProps {
  paymentReference: string;
  onPaymentReferenceChange: (value: string) => void;
}

/**
 * Aparece quando o método selecionado é TRANSFER. O Kuava não distingue
 * M-Pesa, e-Mola, banco ou qualquer outro mecanismo (Paga Fácil, agente,
 * PaySuite), isso é escolha de cada comerciante e não precisa de integração
 * nenhuma. Aqui só se guarda uma referência livre e opcional, para o caixa
 * anotar o que achar útil (ex.: código da confirmação recebida), sem
 * atrasar o atendimento.
 */
export default function TransferDetailsForm({
  paymentReference,
  onPaymentReferenceChange,
}: TransferDetailsFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Referência (opcional)
      </Typography>
      <TextField
        label="Referência da transferência"
        size="small"
        fullWidth
        value={paymentReference}
        onChange={(event) => onPaymentReferenceChange(event.target.value)}
        placeholder="ex.: CI250823.1234.A56789"
        helperText="Nota livre para identificar o pagamento depois. Podes saltar."
      />
    </Stack>
  );
}
