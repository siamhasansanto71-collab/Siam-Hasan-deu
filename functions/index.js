/**
 * Daily Midnight Firestore Backup to Google Drive
 * Cloud Functions v2 for Siam Pharma Due Management
 *
 * Schedule: Every day at 00:00 (12:00 AM Midnight, Asia/Dhaka)
 * Fetches all Firestore data, generates JSON and CSV files,
 * and uploads them directly into Google Drive via Google Drive API v3.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { google } = require("googleapis");
const { Readable } = require("stream");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Configure Google Drive API Client
 * Uses Google Application Default Credentials (ADC) or Service Account Key.
 *
 * To allow uploads:
 * 1. Create a folder in your Google Drive (e.g. "Siam Pharma Backups")
 * 2. Share that folder with your Cloud Function's Service Account email
 *    (e.g., your-project-id@appspot.gserviceaccount.com) as 'Editor'.
 * 3. Set DRIVE_FOLDER_ID in functions config/env or leave empty to upload to Drive root.
 */
async function getDriveClient() {
  // Method 1: If using a custom Service Account Key JSON string in environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/drive"],
      });
      await auth.authorize();
      return google.drive({ version: "v3", auth });
    } catch (err) {
      logger.warn("Custom service account parse failed, falling back to default ADC:", err);
    }
  }

  // Method 2: If using OAuth2 Refresh Token (Personal Google Account Drive)
  if (process.env.DRIVE_CLIENT_ID && process.env.DRIVE_CLIENT_SECRET && process.env.DRIVE_REFRESH_TOKEN) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.DRIVE_CLIENT_ID,
      process.env.DRIVE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.DRIVE_REFRESH_TOKEN,
    });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // Method 3: Standard Google Cloud Application Default Credentials (ADC)
  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive",
    ],
  });
  const authClient = await auth.getClient();
  return google.drive({ version: "v3", auth: authClient });
}

/**
 * Helper to escape CSV values and preserve Bengali Unicode script
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Convert customer records array to formatted CSV with UTF-8 BOM
 */
function convertCustomersToCSV(customers) {
  const headers = [
    "Serial No",
    "Customer ID",
    "Customer Name",
    "Phone Number",
    "Total Due (BDT)",
    "Address",
    "Notes",
    "Owner ID",
    "Created At",
    "Updated At"
  ];

  const rows = customers.map((c) => [
    escapeCSV(c.serialNumber || ""),
    escapeCSV(c.id || ""),
    escapeCSV(c.name || ""),
    escapeCSV(c.phone || ""),
    escapeCSV(c.totalDue !== undefined ? c.totalDue : 0),
    escapeCSV(c.address || ""),
    escapeCSV(c.notes || ""),
    escapeCSV(c.ownerId || ""),
    escapeCSV(c.createdAt || ""),
    escapeCSV(c.updatedAt || "")
  ].join(","));

  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel & Google Sheets render Bengali characters properly
  return "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
}

/**
 * Convert transaction records array to formatted CSV with UTF-8 BOM
 */
function convertTransactionsToCSV(transactions) {
  const headers = [
    "Transaction ID",
    "Customer ID",
    "Transaction Type",
    "Amount (BDT)",
    "Previous Balance",
    "New Balance",
    "Description",
    "Date",
    "Owner ID",
    "Created At"
  ];

  const rows = transactions.map((t) => [
    escapeCSV(t.id || ""),
    escapeCSV(t.customerId || ""),
    escapeCSV(t.type || ""),
    escapeCSV(t.amount !== undefined ? t.amount : 0),
    escapeCSV(t.previousBalance !== undefined ? t.previousBalance : 0),
    escapeCSV(t.newBalance !== undefined ? t.newBalance : 0),
    escapeCSV(t.description || ""),
    escapeCSV(t.date || ""),
    escapeCSV(t.ownerId || ""),
    escapeCSV(t.createdAt || "")
  ].join(","));

  return "\uFEFF" + [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
}

/**
 * Upload a string buffer to Google Drive
 */
async function uploadToGoogleDrive(drive, fileName, mimeType, content, folderId) {
  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined,
  };

  const media = {
    mimeType: mimeType,
    body: Readable.from([Buffer.from(content, "utf-8")]),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, name, webViewLink",
  });

  logger.info(`Successfully uploaded ${fileName} to Drive. File ID: ${file.data.id}`);
  return file.data;
}

