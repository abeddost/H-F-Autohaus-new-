// Builds the two contact form emails: the notification the dealership receives
// and the confirmation the visitor receives. Email clients ignore <style> blocks
// and modern CSS, so the layout uses tables and inline styles only.

const LOGO_URL = 'https://www.hf-autos.de/logo-360.v1.png';
const SITE_URL = 'https://www.hf-autos.de';
const CONTACT_PAGE_URL = `${SITE_URL}/kontakt`;

const DEALER = {
    name: 'H&F Autohaus Bodenheim',
    address: 'Am Kümmerling 41a, 55294 Bodenheim',
    phone: '0176 628 783 66',
    phoneHref: 'tel:+4917662878366',
    whatsappHref: 'https://wa.me/4917662878366',
    routeHref: 'https://www.google.com/maps/dir/?api=1&destination=Am+K%C3%BCmmerling+41a,+55294+Bodenheim',
    hours: 'Mo – Fr · 09:00 – 18:00 Uhr',
    hoursNote: 'Termine nach Vereinbarung'
};

const COLORS = {
    page: '#eef0f4',
    card: '#ffffff',
    ink: '#0a0a0b',
    text: '#26262b',
    mute: '#656b76',
    line: '#e5e7eb',
    accent: '#2563eb',
    accentSoft: '#eef4ff',
    whatsapp: '#16a34a'
};

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Same rules as formatPhone in public/js/site.js: the form shows a fixed +49 prefix. */
function formatPhone(raw) {
    const value = String(raw || '').trim();
    if (!value) {
        return '';
    }
    if (value.startsWith('+')) {
        return value;
    }
    if (value.startsWith('00')) {
        return `+${value.slice(2)}`;
    }
    return `+49 ${value.replace(/^0+/, '')}`;
}

function formatReceivedAt(date) {
    return new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date) + ' Uhr';
}

function oneLine(value, max) {
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cleanText(value) {
    return String(value).replace(/\r\n?/g, '\n').trim();
}

function button(href, label, color) {
    // Inline-block links (not table cells) so the buttons wrap on narrow phones.
    return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 6px 8px 0;background:${color};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;line-height:1;text-decoration:none;padding:13px 20px;border-radius:999px;">${label}</a>`;
}

function link(href, text, color = COLORS.accent) {
    return `<a href="${escapeHtml(href)}" style="color:${color};text-decoration:none;">${escapeHtml(text)}</a>`;
}

function sectionLabel(text) {
    return `<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.mute};">${text}</p>`;
}

/** One padded row of the white card. */
function section(content, padding = '16px 24px 8px') {
    return `                <tr><td style="padding:${padding};">
                    ${content}
                </td></tr>
`;
}

function detailRows(rows) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.map(([label, valueHtml]) => `<tr>
            <td style="padding:12px 0;border-top:1px solid ${COLORS.line};font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.mute};width:90px;vertical-align:top;">${label}</td>
            <td style="padding:12px 0;border-top:1px solid ${COLORS.line};font-family:${FONT};font-size:15px;line-height:1.5;color:${COLORS.ink};vertical-align:top;word-break:break-word;">${valueHtml}</td>
        </tr>`).join('')}
    </table>`;
}

function messageBox(message) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:${COLORS.accentSoft};border-left:3px solid ${COLORS.accent};border-radius:8px;padding:18px 20px;font-family:${FONT};font-size:15px;line-height:1.65;color:${COLORS.text};word-break:break-word;">${escapeHtml(message).replace(/\n/g, '<br>')}</td></tr>
    </table>`;
}

