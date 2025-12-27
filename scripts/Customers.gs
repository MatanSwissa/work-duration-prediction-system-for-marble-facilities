/*=============================
     AUTHENTICATION MAIN
==============================*/
function authenticateAndFetchCustomers() {
  var properties = PropertiesService.getScriptProperties();
  var token = properties.getProperty('token');
  var tokenExpiry = properties.getProperty('tokenExpiry');
  var currentTime = new Date().getTime();

  if (token && tokenExpiry && currentTime < tokenExpiry) {
    Logger.log("Using stored token");
    fetchCustomers(token);
  } else {
    Logger.log("Authenticating...");
    authenticate();
  }
}

/*=============================
     AUTHENTICATION 
==============================*/
function authenticate() {
  var url = "AUTHENTICATION_URL-ACCOUNTING/BUSINESS_MANAGMENT_PLATFORM";
  var clientId = "CLIENT_ID";
  var password = "CLIENT_PASSWORD";

  var payload = {
    clientId: clientId,
    password: password
  };

  var options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseText = response.getContentText();

    Logger.log("Status: " + response.getResponseCode());
    Logger.log("Response: " + responseText);

    if (response.getResponseCode() === 200) {
      var json = JSON.parse(responseText);
      var token = json.token;
      var tokenExpiry = new Date().getTime() + 3600 * 1000;

      var properties = PropertiesService.getScriptProperties();
      properties.setProperty('token', token);
      properties.setProperty('tokenExpiry', tokenExpiry);

      Logger.log("Token: " + token);
      Logger.log("Token expiry: " + new Date(tokenExpiry));

      fetchCustomers(token);
    } else {
      Logger.log("Failed to authenticate");
    }
  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}

/*=============================
     FETCH CUSTOMERS
==============================*/
function fetchCustomers(token) {
  var url = "DOCUMENTS_SEARCH_URL-ACCOUNTING/BUSINESS_MANAGMENT_PLATFORM";
  var body = JSON.stringify({
    "providerUserToken": "CLIENT_USER_TOKEN"
  });

  var options = {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    payload: body,
    muteHttpExceptions: true
  };

  try {
    Logger.log("Fetching customers with token: " + token);
    Logger.log("Request URL: " + url);

    var response = UrlFetchApp.fetch(url, options);
    var responseText = response.getContentText();

    Logger.log("Status: " + response.getResponseCode());
    Logger.log("Response: " + responseText);

    if (response.getResponseCode() === 200) {
      var json = JSON.parse(responseText);
      if (json.result && json.result.items) {
        var customers = json.result.items.map(function(item) {
          return {
            name: item.customer.name,
            mainPhone: item.customer.mainPhone,
            seconderyPhone: item.customer.seconderyPhone,
            address: item.customer.address,
            cityName: item.customer.cityName,
          };
        });
        storeCustomers(customers);
      } else {
        Logger.log("Invalid API response structure: " + responseText);
      }
    } else {
      Logger.log("Failed to fetch customers. Status Code: " + response.getResponseCode());
      Logger.log("Response: " + responseText);
    }
  } catch (e) {
    Logger.log("Error: " + e.toString());
  }
}

/*=============================
     STORE CUSTOMERS IN SHEET
==============================*/
function storeCustomers(customers) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Customers");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Customers");
    sheet.getRange("A1").setValue("Name");
    sheet.getRange("B1").setValue("Main Phone");
    sheet.getRange("C1").setValue("Secondary Phone");
    sheet.getRange("D1").setValue("Address");
    sheet.getRange("E1").setValue("City Name");
  }

  var existingData = sheet.getDataRange().getValues();
  var existingCustomerNames = existingData.slice(1).map(function(row) {
    return String(row[0]).trim();
  });

  var newCustomers = [];
  customers.forEach(function(customer) {
    var customerName = String(customer.name).trim();
    var isDuplicate = existingCustomerNames.includes(customerName);

    if (!isDuplicate) {
      newCustomers.push([customer.name, customer.mainPhone, customer.secondaryPhone, customer.address, customer.cityName]);
      existingCustomerNames.push(customerName);
    }
  });

  if (newCustomers.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    var range = sheet.getRange(startRow, 1, newCustomers.length, 5);
    range.setValues(newCustomers);
  } else {
    Logger.log("No new customers to add.");
  }
}