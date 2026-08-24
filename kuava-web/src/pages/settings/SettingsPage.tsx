import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import UserFormDialog from '../../components/settings/UserFormDialog';
import TenantFormDialog from '../../components/settings/TenantFormDialog';
import {
  createUser,
  CreateUserInput,
  fetchUsers,
  updateUser,
  UpdateUserInput,
} from '../../services/userService';
import { fetchTenant, updateTenant, UpdateTenantInput } from '../../services/tenantService';
import { useAuthStore } from '../../store/useAuthStore';
import { Tenant, TenantUser, USER_ROLE_LABELS, UserRole } from '../../types';
import { formatDateTime } from '../../utils/date';

export default function SettingsPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const currentUserRole = useAuthStore((state) => state.user?.role);
  const isAdmin = currentUserRole === UserRole.ADMIN;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; message: string } | null>(
    null,
  );

  const loadTenant = useCallback(async () => {
    setTenantLoading(true);
    try {
      const result = await fetchTenant();
      setTenant(result);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os dados do estabelecimento.' });
    } finally {
      setTenantLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchUsers();
      setUsers(result);
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível carregar os utilizadores.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenant();
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [loadTenant, loadUsers, isAdmin]);

  async function handleTenantSubmit(payload: UpdateTenantInput) {
    const updated = await updateTenant(payload);
    setTenant(updated);
    setTenantDialogOpen(false);
    setFeedback({ severity: 'success', message: 'Dados do estabelecimento atualizados com sucesso.' });
  }

  function openCreateDialog() {
    setDialogMode('create');
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEditDialog(user: TenantUser) {
    setDialogMode('edit');
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleSubmit(payload: CreateUserInput | UpdateUserInput) {
    if (dialogMode === 'create') {
      await createUser(payload as CreateUserInput);
      setFeedback({ severity: 'success', message: 'Utilizador criado com sucesso.' });
    } else if (editingUser) {
      await updateUser(editingUser.id, payload as UpdateUserInput);
      setFeedback({ severity: 'success', message: 'Utilizador atualizado com sucesso.' });
    }
    setDialogOpen(false);
    await loadUsers();
  }

  async function handleToggleActive(user: TenantUser) {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      setFeedback({
        severity: 'success',
        message: user.is_active ? `"${user.name}" foi desativado.` : `"${user.name}" foi reativado.`,
      });
      await loadUsers();
    } catch {
      setFeedback({ severity: 'error', message: 'Não foi possível atualizar o estado do utilizador.' });
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Definições</Typography>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, mb: 2 }}>
        <Box>
          <Typography variant="h6">Estabelecimento</Typography>
          <Typography variant="body2" color="text.secondary">
            Dados fiscais e de contacto usados em vendas e recibos
          </Typography>
        </Box>
        {isAdmin && tenant && (
          <Button
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={() => setTenantDialogOpen(true)}
          >
            Editar
          </Button>
        )}
      </Stack>

      {!tenantLoading && tenant && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Nome
              </Typography>
              <Typography variant="body1">{tenant.name}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                NUIT
              </Typography>
              <Typography variant="body1">{tenant.nuit}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                IVA por omissão
              </Typography>
              <Typography variant="body1">
                {(Math.round(tenant.default_tax_rate * 10000) / 100).toString().replace('.', ',')}%
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Morada
              </Typography>
              <Typography variant="body1">{tenant.address || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Telefone
              </Typography>
              <Typography variant="body1">{tenant.phone || '—'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary">
                Email
              </Typography>
              <Typography variant="body1">{tenant.email || '—'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 4 }}>
          Apenas administradores podem editar os dados do estabelecimento e gerir utilizadores.
        </Alert>
      )}

      {isAdmin && (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, mb: 2 }}>
            <Box>
              <Typography variant="h6">Utilizadores</Typography>
              <Typography variant="body2" color="text.secondary">
                Contas com acesso ao Kuava POS neste estabelecimento
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
              Novo Utilizador
            </Button>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nenhum utilizador encontrado.
                  </TableCell>
                </TableRow>
              )}
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <TableRow key={user.id} hover sx={{ opacity: user.is_active ? 1 : 0.6 }}>
                    <TableCell>
                      {user.name}
                      {isSelf && (
                        <Chip size="small" label="Tu" variant="outlined" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{USER_ROLE_LABELS[user.role]}</TableCell>
                    <TableCell>{formatDateTime(user.created_at)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={user.is_active ? 'Ativo' : 'Inativo'}
                        color={user.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEditDialog(user)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isSelf ? 'Não pode desativar a sua própria conta' : user.is_active ? 'Desativar' : 'Reativar'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleActive(user)}
                            disabled={isSelf && user.is_active}
                          >
                            {user.is_active ? (
                              <BlockOutlinedIcon fontSize="small" />
                            ) : (
                              <RestoreOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}

      <TenantFormDialog
        open={tenantDialogOpen}
        tenant={tenant}
        onClose={() => setTenantDialogOpen(false)}
        onSubmit={handleTenantSubmit}
      />

      <UserFormDialog
        open={dialogOpen}
        mode={dialogMode}
        user={editingUser}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
      />

      <Snackbar open={Boolean(feedback)} autoHideDuration={4000} onClose={() => setFeedback(null)}>
        {feedback ? (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)} variant="filled">
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
