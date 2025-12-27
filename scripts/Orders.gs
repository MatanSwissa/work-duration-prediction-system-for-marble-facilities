/*=============================
     ORDER SHEET
==============================*/
function onEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== "Orders") return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  const value = e.range.getValue();

  // Ignore header row
  if (row < 2) return;

  // Column F – Status dropdown
  if (col === 6 && value) {
    handleStatusTimestamp(sheet, e.range);
  }
}

/*=============================
         TIMESTAMP
==============================*/
function handleStatusTimestamp(sheet, statusCell) {
  const row = statusCell.getRow();
  const statusValue = statusCell.getValue();
  const rule = statusCell.getDataValidation();

  if (!rule) return;

  let statusList = [];
  const criteria = rule.getCriteriaType();
  const values = rule.getCriteriaValues();

  if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    statusList = values[0];
  } else if (criteria === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    statusList = values[0].getValues().flat().filter(String);
  }

  if (!statusList.length) return;

  const index = statusList.indexOf(statusValue);
  if (index === -1) return;

  const timestampCell = sheet.getRange(statusCell.getRow(), 7 + index);

  if (!timestampCell.getValue()) {
    timestampCell
      .setValue(new Date())
      .setNumberFormat("hh:mm:ss yyyy-mm-dd");
  }
}