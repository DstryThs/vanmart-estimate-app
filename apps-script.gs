/**
 * Van Mart Estimate App - Google Sheets webhook
 *
 * DEPLOY STEPS:
 * 1. Create a new Google Sheet. Name the tab "Estimates".
 * 2. Extensions > Apps Script. Replace Code.gs with this file's contents.
 * 3. Deploy > New deployment > Type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web app URL and paste it into SHEETS_WEBHOOK_URL in app.js.
 * 5. If you change this script, create a NEW version in the same deployment
 *    (Deploy > Manage deployments > Edit > New version) so the URL stays the same.
 *
 * The app sends upserts keyed by estimate id - editing an existing estimate
 * updates its row rather than appending a duplicate.
 */

const SHEET_NAME = 'Estimates';

const HEADERS = [
  'id', 'created_at', 'updated_at',
  'customer_name', 'customer_phone', 'customer_email',
  'vehicle', 'year', 'make', 'model', 'wheelbase',
  'part_count', 'total', 'parts_json'
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    upsertRow(data);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function upsertRow(d) {
  const sheet = getSheet_();
  const row = [
    d.id,
    d.createdAt,
    d.updatedAt,
    d.customerName,
    d.customerPhone,
    d.customerEmail,
    d.vehicle,
    d.year,
    d.make,
    d.model,
    d.wheelbase,
    d.partCount,
    d.total,
    JSON.stringify(d.parts || [])
  ];

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === d.id) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}