/**
 * Main Backup Logic: Fetches Firestore data, converts, and uploads to Drive
 */
async function executeDailyBackup() {
  const startTime = Date.now();
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
  const folderId = process.env.DRIVE_FOLDER_ID || null;

  logger.info(`Starting daily Firestore backup for ${dateStr}...`);

  // 1. Fetch Customers across all users using Collection Group
  const customersSnapshot = await db.collectionGroup("customers").get();
  const customers = [];
  customersSnapshot.forEach((doc) => {
    customers.push({ id: doc.id, ...doc.data() });
  });

  // 2. Fetch Transactions across all users using Collection Group
  const transactionsSnapshot = await db.collectionGroup("transactions").get();
  const transactions = [];
  transactionsSnapshot.forEach((doc) => {
    transactions.push({ id: doc.id, ...doc.data() });
  });

  // 3. Fetch Pharmacy Profiles
  const profilesSnapshot = await db.collectionGroup("profile").get();
  const profiles = [];
  profilesSnapshot.forEach((doc) => {
    profiles.push({ id: doc.id, ...doc.data() });
  });

  logger.info(`Extracted ${customers.length} customers, ${transactions.length} transactions, ${profiles.length} profiles.`);

  // 4. Construct Full Hierarchical JSON Backup
  const fullBackupJSON = JSON.stringify({
    metadata: {
      appName: "Siam Pharma Due Management",
      backupDate: new Date().toISOString(),
      totalCustomers: customers.length,
      totalTransactions: transactions.length,
      totalProfiles: profiles.length,
    },
    customers,
    transactions,
    profiles,
  }, null, 2);

  // 5. Construct CSV Formats
  const customersCSV = convertCustomersToCSV(customers);
  const transactionsCSV = convertTransactionsToCSV(transactions);

  // 6. Connect to Google Drive Client
  const drive = await getDriveClient();

  // 7. Upload All Files to Google Drive
  const uploadResults = [];

  // A. Upload Complete JSON Backup
  const jsonFile = await uploadToGoogleDrive(
    drive,
    `siam-pharma-backup-${dateStr}-${timestampStr}.json`,
    "application/json",
    fullBackupJSON,
    folderId
  );
  uploadResults.push(jsonFile);

  // B. Upload Customers CSV
  const customersFile = await uploadToGoogleDrive(
    drive,
    `siam-pharma-customers-${dateStr}.csv`,
    "text/csv; charset=utf-8",
    customersCSV,
    folderId
  );
  uploadResults.push(customersFile);

  // C. Upload Transactions CSV
  const transactionsFile = await uploadToGoogleDrive(
    drive,
    `siam-pharma-transactions-${dateStr}.csv`,
    "text/csv; charset=utf-8",
    transactionsCSV,
    folderId
  );
  uploadResults.push(transactionsFile);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`Backup finished in ${durationSec}s. Uploaded ${uploadResults.length} files to Google Drive.`);

  return {
    success: true,
    date: dateStr,
    durationSec,
    counts: {
      customers: customers.length,
      transactions: transactions.length,
    },
    files: uploadResults,
  };
}

/**
 * 1. SCHEDULED CLOUD FUNCTION
 * Runs every day at 12:00 AM Midnight (00:00) in Asia/Dhaka timezone.
 */
exports.dailyMidnightBackup = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Dhaka", // Change to "UTC" or your preferred timezone if needed
    memory: "512MiB",
    timeoutSeconds: 300,
  },
  async (event) => {
    try {
      const result = await executeDailyBackup();
      logger.info("Daily midnight backup completed successfully:", result);
    } catch (error) {
      logger.error("Daily midnight backup failed:", error);
      throw error;
    }
  }
);

/**
 * 2. ON-DEMAND HTTPS TRIGGER (For Instant Manual Testing)
 * Allows triggering the backup immediately via HTTP endpoint.
 */
exports.manualBackupNow = onRequest(
  {
    memory: "512MiB",
    timeoutSeconds: 300,
    cors: true,
  },
  async (req, res) => {
    try {
      const result = await executeDailyBackup();
      res.status(200).json({
        message: "Backup executed and uploaded to Google Drive successfully!",
        result,
      });
    } catch (error) {
      logger.error("Manual backup error:", error);
      res.status(500).json({
        error: "Backup failed",
        details: error.message,
      });
    }
  }
);
