/**
 * Van Mart Estimate App - Google Sheets webhook
 *
 * DEPLOY / UPDATE STEPS:
 * 1. Open your existing Apps Script project (or create a new one bound to the target Sheet).
 * 2. Replace Code.gs with this file's contents. Save.
 * 3. Deploy > Manage deployments > edit the existing deployment > New version > Deploy.
 *    This keeps the SAME Web app URL so app.js does not need to change.
 * 4. If this is a fresh deploy (no existing URL), Deploy > New deployment > Web app,
 *    Execute as: Me, Access: Anyone, then paste the URL into SHEETS_WEBHOOK_URL in app.js.
 *
 * SCHEMA NOTES:
 * - New columns (schema_version, shared_at, status, notes) are appended to the right of
 *   the original columns so existing rows stay aligned - no data migration needed.
 * - If a row already exists with this estimate id, we UPDATE it in place (upsert).
 * - Never reorder HEADERS without a migration - downstream agents key on column names.
 */

const SHEET_NAME = 'Estimates';

const HEADERS = [
  'id', 'created_at', 'updated_at',
  'customer_name', 'customer_phone', 'customer_email',
  'vehicle', 'year', 'make', 'model', 'wheelbase',
  'part_count', 'total', 'parts_json',
  'schema_version', 'shared_at', 'status', 'notes'
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
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Migrate header row if it's shorter than HEADERS (e.g., first schema_version bump).
  const currentWidth = sheet.getLastColumn();
  if (currentWidth < HEADERS.length) {
    sheet.getRange(1, currentWidth + 1, 1, HEADERS.length - currentWidth)
         .setValues([HEADERS.slice(currentWidth)]);
  }
  return sheet;
}

function colIndex_(name) {
  const i = HEADERS.indexOf(name);
  if (i < 0) throw new Error('Unknown column: ' + name);
  return i;
}

function rowFromPayload_(d) {
  const row = new Array(HEADERS.length).fill('');
  row[colIndex_('id')]             = d.id || '';
  row[colIndex_('created_at')]     = d.createdAt || '';
  row[colIndex_('updated_at')]     = d.updatedAt || '';
  row[colIndex_('customer_name')]  = d.customerName || '';
  row[colIndex_('customer_phone')] = d.customerPhone || '';
  row[colIndex_('customer_email')] = d.customerEmail || '';
  row[colIndex_('vehicle')]        = d.vehicle || '';
  row[colIndex_('year')]           = d.year || '';
  row[colIndex_('make')]           = d.make || '';
  row[colIndex_('model')]          = d.model || '';
  row[colIndex_('wheelbase')]      = d.wheelbase || '';
  row[colIndex_('part_count')]     = d.partCount || 0;
  row[colIndex_('total')]          = d.total || 0;
  row[colIndex_('parts_json')]     = JSON.stringify(d.parts || []);
  row[colIndex_('schema_version')] = d.schemaVersion || 1;
  row[colIndex_('shared_at')]      = d.sharedAt || '';
  row[colIndex_('status')]         = d.status || 'draft';
  row[colIndex_('notes')]          = d.notes || '';
  return row;
}

function upsertRow(d) {
  const sheet = getSheet_();
  const row = rowFromPayload_(d);
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
  sheet.getRange(lastRow + 1, 1, 1, row.length).setValues([row]);
}
