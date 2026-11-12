// Nota: modelo dos e-mails do C4Diagrams ("papel claro"): cartão branco sobre cinza, faixa escura com a marca, botão
// azul e um link alternativo curto. Clientes de e-mail (Gmail, Outlook) só aceitam HTML simples: tabelas, estilos
// escritos em cada elemento e fontes do sistema, sem CSS nem imagens externas.
const SANS = 'Arial, Helvetica, sans-serif';
const MONO = "Consolas, 'Courier New', monospace";
const BRAND_COLORS = ['#08427B', '#1168BD', '#438DD5', '#85BBF0'];

// Os quatro quadrados da marca, nas cores oficiais da notação C4
function brandMark() {
  const cell = (color) =>
    `<td style="width:7px;height:7px;background:${color};border-radius:2px;font-size:0;line-height:0">&nbsp;</td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="2" style="border-collapse:separate"><tr>${cell(BRAND_COLORS[0])}${cell(BRAND_COLORS[1])}</tr><tr>${cell(BRAND_COLORS[2])}${cell(BRAND_COLORS[3])}</tr></table>`;
}

// O texto do link alternativo: só o endereço, sem o protocolo e sem o token (que fica no destino do clique). Operação
// de texto, e não new URL(): montar o e-mail nunca pode falhar, nem com o endereço da aplicação mal configurado
function shortLabel(link) {
  return link.split('?')[0].replace(/^https?:\/\//, '');
}

function renderHtml({ title, lead, buttonLabel, link, expiry, footer }) {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#F2F4F8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F8"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #DDE2EB;border-radius:14px">
    <tr><td style="background:#111826;border-radius:14px 14px 0 0;padding:16px 28px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:8px">${brandMark()}</td>
        <td style="font-family:${MONO};font-size:14px;color:#EEF2FA;font-weight:bold">C4//diagrams</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:30px 28px 28px">
      <h1 style="margin:0 0 12px;font-family:${SANS};font-size:22px;line-height:1.3;color:#111826">${title}</h1>
      <p style="margin:0 0 24px;font-family:${SANS};font-size:15px;line-height:1.6;color:#3B4558">${lead}</p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#3D6FD6">
        <a href="${link}" style="display:inline-block;padding:13px 26px;font-family:${SANS};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:8px">${buttonLabel}</a>
      </td></tr></table>
      <p style="margin:20px 0 0;font-family:${SANS};font-size:13px;color:#5B6578">${expiry}</p>
      <p style="margin:20px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:#7A8497">Se o botão não funcionar, use este link: <a href="${link}" style="color:#2F5FC4;text-decoration:underline">${shortLabel(link)}</a></p>
    </td></tr>
    <tr><td style="border-top:1px solid #E6EAF1;padding:16px 28px;font-family:${SANS};font-size:12px;line-height:1.5;color:#7A8497">${footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

// Versão em texto puro: ajuda o e-mail a não cair no spam e funciona em qualquer leitor. Leva o link inteiro, porque
// texto puro não tem link clicável.
function renderText({ title, lead, link, expiry, footer }) {
  return [`C4Diagrams — ${title}`, '', lead, '', link, '', expiry, '', footer].join('\n');
}

function renderEmail(content) {
  return { html: renderHtml(content), text: renderText(content) };
}

module.exports = { renderEmail };
