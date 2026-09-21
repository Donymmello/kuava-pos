import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../src/services/emailService';

// Sem vi.mock de propósito: este ficheiro testa a implementação verdadeira
// de escapeHtml, ao contrário de trialReminder.test.ts, que substitui o
// módulo inteiro por um duplo.
describe('escapeHtml', () => {
  it('neutraliza HTML vindo do nome do estabelecimento', () => {
    // O nome é editável pelo cliente (tenantService.updateTenant) e o
    // destinatário também (tenant.email). HTML por escapar aqui seria
    // phishing entregue pelo nosso próprio domínio, com DKIM válido.
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml('<a href="http://mau.com">Clica</a>')).toBe(
      '&lt;a href=&quot;http://mau.com&quot;&gt;Clica&lt;/a&gt;',
    );
  });

  it('preserva nomes legítimos com aspas e &', () => {
    expect(escapeHtml('Padaria "Pérola" & Cia')).toBe('Padaria &quot;Pérola&quot; &amp; Cia');
    expect(escapeHtml("O'Brien")).toBe('O&#39;Brien');
  });

  it('escapa o & primeiro, senão as entidades ficavam duplamente escapadas', () => {
    expect(escapeHtml('<a>&</a>')).toBe('&lt;a&gt;&amp;&lt;/a&gt;');
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('deixa passar texto sem caracteres especiais', () => {
    expect(escapeHtml('Padaria Pérola do Índico')).toBe('Padaria Pérola do Índico');
  });
});