function vehicleCard(vehicle) {
    const image = vehicle.image
        ? `<td width="112" style="width:112px;padding:12px 0 12px 12px;vertical-align:middle;">
            <a href="${escapeHtml(vehicle.url)}"><img src="${escapeHtml(vehicle.image)}" width="112" alt="" style="display:block;width:112px;height:auto;border:0;border-radius:8px;"></a>
        </td>`
        : '';
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.line};border-radius:12px;">
        <tr>
            ${image}
            <td style="padding:12px 16px;vertical-align:middle;font-family:${FONT};">
                <p style="margin:0;font-size:16px;font-weight:600;line-height:1.35;color:${COLORS.ink};"><a href="${escapeHtml(vehicle.url)}" style="color:${COLORS.ink};text-decoration:none;">${escapeHtml(vehicle.name)}</a></p>
                ${vehicle.price ? `<p style="margin:4px 0 0;font-size:15px;font-weight:600;color:${COLORS.accent};">${escapeHtml(vehicle.price)}</p>` : ''}
                <p style="margin:6px 0 0;font-size:12px;color:${COLORS.mute};">Nr. ${escapeHtml(vehicle.id)} · ${link(vehicle.url, 'Fahrzeug ansehen →')}</p>
            </td>
        </tr>
    </table>`;
}

/** Page shell shared by both emails: logo + badge, white card with accent bar, footer. */
function layout({ title, preheader, badge, body, footer }) {
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

        <tr><td style="padding:0 4px 20px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="vertical-align:middle;">
                    <a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" width="150" height="35" alt="H&amp;F Autohaus" style="display:block;border:0;width:150px;height:auto;"></a>
                </td>
                <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;background:${COLORS.card};border:1px solid ${COLORS.line};border-radius:999px;padding:7px 14px;font-family:${FONT};font-size:12px;font-weight:600;color:${COLORS.accent};white-space:nowrap;">${badge}</span>
                </td>
            </tr></table>
        </td></tr>

        <tr><td style="background:${COLORS.card};border-radius:16px;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:4px;background:${COLORS.accent};font-size:0;line-height:0;">&nbsp;</td></tr>
${body}
            </table>
        </td></tr>

        <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.mute};text-align:center;word-break:break-word;">
            ${footer}
        </td></tr>

    </table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(eyebrow, title, subline) {
    return section(`<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${COLORS.accent};">${eyebrow}</p>
                    <h1 style="margin:0 0 6px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;color:${COLORS.ink};">${title}</h1>
                    ${subline}`, '28px 24px 8px');
}

/**
 * Email to the dealership. `vehicle` is the car the visitor picked, or null for
 * "Sonstiges". A car that is no longer listed has only `id` and `name`.
 *
 * @param {{ name: string, email: string, phone?: string, message: string, receivedAt?: Date,
 *   vehicle?: { id: string, name: string, price?: string, url?: string, image?: string } | null }} submission
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildContactNotification({ name, email, phone, message, vehicle = null, receivedAt = new Date() }) {
    const cleanName = oneLine(name, 80);
    const cleanEmail = oneLine(email, 254);
    const formattedPhone = formatPhone(phone);
    const phoneDigits = formattedPhone.replace(/[^\d]/g, '');
    const cleanMessage = cleanText(message);
    const when = formatReceivedAt(receivedAt);

    const subject = `Website-Anfrage von ${cleanName} – ${vehicle ? oneLine(vehicle.name, 80) : 'H&F Autohaus'}`;
    const replyHref = `mailto:${cleanEmail}?subject=${encodeURIComponent('Ihre Anfrage bei H&F Autohaus')}`;

    const rows = [
        ['Quelle', `Kontaktformular auf <span style="white-space:nowrap;">${link(CONTACT_PAGE_URL, 'hf-autos.de/kontakt')}</span>`],
        ['E-Mail', link(`mailto:${cleanEmail}`, cleanEmail)],
        ['Telefon', formattedPhone ? link(`tel:+${phoneDigits}`, formattedPhone) : `<span style="color:${COLORS.mute};">Nicht angegeben</span>`]
    ];
    if (!vehicle || !vehicle.url) {
        rows.push(['Fahrzeug', vehicle
            ? `${escapeHtml(vehicle.name)} <span style="color:${COLORS.mute};">(Nr. ${escapeHtml(vehicle.id)})</span>`
            : 'Sonstiges – kein bestimmtes Fahrzeug']);
    }

    const body = [
        heading('Neue Anfrage über hf-autos.de', escapeHtml(cleanName),
            `<p style="margin:0;font-family:${FONT};font-size:14px;color:${COLORS.mute};">${escapeHtml(when)}</p>`),
        section(detailRows(rows), '20px 24px 4px'),
        vehicle && vehicle.url ? section(sectionLabel('Fahrzeug') + vehicleCard(vehicle), '16px 24px 4px') : '',
        section(sectionLabel('Nachricht') + messageBox(cleanMessage)),
        section([
            button(replyHref, 'Antworten', COLORS.accent),
            phoneDigits ? button(`tel:+${phoneDigits}`, 'Anrufen', COLORS.ink) : '',
            phoneDigits ? button(`https://wa.me/${phoneDigits}`, 'WhatsApp', COLORS.whatsapp) : ''
        ].join(''), '20px 24px 20px')
    ].join('');

    const html = layout({
        title: subject,
        preheader: oneLine(cleanMessage, 110),
        badge: 'Website-Anfrage',
        body,
        footer: `Gesendet über das Kontaktformular auf <a href="${SITE_URL}" style="color:${COLORS.mute};">hf-autos.de</a> · Datenschutz-Einwilligung erteilt<br>
            „Antworten“ in Ihrem Postfach schreibt direkt an ${escapeHtml(cleanEmail)}.`
    });

    const text = [
        'NEUE ANFRAGE ÜBER DIE WEBSITE – H&F Autohaus',
        when,
        '',
        'Quelle:  Kontaktformular auf hf-autos.de/kontakt',
        `Name:    ${cleanName}`,
        `E-Mail:  ${cleanEmail}`,
        `Telefon: ${formattedPhone || 'Nicht angegeben'}`,
        `Fahrzeug: ${vehicle
            ? [vehicle.name, vehicle.price, `Nr. ${vehicle.id}`, vehicle.url].filter(Boolean).join(' · ')
            : 'Sonstiges – kein bestimmtes Fahrzeug'}`,
        '',
        'Nachricht:',
        cleanMessage,
        '',
        '—',
        'Gesendet über das Kontaktformular auf hf-autos.de. Datenschutz-Einwilligung erteilt.'
    ].join('\n');

    return { subject, html, text };
}

