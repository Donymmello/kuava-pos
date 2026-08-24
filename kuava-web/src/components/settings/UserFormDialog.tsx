import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { TENANT_ASSIGNABLE_ROLES, TenantUser, USER_ROLE_LABELS, UserRole } from '../../types';
import { CreateUserInput, UpdateUserInput } from '../../services/userService';

interface UserFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  user: TenantUser | null;
  onClose: () => void;
  onSubmit: (payload: CreateUserInput | UpdateUserInput) => Promise<void>;
}

interface FormFields {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

const EMPTY_FORM: FormFields = { name: '', email: '', role: UserRole.CASHIER, password: '' };

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

export default function UserFormDialog({ open, mode, user, onClose, onSubmit }: UserFormDialogProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(
        user
          ? { name: user.name, email: user.email, role: user.role, password: '' }
          : EMPTY_FORM,
      );
      setError(null);
    }
  }, [open, user]);

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!fields.name.trim() || !fields.email.trim()) {
      setError('Indique o nome e o email.');
      return;
    }

    if (mode === 'create' && fields.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await onSubmit({
          name: fields.name.trim(),
          email: fields.email.trim(),
          role: fields.role,
          password: fields.password,
        });
      } else {
        const payload: UpdateUserInput = {
          name: fields.name.trim(),
          email: fields.email.trim(),
          role: fields.role,
        };
        if (fields.password) {
          payload.password = fields.password;
        }
        await onSubmit(payload);
      }
    } catch (submitError) {
      setError(extractErrorMessage(submitError) ?? 'Não foi possível guardar o utilizador.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'create' ? 'Novo utilizador' : 'Editar utilizador'}</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nome completo"
              value={fields.name}
              onChange={(event) => updateField('name', event.target.value)}
              autoFocus
              required
              fullWidth
            />

            <TextField
              label="Email"
              type="email"
              value={fields.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
              fullWidth
            />

            <TextField
              select
              label="Perfil"
              value={fields.role}
              onChange={(event) => updateField('role', event.target.value as UserRole)}
              required
              fullWidth
            >
              {TENANT_ASSIGNABLE_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {USER_ROLE_LABELS[role]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={mode === 'create' ? 'Senha' : 'Nova senha (opcional)'}
              type="password"
              value={fields.password}
              onChange={(event) => updateField('password', event.target.value)}
              autoComplete="new-password"
              required={mode === 'create'}
              helperText={mode === 'edit' ? 'Deixe em branco para manter a senha atual' : undefined}
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
