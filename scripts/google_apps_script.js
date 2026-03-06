/**
 * QR VEND - Google Apps Script Backend (FINAL)
 * 
 * 1. Paste this into 'Extensions > Apps Script' in your Google Sheet.
 * 2. Upload your built 'dist/index.html' as 'index.html' in the script editor.
 * 3. Click 'Deploy > New Deployment', select 'Web App'.
 * 4. Set 'Execute as' to 'Me' and 'Who has access' to 'Anyone'.
 */

// Must match VITE_SECRET_TOKEN in your .env
const SECRET_TOKEN = "YOUR_SECRET_TOKEN_HERE";

/**
 * SERVING MODE (for Hosting the App)
 */
function doGet(e) {
    // If no action parameter, serve the React App
    if (!e || !e.parameter || !e.parameter.action) {
        return HtmlService.createHtmlOutputFromFile('index')
            .setTitle('QR Vend')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    }

    // Otherwise, handle API request (e.g. from Localhost)
    try {
        validate(e);
        return handleApi(e.parameter.action, e.parameter);
    } catch (err) {
        return response({ error: err.toString() }, 401);
    }
}

function doPost(e) {
    try {
        const postData = JSON.parse(e.postData.contents);
        validate(e, postData);
        return handleApi(postData.action, postData);
    } catch (err) {
        return response({ error: err.toString() }, 500);
    }
}

/**
 * NATIVE MODE (for Hosted Web App via google.script.run)
 */
function gsFetchNextUrl() { return fetchNextUrl(); }
function gsClaimNextUrl(claim) { return claimNextUrl(claim); }
function gsClaimUrl(claim) { return claimUrl(claim); }
function gsUpdateClaim(claim) { return updateClaim(claim); }
function gsUnclaimUrl(url) { return unclaimUrl(url); }
function gsGetRecentClaims(name) { return getRecentClaims(name); }
function gsGetTeam() { return getTeam(); }

/**
 * SHARED LOGIC
 */
function validate(e, postData = null) {
    const token = e.parameter.token || (postData ? postData.token : null);
    if (token !== SECRET_TOKEN) {
        throw new Error("Unauthorized: Invalid security token.");
    }
}

function handleApi(action, params) {
    if (action === 'geturls') return response({ urls: fetchUrls() });
    if (action === 'getteam') return response({ team: getTeam() });
    if (action === 'getclaims') return response({ claims: getRecentClaims(params.user) });
    if (action === 'claim') {
        claimUrl(params.claim);
        return response({ success: true });
    }
    if (action === 'update') {
        updateClaim(params.claim);
        return response({ success: true });
    }
    if (action === 'unclaim') {
        unclaimUrl(params.url);
        return response({ success: true });
    }
    throw new Error("Unknown action: " + action);
}

// Logic implementations using the consolidated 'URLs' sheet
function fetchUrls() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const urlSheet = sheet.getSheetByName('URLs');
    const data = urlSheet.getDataRange().getValues();

    return data.slice(1).map(row => ({
        id: row[0],
        url: row[1],
        claimedBy: row[3] || "" // Column D: Claimed By
    }));
}

function fetchNextUrl() {
    const urls = fetchUrls();
    const unclaimed = urls.find(r => !r.claimedBy);
    return unclaimed ? unclaimed.url : null;
}

function claimUrl(claim) {
    updateClaim(claim); // Standardize on updateClaim
}

function claimNextUrl(claim) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const urlSheet = sheet.getSheetByName('URLs');
    const data = urlSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (!data[i][3]) { // Column D: Claimed By is empty
            const url = data[i][1]; // Column B
            urlSheet.getRange(i + 1, 3, 1, 5).setValues([[
                claim.location,      // Col C
                claim.claimedBy,     // Col D
                claim.timestamp,     // Col E
                claim.recipientName,  // Col F
                claim.recipientPhone  // Col G
            ]]);
            return url; // Return the assigned URL
        }
    }
    throw new Error("No more URLs available!");
}

function unclaimUrl(url) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const urlSheet = sheet.getSheetByName('URLs');
    const data = urlSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
        if (data[i][1] === url) {
            // Clear Columns C through G (Location, Claimed By, Timestamp, Name, Phone)
            urlSheet.getRange(i + 1, 3, 1, 5).clearContent();
            return;
        }
    }
}

function getRecentClaims(name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const urlSheet = sheet.getSheetByName('URLs');
    const data = urlSheet.getDataRange().getValues();

    return data.slice(1)
        .filter(row => row[3] === name) // Column D: Claimed By
        .map(row => ({
            id: row[0],
            // PRIVACY MASKING: 
            // Only expose ID, Timestamp, and first 2 letters of name.
            // Omit Phone and URL for history view.
            recipientName: row[5] ? row[5].substring(0, 2) : "??",
            location: row[2],
            claimedBy: row[3], // Include the person who claimed it
            timestamp: row[4] && row[4].toISOString ? row[4].toISOString() : row[4],
            url: row[1] // RESTORED: Expose URL for history re-viewing
        }))
        .reverse();
}

function getTeam() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const teamSheet = sheet.getSheetByName('Team');
    if (!teamSheet) return [];
    const data = teamSheet.getDataRange().getValues();
    return data.slice(1).map(row => ({ name: row[0], language: row[1] }));
}

function response(obj, code = 200) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
