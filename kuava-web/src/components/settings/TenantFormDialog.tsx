import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { Tenant } from '../../types';
import { UpdateTenantInput } from '../../services/tenantService';

interface TenantFormDialogProps {
  open: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (payload: UpdateTenantInput) => Promise<void>;
}

interface FormFields {
  name: string;
  nuit: string;
  address: string;
  phone: string;
  email: string;
  defaultTaxRatePercent: string;
}

function tenantToForm(tenant: Tenant): FormFields {
  return {
    name: tenant.name,
    nuit: tenant.nuit,
    address: tenant.address ?? '',
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    defaultTaxRatePercent: String(Math.round(tenant.default_tax_rate * 10000) / 100),
  };
}

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

export default function TenantFormDialog({ open, tenant, onClose, onSubmit }: TenantFormDialogProps) {
  const [fields, setFields] = useState<FormFields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && tenant) {
      setFields(tenantToForm(tenant));
      setError(null);
    }
  }, [open, tenant]);

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fields) return;
    setError(null);

    if (!fields.name.trim() || !fields.nuit.trim()) {
      setError('Indique o nome do estabelecimento e o NUIT.');
      return;
    }

    const taxRate = Number(fields.defaultTaxRatePercent);
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      setError('Indique uma taxa de IVA por omissão entre 0 e 100.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: fields.name.trim(),
        nuit: fields.nuit.trim(),
        address: fields.address.trim() || null,
        phone: fields.phone.trim() || null,
        email: fields.email.trim() || null,
        default_tax_rate: taxRate / 100,
      });
    } catch (submitError) {
      setError(extractErrorMessage(submitError) ?? 'Não foi possível guardar os dados do estabelecimento.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!fields) {
    return null;
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar estabelecimento</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nome do estabelecimento"
              value={fields.name}
              onChange={(event) => updateField('name', event.target.value)}
              autoFocus
              required
              fullWidth
            />

            <TextField
              label="NUIT"
              value={fields.nuit}
              onChange={(event) => updateField('nuit', event.target.value)}
              required
              fullWidth
            />

            <TextField
              label="Morada"
              value={fields.address}
              onChange={(event) => updateField('address', event.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Telefone"
                value={fields.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={fields.email}
                onChange={(event) => updateField('email', event.target.value)}
                fullWidth
              />
            </Stack>

            <TextField
              label="IVA por omissão (%)"
              type="number"
              inputProps={{ min: 0, max: 100, step: '0.01' }}
              value={fields.defaultTaxRatePercent}
              onChange={(event) => updateField('defaultTaxRatePercent', event.target.value)}
              helperText="Usado como sugestão ao criar novos produtos"
              required
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
