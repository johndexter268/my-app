const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const isDev = require("electron-is-dev");
const sqlite3 = require("sqlite3").verbose();

let mainWindow;
let db;

// ---------------- DATABASE ----------------
function initializeDatabase() {
  db = new sqlite3.Database(path.join(app.getPath("userData"), "app.db"), (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("SQLite DB ready");
  });

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT
  )`);

  db.get(`SELECT * FROM users WHERE username=?`, ["admin"], (err, row) => {
    if (!row) {
      db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [
        "admin",
        "password",
      ]);
    }
  });
}

// ---------------- MAIN WINDOW ----------------
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'imgs', 'app-icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? "http://localhost:5173/#/" // dev
    : `file://${path.join(__dirname, "../dist/index.html")}#/`; // production

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.on("closed", () => (mainWindow = null));
}

// ---------------- IPC HANDLERS ----------------
ipcMain.handle("login", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM users WHERE username=? AND password=?`,
      [username, password],
      (err, row) => {
        if (err) reject(err.message);
        else if (row) resolve({ success: true, message: "Login success!" });
        else resolve({ success: false, message: "Invalid credentials" });
      }
    );
  });
});

// ---------------- APP INIT ----------------
app.whenReady().then(() => {
  initializeDatabase();
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (!mainWindow) createMainWindow();
});
