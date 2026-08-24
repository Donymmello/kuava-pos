import { Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { MOBILE_MONEY_FLOW_LABELS, MobileMoneyFlow } from '../../types';

interface MobileMoneyDetailsFormProps {
  flow: MobileMoneyFlow | null;
  paymentReference: string;
  agentMarginAmount: string;
  onFlowChange: (flow: MobileMoneyFlow | null) => void;
  onPaymentReferenceChange: (value: string) => void;
  onAgentMarginAmountChange: (value: string) => void;
  /** Mensagem de validação da margem (ex.: valor negativo/inválido) — mostrada no próprio campo. */
  marginError?: string | null;
}

/**
 * Não existe uma API C2B simples de M-Pesa/e-Mola para um POS pequeno se
 * ligar — na prática, o pagamento chega de uma de duas formas: o cliente
 * transfere para o número da loja (confirmado com a referência da SMS), ou
 * a loja funciona como agente e o cliente levanta, ficando a loja com uma
 * margem sobre o valor. Este formulário aparece quando o método selecionado
 * é M-Pesa ou e-Mola, para o caixa indicar qual dos dois se aplica — mas é
 * inteiramente opcional, para não atrasar o atendimento: dá para finalizar a
 * venda sem tocar em nada aqui.
 */
export default function MobileMoneyDetailsForm({
  flow,
  paymentReference,
  agentMarginAmount,
  onFlowChange,
  onPaymentReferenceChange,
  onAgentMarginAmountChange,
  marginError,
}: MobileMoneyDetailsFormProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary">
        Como foi recebido o pagamento? (opcional)
      </Typography>
      <ToggleButtonGroup
        value={flow}
        exclusive
        fullWidth
        size="small"
        color="primary"
        onChange={(_event, next: MobileMoneyFlow | null) => onFlowChange(next)}
      >
        {Object.values(MobileMoneyFlow).map((option) => (
          <ToggleButton key={option} value={option}>
            {MOBILE_MONEY_FLOW_LABELS[option]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {flow === MobileMoneyFlow.TRANSFER && (
        <TextField
          label="Referência da confirmação (SMS) — opcional"
          size="small"
          fullWidth
          value={paymentReference}
          onChange={(event) => onPaymentReferenceChange(event.target.value)}
          placeholder="ex.: CI250823.1234.A56789"
          helperText="Se tiveres a SMS à mão, ajuda a confirmar a venda depois. Podes saltar."
        />
      )}

      {flow === MobileMoneyFlow.AGENT && (
        <TextField
          label="Margem cobrada (MZN) — opcional"
          size="small"
          fullWidth
          type="text"
          inputMode="decimal"
          value={agentMarginAmount}
          onChange={(event) => onAgentMarginAmountChange(event.target.value)}
          placeholder="0,00"
          error={Boolean(marginError)}
          helperText={
            marginError ?? 'Preenche para a comissão aparecer no painel. Podes saltar. Aceita vírgula ou ponto.'
          }
        />
      )}
    </Stack>
  );
}
