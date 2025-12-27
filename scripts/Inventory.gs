/*=============================
     HANDLE INVENTORY
==============================*/
function handleInventoryEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== "Inventory") return;

  const row = e.range.getRow();
  const col = e.range.getColumn();
  const value = e.range.getValue();
  const ss = e.source;

/*=============================
     COLUMN A – TYPE
==============================*/
  if (col === 1) {
    handleTypeEdit(sheet, row, value, ss);
    return;
  }

/*=============================
     COLUMN B – BRAND
==============================*/
  if (col === 2) {
    handleBrandEdit(sheet, row, value, ss);
    return;
  }

/*=============================
     TIMESTAMP COLUMNS
==============================*/
  if ([5, 11, 17].includes(col)) {
    handleTimestamp(e.range, value);
  }
}

/*=============================
     HANDLE TYPE EDIT
==============================*/
function handleTypeEdit(sheet, row, value, ss) {
  const bCell = sheet.getRange(row, 2);
  const cCell = sheet.getRange(row, 3);

  if (!value) {
    bCell.clearDataValidation().clearContent();
    cCell.clearDataValidation().clearContent();
    return;
  }

  const validTypes = ["Quartz", "Granite Porcelain"];
  if (!validTypes.includes(value)) return;

  const infoSheet = ss.getSheetByName("Slabs Prices Info");
  const brands = infoSheet.getRange("A1:V1").getValues()[0];

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(brands)
    .build();

  bCell.setDataValidation(rule);
  cCell.clearDataValidation().clearContent();
}

/*=============================
     HANDLE BRAND EDIT
==============================*/
function handleBrandEdit(sheet, row, value, ss) {
  const cCell = sheet.getRange(row, 3);

  if (!value) {
    cCell.clearDataValidation().clearContent();
    return;
  }

  const infoSheet = ss.getSheetByName("Slabs Prices Info");
  const headers = infoSheet.getRange("A1:V1").getValues()[0];
  const colIndex = headers.indexOf(value);

  if (colIndex === -1) return;

  const models = infoSheet
    .getRange(2, colIndex + 1, infoSheet.getLastRow() - 1)
    .getValues()
    .flat()
    .filter(String);

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(models)
    .build();

  cCell.setDataValidation(rule);
}

/*=============================
     HANDLE TIME STAMP
==============================*/
function handleTimestamp(range, value) {
  if (value === "Now") {
    range.setValue(new Date());
  }
}