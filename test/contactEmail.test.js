const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContactNotification, formatPhone } = require('../lib/contactEmail');

const submission = {
    name: 'Max Mustermann',
    email: 'max@beispiel.de',
    phone: '0176 1234567',
    message: 'BMW 320d, Baujahr 2018\nca. 95.000 km',
    receivedAt: new Date('2026-10-30T14:05:00Z')
};

test('notification contains the submission and quick actions', () => {
    const { subject, html, text } = buildContactNotification(submission);

    assert.equal(subject, 'Website-Anfrage von Max Mustermann – H&F Autohaus');
    assert.match(html, /Website-Anfrage/);
    assert.match(html, /Kontaktformular auf <span style="white-space:nowrap;"><a href="https:\/\/www\.hf-autos\.de\/kontakt"/);
    assert.match(text, /Quelle:  Kontaktformular auf hf-autos\.de\/kontakt/);
    assert.match(html, /BMW 320d, Baujahr 2018<br>ca\. 95\.000 km/);
    assert.match(html, /href="mailto:max@beispiel\.de\?subject=/);
    assert.match(html, /href="tel:\+491761234567"/);
    assert.match(html, /href="https:\/\/wa\.me\/491761234567"/);
    assert.match(html, /15:05 Uhr/, 'time is shown in German local time');
    assert.match(text, /Telefon: \+49 176 1234567/);
});

test('user input cannot inject HTML', () => {
    const { subject, html } = buildContactNotification({
        ...submission,
        name: '<b>Evil</b>\nBcc: x@y.z',
        message: '<a href="https://spam.example">Klick</a><script>alert(1)</script>'
    });

    assert.doesNotMatch(html, /<script>|<a href="https:\/\/spam|<b>Evil/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(subject, /\n/);
});

test('phone buttons are omitted without a phone number', () => {
    const { html, text } = buildContactNotification({ ...submission, phone: '' });

    assert.doesNotMatch(html, /tel:|wa\.me/);
    assert.match(html, /Nicht angegeben/);
    assert.match(text, /Telefon: Nicht angegeben/);
});

test('formatPhone matches the form formatting', () => {
    assert.equal(formatPhone('0176 123'), '+49 176 123');
    assert.equal(formatPhone('0043 660 1'), '+43 660 1');
    assert.equal(formatPhone('+31 6 1'), '+31 6 1');
    assert.equal(formatPhone('  '), '');
});
