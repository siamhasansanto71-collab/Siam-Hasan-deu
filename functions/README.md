# Siam Pharma - Automated Daily Firestore Backup to Google Drive

This directory contains a Node.js Firebase Cloud Function v2 scheduled to run daily at midnight (00:00 / 12:00 AM) to automatically export Firestore data into JSON and CSV formats and upload the backups to Google Drive using the Google Drive API v3.

## Features

- **Automated Midnight Schedule:** Runs every night at 12:00 AM (`0 0 * * *`) in `Asia/Dhaka` timezone (or UTC).
- **Multiple Formats:**
  - `siam-pharma-backup-YYYY-MM-DD.json`: Full hierarchical data backup (customers, ledger transactions, pharmacy profile metadata).
  - `siam-pharma-customers-YYYY-MM-DD.csv`: Formatted customer ledger summary with proper UTF-8 BOM encoding so Bengali fonts (যেমন: মোঃ রহিম উল্লাহ, মিরপুর) and ৳ currency render cleanly in Microsoft Excel & Google Sheets.
  - `siam-pharma-transactions-YYYY-MM-DD.csv`: Itemized transactions history.
- **Google Drive Upload:** Uses Google Drive API v3 to upload files directly into a designated Google Drive folder.
- **On-Demand HTTP Trigger:** Includes `manualBackupNow` HTTP endpoint for instant on-demand testing anytime without waiting until midnight.

---

## Setup & Deployment Instructions

### Step 1: Enable Google Drive API in Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project (`siam-deu-pharma`).
3. Navigate to **APIs & Services > Library**.
4. Search for **Google Drive API** and click **Enable**.

### Step 2: Grant Google Drive Access to the Service Account
The simplest and most secure method:
1. In the Google Cloud Console, go to **IAM & Admin > Service Accounts**.
2. Copy the App Engine or Cloud Functions default service account email:
   `siam-deu-pharma@appspot.gserviceaccount.com` (or create a dedicated Service Account).
3. Open your [Google Drive](https://drive.google.com/).
4. Create a new folder named **"Siam Pharma Backups"**.
5. Click **Share** on that folder, paste the service account email, and grant **Editor** access.
6. Copy the Folder ID from the URL (the string after `folders/` in `https://drive.google.com/drive/folders/1a2b3c4d...`).

### Step 3: Set Environment Variables
In `functions/`:
```bash
cp .env.example .env
```
Set `DRIVE_FOLDER_ID`:
```bash
DRIVE_FOLDER_ID=your_google_drive_folder_id
```

### Step 4: Install Dependencies & Deploy
From the project root:
```bash
cd functions
npm install
firebase deploy --only functions
```

### Step 5: Test the Backup Instantly
Once deployed, you can trigger the function immediately without waiting until midnight:
- In the Firebase Console under **Functions > manualBackupNow**, click the function URL.
- Or run in terminal:
  ```bash
  curl -X POST https://<REGION>-<PROJECT_ID>.cloudfunctions.net/manualBackupNow
  ```
Check your Google Drive folder: the `.json` and `.csv` files will appear immediately!
