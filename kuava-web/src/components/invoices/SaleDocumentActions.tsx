import { MouseEvent, useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Sale, Tenant } from '../../types';
import { generateInvoicePdf, InvoiceFormat } from '../../utils/pdfInvoice';

interface SaleDocumentActionsProps {
  sale: Sale;
  tenant: Tenant | null;
  onPrintReceipt: () => void;
  size?: 'small' | 'medium';
}

/**
 * Ações partilhadas de documento de venda — reutilizadas no histórico de
 * faturas e no ecrã de confirmação de venda do POS: descarregar a
 * fatura-recibo em PDF (A4 ou A5) e imprimir o recibo térmico (58/80mm).
 */
export default function SaleDocumentActions({
  sale,
  tenant,
  onPrintReceipt,
  size = 'medium',
}: SaleDocumentActionsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  function handleOpenMenu(event: MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
  }

  function handleCloseMenu() {
    setAnchorEl(null);
  }

  function handleDownload(format: InvoiceFormat) {
    if (tenant) {
      generateInvoicePdf(sale, tenant, format);
    }
    handleCloseMenu();
  }

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        startIcon={<PictureAsPdfOutlinedIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleOpenMenu}
        disabled={!tenant}
      >
        Fatura PDF
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={() => handleDownload('a4')}>Formato A4</MenuItem>
        <MenuItem onClick={() => handleDownload('a5')}>Formato A5</MenuItem>
      </Menu>

      <Button size={size} variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={onPrintReceipt}>
        Imprimir recibo
      </Button>
    </>
  );
}