/**
 * Confirmation email to the visitor. Same inputs as the notification; a vehicle
 * without `url` (no longer listed) is left out.
 *
 * @returns {{ subject: string, html: string, text: string }}
 */
function buildContactConfirmation({ name, message, vehicle = null }) {
    const cleanName = oneLine(name, 60);
    const cleanMessage = cleanText(message);
    const listed = vehicle && vehicle.url ? vehicle : null;

    const subject = listed
        ? `Ihre Anfrage zum ${oneLine(listed.name, 80)} – H&F Autohaus`
        : 'Ihre Anfrage bei H&F Autohaus Bodenheim';

    const contactRows = [
        ['Adresse', `${link(DEALER.routeHref, DEALER.address, COLORS.ink)}`],
        ['Telefon', link(DEALER.phoneHref, DEALER.phone)],
        ['Zeiten', `${DEALER.hours}<br><span style="font-size:13px;color:${COLORS.mute};">${DEALER.hoursNote}</span>`]
    ];

    const body = [
        heading('Ihre Anfrage ist eingegangen', `Vielen Dank, ${escapeHtml(cleanName)}!`,
            `<p style="margin:12px 0 0;font-family:${FONT};font-size:15px;line-height:1.65;color:${COLORS.text};">wir haben Ihre Nachricht erhalten und melden uns schnellstmöglich persönlich bei Ihnen.</p>`),
        listed ? section(sectionLabel('Ihr Wunschfahrzeug') + vehicleCard(listed), '20px 24px 4px') : '',
        section(sectionLabel('Ihre Nachricht') + messageBox(cleanMessage), listed ? '16px 24px 8px' : '20px 24px 8px'),
        section(`<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.text};">Sie möchten nicht warten? Sie erreichen uns auch direkt:</p>
                    ${button(DEALER.phoneHref, 'Anrufen', COLORS.ink)}${button(DEALER.whatsappHref, 'WhatsApp', COLORS.whatsapp)}${button(DEALER.routeHref, 'Route planen', COLORS.accent)}`, '20px 24px 8px'),
        section(detailRows(contactRows), '12px 24px 4px'),
        section(`<p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${COLORS.text};">Mit freundlichen Grüßen<br><strong style="color:${COLORS.ink};">Ihr Team von ${escapeHtml(DEALER.name)}</strong></p>`, '20px 24px 28px')
    ].join('');

    const html = layout({
        title: subject,
        preheader: 'Vielen Dank für Ihre Anfrage – wir melden uns schnellstmöglich bei Ihnen.',
        badge: 'Anfrage erhalten',
        body,
        footer: `${escapeHtml(DEALER.name)} · ${escapeHtml(DEALER.address)}<br>
            Sie erhalten diese E-Mail, weil Sie über <a href="${SITE_URL}" style="color:${COLORS.mute};">hf-autos.de</a> eine Anfrage gesendet haben. Sie können einfach auf diese E-Mail antworten.<br>
            <a href="${SITE_URL}/impressum" style="color:${COLORS.mute};">Impressum</a> · <a href="${SITE_URL}/datenschutz" style="color:${COLORS.mute};">Datenschutz</a>`
    });

    const text = [
        `Vielen Dank, ${cleanName}!`,
        '',
        'wir haben Ihre Nachricht erhalten und melden uns schnellstmöglich persönlich bei Ihnen.',
        ...(listed ? ['', `Ihr Wunschfahrzeug: ${[listed.name, listed.price].filter(Boolean).join(' · ')}`, listed.url] : []),
        '',
        'Ihre Nachricht:',
        cleanMessage,
        '',
        'Sie erreichen uns auch direkt:',
        `Telefon/WhatsApp: ${DEALER.phone}`,
        `Adresse: ${DEALER.address}`,
        `Öffnungszeiten: ${DEALER.hours} (${DEALER.hoursNote})`,
        '',
        'Mit freundlichen Grüßen',
        `Ihr Team von ${DEALER.name}`,
        '',
        '—',
        `Impressum: ${SITE_URL}/impressum · Datenschutz: ${SITE_URL}/datenschutz`
    ].join('\n');

    return { subject, html, text };
}

module.exports = { buildContactNotification, buildContactConfirmation, escapeHtml, formatPhone };
