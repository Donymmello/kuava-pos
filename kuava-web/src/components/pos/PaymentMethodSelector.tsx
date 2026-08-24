import { ToggleButton, ToggleButtonGroup, Typography, Stack } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import { PAYMENT_METHOD_LABELS, PaymentMethod } from '../../types';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const ICONS: Record<PaymentMethod, JSX.Element> = {
  [PaymentMethod.CASH]: <PaymentsOutlinedIcon fontSize="small" />,
  [PaymentMethod.MPESA]: <PhoneIphoneOutlinedIcon fontSize="small" />,
  [PaymentMethod.EMOLA]: <PhoneIphoneOutlinedIcon fontSize="small" />,
  [PaymentMethod.CARD]: <CreditCardOutlinedIcon fontSize="small" />,
};

export default function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" color="text.secondary">
        Método de pagamento
      </Typography>
      <ToggleButtonGroup
        value={value}
        exclusive
        fullWidth
        color="primary"
        onChange={(_event, next: PaymentMethod | null) => {
          if (next) {
            onChange(next);
          }
        }}
      >
        {Object.values(PaymentMethod).map((method) => (
          <ToggleButton key={method} value={method} sx={{ flexDirection: 'column', gap: 0.5, py: 1 }}>
            {ICONS[method]}
            <Typography variant="caption">{PAYMENT_METHOD_LABELS[method]}</Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  );
}
