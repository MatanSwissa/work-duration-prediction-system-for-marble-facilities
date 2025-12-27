function handleOrdersUpdateDebounced(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName("Orders");
  const deltasSheet = ss.getSheetByName("Stage Deltas") || ss.insertSheet("Stage Deltas");

  // Initialize header if empty
  if (deltasSheet.getLastRow() === 0) {
    deltasSheet.getRange(1,1,1,14).setValues([[
      "Order ID","Order Digested","Slab Ordered","Measurements","CAD","CNC","Waterjet",
      "Supplementary","Installation+Feedback","Meters","Material","CNC_Used","Waterjet_Used",""
    ]]);
  }

  const ordersData = ordersSheet.getDataRange().getValues();
  const deltasData = deltasSheet.getDataRange().getValues();

  // Map existing orders in Stage Deltas by Order ID
  const deltasMap = {};
  for (let i = 1; i < deltasData.length; i++) {
    const orderId = deltasData[i][0];
    if (orderId) deltasMap[orderId] = i + 1;
  }

  for (let i = 1; i < ordersData.length; i++) {
    const row = ordersData[i];
    const orderId = row[0];
    if (!orderId) continue;

    const colD = row[3]; // meters
    const colC = row[2]; // material
    if (!colD && !colC) continue;

    // ---- Meters sanitization ----
    let meters = parseFloat(String(colD).replace(/[^\d\.]/g, ""));
    if (isNaN(meters)) meters = 3.5;

    // ---- Material sanitization ----
    let material =
      (typeof colC === "string" &&
       colC.trim() &&
       !["-", "—", "none", "n/a"].includes(colC.trim().toLowerCase()))
        ? colC.trim()
        : "Natural Stone";

    // ---- CNC / Waterjet detection based on Stage Deltas columns F & G ----
    // If updating existing row, read F/G from Stage Deltas; else from Orders row
    let cncVal = deltasMap[orderId] ? deltasData[deltasMap[orderId]-1][5] : row[5];
    let waterjetVal = deltasMap[orderId] ? deltasData[deltasMap[orderId]-1][6] : row[6];

    const lVal = hasNonZeroNumber(cncVal) ? "Yes" : "No";       // CNC_Used
    const mVal = hasNonZeroNumber(waterjetVal) ? "Yes" : "No";  // Waterjet_Used

    if (deltasMap[orderId]) {
      // Update existing row
      const rowIndex = deltasMap[orderId];
      deltasSheet.getRange(rowIndex, 10).setValue(meters);       // J
      deltasSheet.getRange(rowIndex, 11).setValue(material);     // K
      deltasSheet.getRange(rowIndex, 12).setValue(lVal);         // L
      deltasSheet.getRange(rowIndex, 13).setValue(mVal);         // M
    } else {
      // Append new row
      deltasSheet.appendRow([
        orderId,
        0,0,0,0,0,0,0,0,  // stage durations placeholders
        meters,             // J
        material,           // K
        lVal,               // L
        mVal                // M
      ]);
      deltasMap[orderId] = deltasSheet.getLastRow();
    }
  }
}

// Helper function to check if a value is a number != 0
function hasNonZeroNumber(value) {
  if (value === null || value === "" || value === undefined) return false;
  const num = Number(value);
  return !isNaN(num) && num !== 0;
}
