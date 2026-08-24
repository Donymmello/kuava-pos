import { Fragment } from 'react';
import { Box, Typography } from '@mui/material';
import { getSaleItemProductName, MOBILE_MONEY_FLOW_LABELS, MobileMoneyFlow, PAYMENT_METHOD_LABELS, Sale, Tenant } from '../../types';
import { formatMzn } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';

interface ThermalReceiptProps {
  sale: Sale | null;
  tenant: Tenant | null;
}

function Divider() {
  return <Box sx={{ borderBottom: '1px dashed #000', my: 0.75 }} />;
}

/**
 * Marcação impressa numa impressora térmica (58/80mm) via window.print().
 * Fica sempre montada mas invisível no ecrã (ver src/styles/print.css) —
 * só aparece quando o diálogo de impressão do browser é aberto, altura em
 * que passa a ser o único conteúdo visível na página.
 */
export default function ThermalReceipt({ sale, tenant }: ThermalReceiptProps) {
  if (!sale || !tenant) {
    return <div id="thermal-receipt-print" className="print-only" />;
  }

  return (
    <div id="thermal-receipt-print" className="print-only">
      <Box sx={{ fontFamily: '"Courier New", monospace', fontSize: '11px', width: '100%', color: '#000' }}>
        <Typography align="center" sx={{ fontWeight: 700, fontSize: '13px', fontFamily: 'inherit' }}>
          {tenant.name}
        </Typography>
        <Typography align="center" sx={{ fontSize: '10px', fontFamily: 'inherit' }}>
          NUIT: {tenant.nuit}
        </Typography>
        {tenant.address && (
          <Typography align="center" sx={{ fontSize: '10px', fontFamily: 'inherit' }}>
            {tenant.address}
          </Typography>
        )}
        {tenant.phone && (
          <Typography align="center" sx={{ fontSize: '10px', fontFamily: 'inherit' }}>
            Tel: {tenant.phone}
          </Typography>
        )}

        <Divider />

        {sale.status === 'CANCELLED' && (
          <Typography align="center" sx={{ fontWeight: 700, fontFamily: 'inherit', my: 0.5 }}>
            *** VENDA CANCELADA ***
          </Typography>
        )}

        <Typography sx={{ fontFamily: 'inherit' }}>Recibo Nº {sale.id.slice(0, 8).toUpperCase()}</Typography>
        <Typography sx={{ fontFamily: 'inherit' }}>{formatDateTime(sale.created_at)}</Typography>
        <Typography sx={{ fontFamily: 'inherit' }}>Operador: {sale.user?.name ?? '—'}</Typography>

        <Divider />

        {sale.items.map((item) => (
          <Fragment key={item.id}>
            <Typography sx={{ fontFamily: 'inherit' }}>{getSaleItemProductName(item)}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'inherit' }}>
              <span>
                {item.quantity} x {formatMzn(item.unit_price)}
              </span>
              <span>{formatMzn(item.subtotal)}</span>
            </Box>
          </Fragment>
        ))}

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'inherit' }}>
          <span>Subtotal</span>
          <span>{formatMzn(sale.total_amount - sale.tax_amount)}</span>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'inherit' }}>
          <span>IVA</span>
          <span>{formatMzn(sale.tax_amount)}</span>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'inherit',
            fontWeight: 700,
            fontSize: '13px',
            mt: 0.5,
          }}
        >
          <span>TOTAL</span>
          <span>{formatMzn(sale.total_amount)}</span>
        </Box>

        <Divider />

        <Typography sx={{ fontFamily: 'inherit' }}>
          Pagamento: {PAYMENT_METHOD_LABELS[sale.payment_method]}
        </Typography>
        {sale.mobile_money_flow === MobileMoneyFlow.TRANSFER && sale.payment_reference && (
          <Typography sx={{ fontFamily: 'inherit' }}>Ref.: {sale.payment_reference}</Typography>
        )}
        {sale.mobile_money_flow === MobileMoneyFlow.AGENT && sale.agent_margin_amount !== null && (
          <Typography sx={{ fontFamily: 'inherit' }}>
            {MOBILE_MONEY_FLOW_LABELS[MobileMoneyFlow.AGENT]} · Margem: {formatMzn(sale.agent_margin_amount)}
          </Typography>
        )}

        <Typography align="center" sx={{ fontFamily: 'inherit', mt: 1 }}>
          Obrigado pela preferência!
        </Typography>
        <Typography align="center" sx={{ fontFamily: 'inherit', fontSize: '9px', mt: 0.5 }}>
          Processado por Kuava POS
        </Typography>
      </Box>
    </div>
  );
}
