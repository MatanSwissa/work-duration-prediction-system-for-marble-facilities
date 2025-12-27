function calculateStageDeltasIncremental() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = ss.getSheetByName('Orders');
  let deltasSheet = ss.getSheetByName('Stage Deltas');

  if (!deltasSheet) {
    deltasSheet = ss.insertSheet('Stage Deltas');
    deltasSheet.appendRow([
      'Order',
      'Order Digested',
      'Slab Ordered',
      'Measurements',
      'CAD',
      'CNC',
      'Waterjet',
      'Supplementary',
      'Installation+Feedback',
      'Meters'
    ]);
  }

  const ordersData = ordersSheet.getDataRange().getValues();

  const existingOrders = new Set(
    deltasSheet.getLastRow() > 1
      ? deltasSheet.getRange(2, 1, deltasSheet.getLastRow() - 1, 1)
          .getValues()
          .flat()
      : []
  );

  const rowsToAppend = [];

  for (let i = 1; i < ordersData.length; i++) {
    const row = ordersData[i];
    const orderId = row[0];
    const orderMeter = row[3];

    if (!orderId || existingOrders.has(orderId)) continue;

    // Completion timestamps
    const stages = [
      normalizeDate(row[6]),  // Order Digested
      normalizeDate(row[7]),  // Slab Ordered
      normalizeDate(row[8]),  // Measurements
      normalizeDate(row[9]),  // CAD
      normalizeDate(row[10]), // CNC
      normalizeDate(row[11]), // Waterjet
      normalizeDate(row[12]), // Supplementary
      normalizeDate(row[13])  // Installation+Feedback
    ];

    const durations = new Array(stages.length).fill(0);

    let lastValidTime = null;
    let lastValidIndex = null;

    for (let j = 0; j < stages.length; j++) {
      const current = stages[j];
      if (!current) continue;

      // ❗ Skip backward or equal timestamps
      if (lastValidTime && current <= lastValidTime) {
        continue;
      }

      if (lastValidTime) {
        durations[j] = workingHoursBetween(lastValidTime, current);
      }

      lastValidTime = current;
      lastValidIndex = j;
    }

    const meas = stages[2];
    const before = stages[1];
    const after = stages[3];

    if (!meas && before && after && after > before) {
      durations[2] = Math.max(
        durations[2],
        workingHoursBetween(before, after)
      );
    }

    rowsToAppend.push([
      orderId,
      ...durations,
      orderMeter
    ]);
  }

  if (rowsToAppend.length > 0) {
    deltasSheet
      .getRange(
        deltasSheet.getLastRow() + 1,
        1,
        rowsToAppend.length,
        rowsToAppend[0].length
      )
      .setValues(rowsToAppend);
  }
}

  function isValidDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
  }

  function normalizeDate(value) {
    if (value === null || value === "" || value === "none") return null;
    return isValidDate(value) ? value : null;
  }

  function firstValidDate(...values) {
    for (const v of values) {
      const d = normalizeDate(v);
      if (d) return d;
    }
    return null;
  }

  function workingHoursBetween(start, end) {
    if (!start || !end || end <= start) return 0;

    let totalHours = 0;
    let current = new Date(start);

    while (current < end) {
      const day = current.getDay();   // 0=Sun, 5=Fri, 6=Sat
      const hour = current.getHours();

      const isWorkingDay = day !== 5 && day !== 6;
      const isWorkingHour = hour >= 8 && hour < 18;

      if (isWorkingDay && isWorkingHour) {
        totalHours += 1;
      }

      current.setHours(current.getHours() + 1);
    }

    return totalHours;
  }