/**
 * Contacto de suporte, num sítio só.
 *
 * Esteve ausente da app inteira até 2026-10-04: um comerciante com o acesso
 * suspenso, ou com uma venda que não sincronizava, não tinha para onde ligar
 * de dentro do produto. Os emails automáticos já traziam o endereço no
 * rodapé e no Reply-To (ver kuava-api/src/services/emailService.ts), o que
 * tornava a lacuna mais estranha ainda: o produto dizia por email onde pedir
 * ajuda, e no ecrã não dizia nada.
 */

export const SUPORTE_EMAIL = 'suporte@vektramz.com';

/** Formato legível, como se escreve num cartão. */
export const SUPORTE_TELEFONE = '+258 86 916 4456';

/** Só dígitos, com indicativo e sem o +, que é o que o wa.me exige. */
const SUPORTE_WHATSAPP_DIGITOS = '258869164456';

export const SUPORTE_WHATSAPP_URL = `https://wa.me/${SUPORTE_WHATSAPP_DIGITOS}`;

/**
 * Link de email com assunto já preenchido. O `contexto` diz de que ecrã o
 * pedido partiu, para quem responde não ter de perguntar onde é que a pessoa
 * estava quando se chateou.
 */
export function suporteMailto(contexto: string): string {
  const assunto = encodeURIComponent(`Kuava POS: ${contexto}`);
  return `mailto:${SUPORTE_EMAIL}?subject=${assunto}`;
}
