import jsPDF from 'jspdf';
import { getSaleItemProductName, MOBILE_MONEY_FLOW_LABELS, MobileMoneyFlow, PAYMENT_METHOD_LABELS, Sale, Tenant } from '../types';
import { formatMzn } from './currency';
import { formatDateTime } from './date';

export type InvoiceFormat = 'a4' | 'a5';

/**
 * Gera e descarrega uma fatura-recibo em PDF para a venda indicada, usando os
 * dados do estabelecimento (nome, NUIT, morada, contacto) no cabeçalho.
 * Funciona inteiramente no browser (jsPDF) — não depende de nenhum endpoint
 * novo no backend, já que toda a informação já vem de GET /sales/:id e
 * GET /tenants/me.
 */
export function generateInvoicePdf(sale: Sale, tenant: Tenant, format: InvoiceFormat = 'a4'): void {
  const doc = new jsPDF({ unit: 'mm', format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isA5 = format === 'a5';
  const marginX = isA5 ? 12 : 18;
  const topMargin = isA5 ? 14 : 20;
  const bottomLimit = pageHeight - (isA5 ? 22 : 28);

  const titleSize = isA5 ? 13 : 17;
  const bodySize = isA5 ? 9 : 10;
  const smallSize = isA5 ? 7.5 : 8.5;

  let y = topMargin;

  // --- Cabeçalho: dados do estabelecimento ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleSize);
  doc.text(tenant.name, marginX, y);
  y += isA5 ? 5 : 6.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(smallSize);
  doc.text(`NUIT: ${tenant.nuit}`, marginX, y);
  y += 4;
  if (tenant.address) {
    doc.text(tenant.address, marginX, y);
    y += 4;
  }
  const contactLine = [tenant.phone, tenant.email].filter(Boolean).join('   ·   ');
  if (contactLine) {
    doc.text(contactLine, marginX, y);
    y += 4;
  }

  y += 2;
  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA5 ? 6 : 8;

  // --- Título e metadados do documento ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 11 : 13);
  doc.text('FATURA-RECIBO', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(smallSize);
  doc.text(`Nº ${sale.id.slice(0, 8).toUpperCase()}`, pageWidth - marginX, y, { align: 'right' });
  y += isA5 ? 4.5 : 5.5;

  doc.text(`Data: ${formatDateTime(sale.created_at)}`, marginX, y);
  doc.text(`Operador: ${sale.user?.name ?? '—'}`, pageWidth - marginX, y, { align: 'right' });
  y += 4;
  doc.text(`Pagamento: ${PAYMENT_METHOD_LABELS[sale.payment_method]}`, marginX, y);
  y += isA5 ? 4.5 : 5.5;

  if (sale.mobile_money_flow === MobileMoneyFlow.TRANSFER && sale.payment_reference) {
    doc.text(`Ref. confirmação: ${sale.payment_reference}`, marginX, y);
    y += isA5 ? 4.5 : 5.5;
  } else if (sale.mobile_money_flow === MobileMoneyFlow.AGENT && sale.agent_margin_amount !== null) {
    doc.text(
      `Modalidade: ${MOBILE_MONEY_FLOW_LABELS[MobileMoneyFlow.AGENT]} · Margem: ${formatMzn(sale.agent_margin_amount)}`,
      marginX,
      y,
    );
    y += isA5 ? 4.5 : 5.5;
  }

  y += isA5 ? 1 : 2;

  if (sale.status === 'CANCELLED') {
    doc.setTextColor(214, 69, 69);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isA5 ? 11 : 13);
    doc.text('VENDA CANCELADA', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(20, 20, 20);
    y += isA5 ? 6 : 8;
  }

  // --- Tabela de artigos ---
  const contentWidth = pageWidth - marginX * 2;
  const colProduct = marginX;
  const colQty = marginX + contentWidth * 0.56;
  const colPrice = marginX + contentWidth * 0.74;
  const colSubtotal = pageWidth - marginX;
  const productColWidth = colQty - colProduct - 3;

  function drawTableHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(bodySize);
    doc.text('Produto', colProduct, y);
    doc.text('Qtd.', colQty, y, { align: 'right' });
    doc.text('Preço', colPrice, y, { align: 'right' });
    doc.text('Subtotal', colSubtotal, y, { align: 'right' });
    y += 2;
    doc.setDrawColor(225);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += isA5 ? 4 : 5;
    doc.setFont('helvetica', 'normal');
  }

  drawTableHeader();

  const lineHeight = isA5 ? 3.6 : 4.2;

  for (const item of sale.items) {
    const name = getSaleItemProductName(item);
    const lines = doc.splitTextToSize(name, productColWidth) as string[];
    const rowHeight = Math.max(lines.length * lineHeight, lineHeight);

    if (y + rowHeight > bottomLimit) {
      doc.addPage(format);
      y = topMargin;
      drawTableHeader();
    }

    doc.setFontSize(bodySize);
    lines.forEach((line, index) => {
      doc.text(line, colProduct, y + index * lineHeight);
    });
    doc.text(String(item.quantity), colQty, y, { align: 'right' });
    doc.text(formatMzn(item.unit_price), colPrice, y, { align: 'right' });
    doc.text(formatMzn(item.subtotal), colSubtotal, y, { align: 'right' });
    y += rowHeight + 1.5;
  }

  y += 1.5;
  doc.setDrawColor(225);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA5 ? 5 : 6.5;

  // --- Totais ---
  const subtotal = sale.total_amount - sale.tax_amount;
  const totalsValueX = pageWidth - marginX;
  const totalsLabelX = totalsValueX - (isA5 ? 38 : 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  doc.text('Subtotal', totalsLabelX, y);
  doc.text(formatMzn(subtotal), totalsValueX, y, { align: 'right' });
  y += isA5 ? 4.5 : 5.5;

  doc.text('IVA', totalsLabelX, y);
  doc.text(formatMzn(sale.tax_amount), totalsValueX, y, { align: 'right' });
  y += isA5 ? 5.5 : 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 11 : 13);
  doc.text('Total', totalsLabelX, y);
  doc.text(formatMzn(sale.total_amount), totalsValueX, y, { align: 'right' });
  y += isA5 ? 8 : 10;

  // --- Rodapé ---
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(smallSize);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento processado por computador — Kuava POS', marginX, pageHeight - (isA5 ? 10 : 14));
  doc.text('Obrigado pela preferência!', marginX, pageHeight - (isA5 ? 6 : 9));

  doc.save(`fatura-${sale.id.slice(0, 8).toLowerCase()}.pdf`);
}
