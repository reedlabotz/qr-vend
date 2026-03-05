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

// Logic implementations used by both API and Native modes
function fetchUrls() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const urlSheet = sheet.getSheetByName('URLs');
    const urlData = urlSheet.getDataRange().getValues();

    const claimsSheet = sheet.getSheetByName('Claims');
    const claimsData = claimsSheet.getDataRange().getValues();
    const claimedUrls = new Set(claimsData.slice(1).map(row => row[5])); // Column F: URL

    return urlData.slice(1).map(row => ({
        url: row[1], // Column B: URL
        claimedBy: claimedUrls.has(row[1]) ? "CLAIMED" : ""
    }));
}

function fetchNextUrl() {
    const urls = fetchUrls();
    const unclaimed = urls.find(r => !r.claimedBy);
    return unclaimed ? unclaimed.url : null;
}

function claimUrl(claim) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const claimsSheet = sheet.getSheetByName('Claims');
    claimsSheet.appendRow([
        claim.recipientName,
        claim.recipientPhone,
        claim.location,
        claim.claimedBy,
        claim.timestamp,
        claim.url
    ]);
}

function updateClaim(claim) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const claimsSheet = sheet.getSheetByName('Claims');
    const claimsData = claimsSheet.getDataRange().getValues();

    // Find the row with this URL to update it
    for (let i = claimsData.length - 1; i >= 1; i--) {
        if (claimsData[i][5] === claim.url) {
            const range = claimsSheet.getRange(i + 1, 1, 1, 6);
            range.setValues([[
                claim.recipientName,
                claim.recipientPhone,
                claim.location,
                claim.claimedBy,
                claim.timestamp,
                claim.url
            ]]);
            return;
        }
    }

    // If not found (fallback), append it
    claimUrl(claim);
}

function unclaimUrl(url) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const claimsSheet = sheet.getSheetByName('Claims');
    const claimsData = claimsSheet.getDataRange().getValues();
    for (let i = claimsData.length - 1; i >= 1; i--) {
        if (claimsData[i][5] === url) {
            claimsSheet.deleteRow(i + 1);
            break;
        }
    }
}

function getRecentClaims(name) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const claimsSheet = sheet.getSheetByName('Claims');
    const data = claimsSheet.getDataRange().getValues();

    return data.slice(1)
        .filter(row => row[3] === name) // Column D: Claimed By
        .map(row => ({
            recipientName: row[0],
            recipientPhone: row[1],
            location: row[2],
            claimedBy: row[3],
            timestamp: row[4].toISOString ? row[4].toISOString() : row[4],
            url: row[5]
        }))
        .reverse();
}

function getTeam() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    const teamSheet = sheet.getSheetByName('Team');
    const data = teamSheet.getDataRange().getValues();
    return data.slice(1).map(row => ({ name: row[0], language: row[1] }));
}

function response(obj, code = 200) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
