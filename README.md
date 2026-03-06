# QR Vend - Google Sheets Web App

A high-polish, mobile-first web application for internal team members to claim survey URLs from a Google Sheet and launch them directly into WhatsApp.

## 🚀 Deployment Instructions

This app is designed to be hosted as a **Google Apps Script Web App**. Follow these steps to deploy:

### 1. Build the Single-File Bundle
Open your terminal in the project root and run:
```bash
npm run build
```
This will generate a single file at `dist/index.html`.

### 2. Set Up the Google Sheet
Ensure your Google Sheet has the following tabs:
- **`URLs`**:
  - Column A: `ID`
  - Column B: `URL`
  - Column C: `Location`
  - Column D: `Claimed By`
  - Column E: `Timestamp`
  - Column F: `Recipient Name`
  - Column G: `Recipient Phone`
- **`Team`**:
  - Column A: `Name`
  - Column B: `Language` (english, spanish, french, or bangla)

### 3. Deploy to Apps Script
1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Create/update a file (e.g., `Code.gs`) and paste the contents of `scripts/google_apps_script.js`.
   - **IMPORTANT**: Replace `YOUR_SECRET_TOKEN_HERE` with the token from your `.env` file to enable security.
3. Create a new HTML file in the editor called **`index.html`**.
4. Copy the entire contents of your local `dist/index.html` and paste them into the new `index.html` in the Google editor.
5. Click **Deploy > New Deployment**.
6. Select **Web App**.
7. Set "Execute as" to **Me** and "Who has access" to **Anyone**.
8. Click **Deploy**.

## 🛠 Features
- **Team Login**: Individual profiles with language preferences.
- **Multilingual**: Supports English, Spanish, French, and Bangla.
- **Unclaim Feature**: Easily cancel an assignment if made by mistake.
- **Single-File Deployment**: No external hosting or complex environment variables needed.

## ⚠️ Troubleshooting "App Not Verified"
Google shows this warning for any new script that hasn't been through their official (and lengthy) verification process. Since this is your own internal tool, you can safely bypass it:
1. When the "Google hasn't verified this app" screen appears, click **Advanced**.
2. Click **Go to QR Vend (unsafe)** at the bottom.
3. Click **Allow** to give the script permission to edit your spreadsheet.

## 🔒 Security Tiers
- **Tier 1 (Personal)**: If using a @gmail.com account, anyone with the link can use the app.
- **Tier 2 (Company)**: If you have a Google Workspace account, set "Who has access" to **"Anyone within [Your Company]"** for maximum security.

## 🔒 Git Safety (DO NOT LEAK)
To protect your data, follow these rules before checking in code:
- **Never commit `.env`**: This file contains your real URLs and tokens. It is already in `.gitignore`.
- **Use `.env.example`**: Share this file instead (it only has placeholders).
- **Sanitize `Code.gs`**: The version in `scripts/google_apps_script.js` has a placeholder for the token. Keep it that way in Git! Only put the real token in the Google Script editor itself.
## 🧼 Removing the Google Banner
By default, Google shows a header that says "This application was created by a Google Apps Script user."

### Option 1: Embedding (Recommended)
The banner automatically disappears if you embed the app:
- **Google Sites**: Create a Google Site and use the "Embed" tool with your Web App URL.
- **Custom Site**: Use an `<iframe>` (The code is pre-configured to allow this).

### Option 2: Official Verification
To remove the banner and the "Unverified" screen for everyone:
1. **Google Cloud Project**:
   - Go to Cloud Console and create a Standard Project.
   - In Apps Script, go to **Settings > Google Cloud Platform (GCP) Project** and link it.
2. **OAuth Consent Screen**:
   - Set up the consent screen in Cloud Console (Add app logo, support email, etc.).
3. **Verification Request**:
   - Submit for Google verification. This requires an official domain and privacy policy.

## 🏢 Workspace "Internal" Advantage
If you are using a Google Workspace (Company) account:
- Go to the **OAuth Consent Screen** in Cloud Console.
- Set the User Type to **Internal**.
- This will remove the "Unverified App" screen for everyone in your company **without needing a review from Google**.
