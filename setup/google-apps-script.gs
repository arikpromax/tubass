/* ============================================================
   Alexon Home Services — requests from the website form.

   Each request from the "Let us call you" form becomes a row in
   this Google Sheet and an email to Alexon.

   Setup (once):
   1. Open the Google Sheet for requests (any name).
   2. Extensions → Apps Script → delete what is there → paste this file → Save.
   3. Deploy → New deployment → ⚙ Select type: Web app
        Execute as: Me
        Who has access: Anyone
      → Deploy → Authorize access (choose the account, Advanced → Go to … → Allow).
   4. Copy the "Web app URL" (ends with /exec) and send it to the developer.

   After changing this file: Deploy → Manage deployments → ✎ → Version: New version → Deploy
   (the URL stays the same).
   ============================================================ */

const TO = 'homeservice@alexon.info';   // where the request emails go
const SHEET = 'Requests';               // tab name, created on the first request
const TZ = 'America/Edmonton';

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const name = clean_(d.name, 100);
    const phone = clean_(d.phone, 40);
    const service = clean_(d.service, 80);
    const area = clean_(d.area, 120);
    const details = clean_(d.details, 2000);
    const page = clean_(d.page, 80);

    const digits = phone.replace(/\D/g, '');
    if (!name || digits.length < 10) return out_({ ok: false, why: 'name and phone are required' });

    // the same phone more than 3 times in 10 minutes is almost surely a bot
    const cache = CacheService.getScriptCache();
    const key = 'p' + digits;
    const sent = Number(cache.get(key) || 0);
    if (sent >= 3) return out_({ ok: false, why: 'too many requests' });
    cache.put(key, String(sent + 1), 600);

    const when = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
    const sh = sheet_();
    sh.appendRow([when, safe_(name), "'" + phone, safe_(service), safe_(area), safe_(details), page, 'New']);

    const tel = '+' + (digits.length === 10 ? '1' + digits : digits);
    MailApp.sendEmail({
      to: TO,
      name: 'Alexon website',
      subject: 'New request: ' + name + (service ? ' — ' + service : ''),
      body: [
        'New request from the website.',
        '',
        'Name: ' + name,
        'Phone: ' + phone + '   (call: tel:' + tel + ')',
        'Type of work: ' + (service || '—'),
        'Area: ' + (area || '—'),
        '',
        'What needs doing:',
        details || '—',
        '',
        'Sent ' + when + ' (Edmonton time) from ' + page,
        'All requests: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      ].join('\n'),
    });

    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, why: String(err) });
  }
}

// opening the URL in a browser shows that it works
function doGet() {
  return out_({ ok: true, about: 'Alexon requests — the website sends requests here' });
}

function sheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sh = book.getSheetByName(SHEET);
  if (!sh) {
    sh = book.insertSheet(SHEET, 0);
    sh.appendRow(['Date', 'Name', 'Phone', 'Type of work', 'Area', 'What needs doing', 'Page', 'Status']);
    sh.getRange(1, 1, 1, 8).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(6, 420);
  }
  return sh;
}

// one line, no control characters, limited length
function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ').trim().slice(0, max || 500);
}

// a cell that starts with = + - @ would run as a formula — keep it as text
function safe_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
