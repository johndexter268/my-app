/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const fs = require("fs");
// const isDev = require("electron-is-dev");

const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");

let mainWindow;
let db;
let currentFile = null;
const openFiles = new Map();

function parseClockToMinutes(clock) {
  if (!clock) return null;
  const m = clock.trim().match(/^(\d{1,2}):?(\d{2})?\s*([AaPp][Mm])$/);
  if (!m) return null;
  let hh = Number.parseInt(m[1], 10);
  const mm = Number.parseInt(m[2] || "00", 10);
  const ampm = m[3].toUpperCase();
  if (hh === 12) hh = 0;
  if (ampm === "PM") hh += 12;
  return hh * 60 + mm;
}

function minutesToClock(mins) {
  mins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  let hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const ampm = hh >= 12 ? "PM" : "AM";
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return `${hh}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

// ---------------- DATABASE ----------------
function initializeDatabase() {
  db = new sqlite3.Database(path.join(app.getPath("userData"), "app.db"), (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("SQLite DB ready");
  });

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT,
      role TEXT DEFAULT 'user'
    )`);

    db.get(`SELECT * FROM users WHERE username=?`, ["admin"], (err, row) => {
      if (!row) {
        ``
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ["admin", "admin123", "admin"]);
        console.log("Default admin user created");
      }
    });

    db.get(`SELECT * FROM users WHERE username=?`, ["user"], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ["user", "user123", "user"]);
        console.log("Default user account created");
      }
    });

    db.get(`SELECT * FROM users WHERE username=?`, ["user"], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ["userview", "view123", "view"]);
        console.log("Viewer account created");
      }
    });

    db.run(`CREATE TABLE IF NOT EXISTS schedule_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL UNIQUE,
      honorifics TEXT,
      color TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      years INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      units INTEGER NOT NULL,
      semester TEXT,
      programId INTEGER,
      yearLevel TEXT,
      FOREIGN KEY (programId) REFERENCES programs(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      students INTEGER NOT NULL,
      programId INTEGER NOT NULL,
      yearLevel TEXT NOT NULL,
      is_merged BOOLEAN DEFAULT 0,
      merged_from TEXT,
      mergedInto INTEGER REFERENCES classes(id),
      original_classes TEXT,
      FOREIGN KEY (programId) REFERENCES programs(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subject_assignments (
      id TEXT PRIMARY KEY,
      scheduleFileId INTEGER,
      subjectId INTEGER,
      teacherId INTEGER,
      FOREIGN KEY(scheduleFileId) REFERENCES schedule_files(id),
      FOREIGN KEY(subjectId) REFERENCES subjects(id),
      FOREIGN KEY(teacherId) REFERENCES teachers(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS time_assignments (
      id TEXT PRIMARY KEY,
      scheduleFileId INTEGER,
      subjectId INTEGER,
      teacherId INTEGER,
      classId INTEGER,
      day TEXT,
      timeSlot TEXT,
      duration INTEGER,
      FOREIGN KEY(scheduleFileId) REFERENCES schedule_files(id),
      FOREIGN KEY(subjectId) REFERENCES subjects(id),
      FOREIGN KEY(teacherId) REFERENCES teachers(id),
      FOREIGN KEY(classId) REFERENCES classes(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS room_assignments (
      id TEXT PRIMARY KEY,
      scheduleFileId INTEGER,
      subjectId INTEGER,
      teacherId INTEGER,
      classId INTEGER,
      roomId INTEGER,
      FOREIGN KEY(scheduleFileId) REFERENCES schedule_files(id),
      FOREIGN KEY(subjectId) REFERENCES subjects(id),
      FOREIGN KEY(teacherId) REFERENCES teachers(id),
      FOREIGN KEY(classId) REFERENCES classes(id),
      FOREIGN KEY(roomId) REFERENCES rooms(id)
    )`);

    db.run(`ALTER TABLE time_assignments ADD COLUMN teacherId INTEGER REFERENCES teachers(id)`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error("Error adding teacherId to time_assignments:", err.message);
      }
    });
    db.run(`ALTER TABLE room_assignments ADD COLUMN teacherId INTEGER REFERENCES teachers(id)`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error("Error adding teacherId to room_assignments:", err.message);
      }
    });
  });
}

// ---------------- MAIN WINDOW ----------------
function createMainWindow() {
  const isDev = !app.isPackaged;
  console.log("isDev:", isDev);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Class Scheduling System",
    icon: path.join(__dirname, "../build/app-icon.ico"), // ✅ Use the .ico inside /build for Windows
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // ✅ Correct path logic for dev and production
  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  // ✅ Optional hash routing fix (React Router)
  // If you use React Router’s HashRouter, no change needed
  // If you use BrowserRouter, remove "#/" completely in both cases

  // ✅ Show window only when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // ✅ Optional: open DevTools only in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// ---------------- IPC HANDLERS ----------------
ipcMain.handle("login", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM users WHERE username=? AND password=?`, [username, password], (err, row) => {
      if (err) {
        console.error("Login error:", err.message);
        reject(err.message);
      } else if (row) {
        resolve({ success: true, message: "Login success!", role: row.role, username: row.username });
      } else {
        resolve({ success: false, message: "Invalid credentials" });
      }
    });
  });
});

ipcMain.handle("unarchive-schedule-file", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE schedule_files SET status='active', updatedAt=? WHERE id=?`,
      [new Date().toISOString(), id],
      (err) => {
        if (err) {
          console.error("Unarchive file error:", err.message);
          reject(err.message);
          return;
        }
        resolve({ success: true, message: "File unarchived!" });
      },
    );
  });
});

ipcMain.handle("new-schedule-file", (event, { name, academic_year, semester }) => {
  return new Promise((resolve, reject) => {
    if (!name?.trim() || !academic_year?.trim() || !semester?.trim()) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    db.get(
      `SELECT * FROM schedule_files WHERE name=? AND academic_year=? AND semester=? AND status='active'`,
      [name.trim(), academic_year.trim(), semester.trim()],
      (err, row) => {
        if (err) {
          console.error("Database error checking for duplicates:", err.message);
          reject(err.message);
          return;
        }
        if (row) {
          resolve({ success: false, message: "Duplicate file details. Choose unique details." });
          return;
        }
        db.run(
          `INSERT INTO schedule_files (name, academic_year, semester, updatedAt) VALUES (?, ?, ?, ?)`,
          [name.trim(), academic_year.trim(), semester.trim(), new Date().toISOString()],
          function (err) {
            if (err) {
              console.error("Database error creating new file:", err.message);
              reject(err.message);
              return;
            }
            const newFile = { id: this.lastID, name: name.trim(), academic_year: academic_year.trim(), semester: semester.trim(), updatedAt: new Date().toISOString() };
            openFiles.set(this.lastID, newFile);
            resolve({ success: true, message: "New file created!", id: this.lastID, file: newFile });
          }
        );
      }
    );
  });
});

ipcMain.handle("set-current-file", (event, file) => {
  currentFile = file || null;
  console.log("Main: Current file is now:", currentFile?.name || "none");
  return { success: true };
});

ipcMain.handle("get-current-file", () => {
  const result = currentFile ? { files: [currentFile] } : { files: [] };
  // console.log("Main: get-current-file returning:", result);
  return result;
});

ipcMain.handle("close-current-file", (event, fileId) => {
  if (openFiles.has(fileId)) {
    openFiles.delete(fileId);
    return { success: true, message: "File closed" };
  }
  return { success: false, message: "File not found" };
});

ipcMain.handle("save-file", (event, { id, name, academic_year, semester }) => {
  return new Promise((resolve, reject) => {
    if (!id || !name?.trim() || !academic_year?.trim() || !semester?.trim()) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    db.run(
      `UPDATE schedule_files SET name=?, academic_year=?, semester=?, updatedAt=? WHERE id=?`,
      [name.trim(), academic_year.trim(), semester.trim(), new Date().toISOString(), id],
      (err) => {
        if (err) {
          console.error("Save file error:", err.message);
          reject(err.message);
          return;
        }
        const updatedFile = { id, name: name.trim(), academic_year: academic_year.trim(), semester: semester.trim(), updatedAt: new Date().toISOString() };
        openFiles.set(id, updatedFile);
        resolve({ success: true, message: "File saved!", file: updatedFile });
      }
    );
  });
});

ipcMain.handle("save-as-file", (event, { fileId, name, academic_year, semester }) => {
  return new Promise((resolve, reject) => {
    if (!name?.trim() || !academic_year?.trim() || !semester?.trim()) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    db.get(
      `SELECT * FROM schedule_files WHERE name=? AND academic_year=? AND semester=? AND status='active'`,
      [name.trim(), academic_year.trim(), semester.trim()],
      (err, row) => {
        if (err) {
          console.error("Save as file error:", err.message);
          reject(err.message);
          return;
        }
        if (row) {
          resolve({ success: false, message: "Duplicate file details. Choose unique details." });
          return;
        }
        db.run(
          `INSERT INTO schedule_files (name, academic_year, semester, updatedAt) VALUES (?, ?, ?, ?)`,
          [name.trim(), academic_year.trim(), semester.trim(), new Date().toISOString()],
          function (err) {
            if (err) {
              console.error("Database error in save-as:", err.message);
              reject(err.message);
              return;
            }
            const newId = this.lastID;
            const copyPromises = [
              new Promise((res, rej) => {
                db.all(`SELECT * FROM subject_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
                  if (err) rej(err);
                  if (rows.length > 0) {
                    const stmt = db.prepare(
                      `INSERT INTO subject_assignments (id, scheduleFileId, subjectId, teacherId) 
                       VALUES (?, ?, ?, ?)`
                    );
                    rows.forEach((row) => {
                      const newAssignmentId = uuidv4();
                      stmt.run([newAssignmentId, newId, row.subjectId, row.teacherId]);
                    });
                    stmt.finalize(res);
                  } else res();
                });
              }),
              new Promise((res, rej) => {
                db.all(`SELECT * FROM time_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
                  if (err) rej(err);
                  if (rows.length > 0) {
                    const stmt = db.prepare(
                      `INSERT INTO time_assignments (id, scheduleFileId, subjectId, teacherId, classId, day, timeSlot, duration) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                    );
                    rows.forEach((row) => {
                      const newAssignmentId = uuidv4();
                      stmt.run([newAssignmentId, newId, row.subjectId, row.teacherId, row.classId, row.day, row.timeSlot, row.duration]);
                    });
                    stmt.finalize(res);
                  } else res();
                });
              }),
              new Promise((res, rej) => {
                db.all(`SELECT * FROM room_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
                  if (err) rej(err);
                  if (rows.length > 0) {
                    const stmt = db.prepare(
                      `INSERT INTO room_assignments (id, scheduleFileId, subjectId, teacherId, classId, roomId) 
                       VALUES (?, ?, ?, ?, ?, ?)`
                    );
                    rows.forEach((row) => {
                      const newAssignmentId = uuidv4();
                      stmt.run([newAssignmentId, newId, row.subjectId, row.teacherId, row.classId, row.roomId]);
                    });
                    stmt.finalize(res);
                  } else res();
                });
              })
            ];
            Promise.all(copyPromises).then(() => {
              const newFile = { id: newId, name: name.trim(), academic_year: academic_year.trim(), semester: semester.trim(), updatedAt: new Date().toISOString() };
              openFiles.set(newId, newFile);
              resolve({ success: true, message: "File saved as new!", id: newId, file: newFile });
            }).catch((err) => {
              console.error("Error copying assignments:", err.message);
              reject(err.message);
            });
          }
        );
      }
    );
  });
});

ipcMain.handle("get-teachers", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM teachers`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("get-programs", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM programs`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("export-file", async (event, args = {}) => {
  const { fileId: rawFileId, type, id, format = 'pdf' } = args;
  console.log("Export requested - args:", args);
  const fileId = typeof rawFileId === 'string' ? parseInt(rawFileId) : rawFileId;
  if (!fileId) {
    console.error("Export failed: No fileId provided");
    return { success: false, message: "No file selected to export." };
  }

  const file = await new Promise((res, rej) => {
    db.get(`SELECT * FROM schedule_files WHERE id=? AND status='active'`, [fileId], (err, row) => {
      if (err) {
        console.error("Error fetching file:", err.message);
        return rej(err.message);
      }
      res(row || null);
    });
  });

  if (!file) {
    console.error("Export failed: File not found for fileId:", fileId);
    return { success: false, message: "Selected file not found." };
  }

  try {
    const [
      timeAssignments,
      subjectAssignments,
      roomAssignments,
      subjects,
      teachers,
      classes,
      rooms,
      programs
    ] = await Promise.all([
      new Promise((res, rej) => db.all(`SELECT * FROM time_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subject_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM room_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subjects`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM teachers`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM classes`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM rooms`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM programs`, (e, r) => e ? rej(e.message) : res(r))),
    ]);

    if (format === 'json') {
      const exportData = {
        file,
        timeAssignments,
        subjectAssignments,
        roomAssignments,
        subjects,
        teachers,
        classes,
        rooms,
        programs
      };
      const defaultPath = `schedule_${fileId}.json`;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath,
        filters: [{ name: "JSON Files", extensions: ["json"] }]
      });
      if (canceled || !filePath) {
        console.log("Export cancelled by user");
        return { success: false, message: "Export cancelled." };
      }
      try {
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
        console.log("JSON file saved successfully:", filePath);
        return { success: true, message: "File exported as JSON!" };
      } catch (writeErr) {
        console.error("Error writing JSON file:", writeErr.message);
        return { success: false, message: "Failed to save JSON file: " + writeErr.message };
      }
    }

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeSlots = [
      '7:00 AM-7:30 AM', '7:30 AM-8:00 AM', '8:00 AM-8:30 AM', '8:30 AM-9:00 AM',
      '9:00 AM-9:30 AM', '9:30 AM-10:00 AM', '10:00 AM-10:30 AM', '10:30 AM-11:00 AM',
      '11:00 AM-11:30 AM', '11:30 AM-12:00 PM', '12:00 PM-12:30 PM', '12:30 PM-1:00 PM',
      '1:00 PM-1:30 PM', '1:30 PM-2:00 PM', '2:00 PM-2:30 PM', '2:30 PM-3:00 PM',
      '3:00 PM-3:30 PM', '3:30 PM-4:00 PM', '4:00 PM-4:30 PM', '4:30 PM-5:00 PM',
      '5:00 PM-5:30 PM', '5:30 PM-6:00 PM', '6:00 PM-6:30 PM', '6:30 PM-7:00 PM',
      '7:00 PM-7:30 PM', '7:30 PM-8:00 PM', '8:00 PM-8:30 PM', '8:30 PM-9:00 PM',
      '9:30 PM-10:00 PM'
    ];

    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
    const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));
    const programMap = Object.fromEntries(programs.map(p => [p.id, p]));

    let html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Schedule Export</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            font-size: 8px;
            margin: 0;
            padding: 10px;
            background: white;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 11px;
            margin: 6px 0;
            color: #000;
          }
          .institution {
            text-align: center;
            font-weight: bold;
            margin-bottom: 6px;
            font-size: 9px;
            color: #000;
          }
          .year-level-title, .room-title {
            text-align: center;
            font-weight: bold;
            font-size: 10px;
            margin: 15px 0 10px 0;
            color: #000;
          }
          .first-page {
            page-break-before: avoid;
          }
          .new-page {
            page-break-before: always;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background: white;
          }
          th, td {
            border: 1px solid #000;
            padding: 3px;
            vertical-align: top;
            word-break: break-word;
            background: white;
            color: #000;
            font-size: 7px;
          }
          th {
            background: #f0f0f0 !important;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
          }
          .time-col {
            width: 80px;
            font-size: 7px;
            background: #e0e0e0 !important;
            color: #000 !important;
            white-space: nowrap;
            text-align: center;
            font-weight: bold;
          }
          .day-col {
            width: 45px;
            font-size: 7px;
            font-weight: bold;
            text-align: center;
          }
          .slot-cell {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 2px;
            font-size: 7px;
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.1;
            min-width: 100px;
            text-align: center;
          }
          .subject-name {
            font-weight: bold;
            display: block;
            word-break: break-word;
            white-space: normal;
            color: #000;
            margin-bottom: 2px;
            text-align: center;
          }
          .teacher-name {
            display: block;
            font-size: 6px;
            color: #000;
            word-break: break-word;
            white-space: normal;
            text-align: center;
          }
          .class-name {
            display: block;
            font-size: 6px;
            color: #000;
            margin-top: 1px;
            text-align: center;
          }
          .room-name {
            display: block;
            font-size: 6px;
            color: #000;
            margin-top: 1px;
            text-align: center;
          }
          .sign-section {
            width: 100%;
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
          }
          .sign-block {
            display: inline-block;
            text-align: center;
          }
          .sign-line {
            width: 180px;
            border-bottom: 1px solid #000;
            margin: 25px auto 0 auto;
          }
        </style>
      </head>
      <body>
    `;

    const calculateTimeSlotSpan = (assignment) => {
      let startTime = assignment.timeSlot;
      if (startTime.includes('-')) {
        startTime = startTime.split('-')[0].trim();
      }
      const startIndex = timeSlots.findIndex(slot => slot.split('-')[0].trim() === startTime);
      if (startIndex === -1) {
        console.warn(`Invalid time slot for assignment ${assignment.id}: ${assignment.timeSlot}`);
        return { startIndex: -1, span: 1 };
      }
      const durationSlots = Math.ceil((assignment.duration || 30) / 30);
      const span = Math.max(1, durationSlots);
      return { startIndex, span };
    };

    if (type === 'teacher') {
      const teacherId = parseInt(id);
      const teacher = teacherMap[teacherId];
      if (!teacher) {
        console.error("Export failed: Teacher not found for id:", teacherId);
        return { success: false, message: "Teacher not found." };
      }
      const teacherTimeAssignments = timeAssignments.filter(a => parseInt(a.teacherId) === teacherId);
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Teacher Schedule</h1>
        <div style="text-align: center; font-size: 10px; margin-bottom: 15px;">${teacher.honorifics ? teacher.honorifics + ' ' : ''}${teacher.fullName}</div>`;

      const teacherGrid = {};
      dayOrder.forEach(day => {
        teacherGrid[day] = new Array(timeSlots.length).fill(null);
      });

      teacherTimeAssignments.forEach(assignment => {
        const { startIndex, span } = calculateTimeSlotSpan(assignment);
        if (startIndex !== -1) {
          for (let i = 0; i < span; i++) {
            const slotIndex = startIndex + i;
            if (slotIndex < timeSlots.length) {
              teacherGrid[assignment.day][slotIndex] = {
                assignment,
                isStart: i === 0,
                span: i === 0 ? span : 0
              };
            }
          }
        }
      });

      html += `<table>
        <thead>
          <tr>
            <th class="time-col">Time</th>`;
      dayOrder.forEach(day => {
        html += `<th>${day}</th>`;
      });
      html += `</tr>
        </thead>
        <tbody>`;

      timeSlots.forEach((timeSlot, timeIndex) => {
        html += `<tr>`;
        html += `<td class="time-col">${timeSlot}</td>`;
        dayOrder.forEach(day => {
          const cell = teacherGrid[day][timeIndex];
          if (!cell) {
            html += `<td class="slot-cell"></td>`;
          } else if (cell.span > 0) {
            const assignment = cell.assignment;
            const subject = subjectMap[assignment.subjectId];
            const className = classMap[assignment.classId]?.name || 'Unknown';
            const roomAssignment = roomAssignments.find(ra =>
              ra.scheduleFileId === assignment.scheduleFileId &&
              ra.subjectId === assignment.subjectId &&
              ra.teacherId === assignment.teacherId &&
              ra.classId === assignment.classId
            );
            const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';
            html += `<td class="slot-cell" rowspan="${cell.span}">`;
            html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
            html += `<span class="class-name">Class: ${className}</span>`;
            html += `<span class="room-name">Room: ${roomName}</span>`;
            html += `</td>`;
          }
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      html += `
        <div class="sign-section">
          <div class="sign-block">
            Prepared by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
            </div>
          </div>
          <div class="sign-block">
            Approved by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              DR. CRISTITA B. TAN<br>VPAA
            </div>
          </div>
        </div>`;

    } else if (type === 'program') {
      const programsToExport = (id === 'all') ? programs : programs.filter(p => p.id === parseInt(id));
      if (!programsToExport || programsToExport.length === 0) {
        console.error("Export failed: Program not found for id:", id);
        return { success: false, message: "Program not found." };
      }
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Program Schedule</h1>`;

      let isFirstYearLevel = true;
      for (const program of programsToExport) {
        const programClasses = classes.filter(c => c.programId === program.id);
        const classIds = programClasses.map(c => c.id);
        const programTimeAssignments = timeAssignments.filter(a => classIds.includes(a.classId));
        const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', '7th Year', '8th Year', '9th Year', '10th Year'];

        for (const yearLevel of yearLevels) {
          const yearClasses = programClasses.filter(c => c.yearLevel === yearLevel);
          const yearClassIds = yearClasses.map(c => c.id);
          const yearAssignments = programTimeAssignments.filter(a => yearClassIds.includes(a.classId));
          if (yearAssignments.length === 0) continue;

          const pageBreakClass = isFirstYearLevel ? 'first-page' : 'new-page';
          html += `<div class="year-level-title ${pageBreakClass}">${yearLevel} - ${program.name}</div>`;
          isFirstYearLevel = false;

          const scheduleGrid = {};
          dayOrder.forEach(day => {
            scheduleGrid[day] = new Array(timeSlots.length).fill(null);
          });

          yearAssignments.forEach(assignment => {
            const { startIndex, span } = calculateTimeSlotSpan(assignment);
            if (startIndex !== -1) {
              for (let i = 0; i < span; i++) {
                const slotIndex = startIndex + i;
                if (slotIndex < timeSlots.length) {
                  scheduleGrid[assignment.day][slotIndex] = {
                    assignment,
                    isStart: i === 0,
                    span: i === 0 ? span : 0
                  };
                }
              }
            }
          });

          html += `<table>
            <thead>
              <tr>
                <th class="time-col">Time</th>`;
          dayOrder.forEach(day => {
            html += `<th>${day}</th>`;
          });
          html += `</tr>
            </thead>
            <tbody>`;

          timeSlots.forEach((timeSlot, timeIndex) => {
            html += `<tr>`;
            html += `<td class="time-col">${timeSlot}</td>`;
            dayOrder.forEach(day => {
              const cell = scheduleGrid[day][timeIndex];
              if (!cell) {
                html += `<td class="slot-cell"></td>`;
              } else if (cell.span > 0) {
                const assignment = cell.assignment;
                const subject = subjectMap[assignment.subjectId];
                const teacher = teacherMap[assignment.teacherId];
                const className = classMap[assignment.classId]?.name || 'Unknown';
                const roomAssignment = roomAssignments.find(ra =>
                  ra.scheduleFileId === assignment.scheduleFileId &&
                  ra.subjectId === assignment.subjectId &&
                  ra.teacherId === assignment.teacherId &&
                  ra.classId === assignment.classId
                );
                const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';
                html += `<td class="slot-cell" rowspan="${cell.span}">`;
                html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
                html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
                html += `<span class="class-name">Class: ${className}</span>`;
                html += `<span class="room-name">Room: ${roomName}</span>`;
                html += `</td>`;
              }
            });
            html += `</tr>`;
          });

          html += `</tbody></table>`;
          html += `
            <div class="sign-section">
              <div class="sign-block">
                Prepared by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
                </div>
              </div>
              <div class="sign-block">
                Approved by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  DR. CRISTITA B. TAN<br>VPAA
                </div>
              </div>
            </div>`;
        }
      }
    } else if (type === 'room') {
      const roomsToExport = (id === 'all') ? rooms : rooms.filter(r => r.id === parseInt(id));
      if (!roomsToExport || roomsToExport.length === 0) {
        console.error("Export failed: Room not found for id:", id);
        return { success: false, message: "Room not found." };
      }
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Room Schedule</h1>`;

      let isFirstRoom = true;
      for (const room of roomsToExport) {
        const roomTimeAssignments = timeAssignments.filter(ta =>
          roomAssignments.some(ra =>
            ra.roomId === room.id &&
            ra.scheduleFileId === ta.scheduleFileId &&
            ra.subjectId === ta.subjectId &&
            ra.teacherId === ta.teacherId &&
            ra.classId === ta.classId
          )
        );

        if (roomTimeAssignments.length === 0) continue;

        const pageBreakClass = isFirstRoom ? 'first-page' : 'new-page';
        html += `<div class="room-title ${pageBreakClass}">Room: ${room.name}</div>`;
        isFirstRoom = false;

        const roomGrid = {};
        dayOrder.forEach(day => {
          roomGrid[day] = new Array(timeSlots.length).fill(null);
        });

        roomTimeAssignments.forEach(assignment => {
          const { startIndex, span } = calculateTimeSlotSpan(assignment);
          if (startIndex !== -1) {
            for (let i = 0; i < span; i++) {
              const slotIndex = startIndex + i;
              if (slotIndex < timeSlots.length) {
                roomGrid[assignment.day][slotIndex] = {
                  assignment,
                  isStart: i === 0,
                  span: i === 0 ? span : 0
                };
              }
            }
          }
        });

        html += `<table>
          <thead>
            <tr>
              <th class="time-col">Time</th>`;
        dayOrder.forEach(day => {
          html += `<th>${day}</th>`;
        });
        html += `</tr>
          </thead>
          <tbody>`;

        timeSlots.forEach((timeSlot, timeIndex) => {
          html += `<tr>`;
          html += `<td class="time-col">${timeSlot}</td>`;
          dayOrder.forEach(day => {
            const cell = roomGrid[day][timeIndex];
            if (!cell) {
              html += `<td class="slot-cell"></td>`;
            } else if (cell.span > 0) {
              const assignment = cell.assignment;
              const subject = subjectMap[assignment.subjectId];
              const teacher = teacherMap[assignment.teacherId];
              const className = classMap[assignment.classId]?.name || 'Unknown';
              html += `<td class="slot-cell" rowspan="${cell.span}">`;
              html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
              html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
              html += `<span class="class-name">Class: ${className}</span>`;
              html += `</td>`;
            }
          });
          html += `</tr>`;
        });

        html += `</tbody></table>`;
        html += `
          <div class="sign-section">
            <div class="sign-block">
              Prepared by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
              </div>
            </div>
            <div class="sign-block">
              Approved by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                DR. CRISTITA B. TAN<br>VPAA
              </div>
            </div>
          </div>`;
      }
    } else {
      console.error("Export failed: Invalid export type:", type);
      return { success: false, message: "Invalid export type. Use 'teacher', 'program', or 'room'." };
    }

    html += `</body></html>`;

    const defaultFilename = `schedule_${file.name || fileId}_${type}.pdf`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultFilename,
      filters: [{ name: "PDF Files", extensions: ["pdf"] }]
    });

    if (canceled || !filePath) {
      console.log("Export cancelled by user");
      return { success: false, message: "Export cancelled." };
    }

    const exportWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });

    try {
      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await exportWindow.loadURL(dataUri);
      console.log("Export window loaded HTML content");
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("Generating PDF...");
      const data = await exportWindow.webContents.printToPDF({
        landscape: true,
        marginsType: 1,
        pageSize: 'A4',
        printBackground: true
      });
      console.log("PDF generated successfully, writing to:", filePath);
      fs.writeFileSync(filePath, data);
      console.log("PDF file saved successfully:", filePath);
      exportWindow.close();
      return { success: true, message: "File exported as PDF!" };
    } catch (err) {
      console.error("Error in PDF generation:", err.message);
      exportWindow.close();
      return { success: false, message: "PDF generation failed: " + err.message };
    }
  } catch (err) {
    console.error("Export error:", err.message || err);
    return { success: false, message: "Export failed: " + (err.message || err) };
  }
});


ipcMain.handle("print-file", async (event, args = {}) => {
  const { fileId: rawFileId, type, id } = args;
  console.log("Print requested - args:", args);

  const fileId = typeof rawFileId === 'string' ? parseInt(rawFileId) : rawFileId;
  if (!fileId) {
    console.error("Print failed: No fileId provided");
    return { success: false, message: "No file selected to print." };
  }

  const file = await new Promise((res, rej) => {
    db.get(`SELECT * FROM schedule_files WHERE id=? AND status='active'`, [fileId], (err, row) => {
      if (err) {
        console.error("Error fetching file:", err.message);
        return rej(err.message);
      }
      res(row || null);
    });
  });

  if (!file) {
    console.error("Print failed: File not found for fileId:", fileId);
    return { success: false, message: "Selected file not found." };
  }

  try {
    const [
      timeAssignments,
      subjectAssignments,
      roomAssignments,
      subjects,
      teachers,
      classes,
      rooms,
      programs
    ] = await Promise.all([
      new Promise((res, rej) => db.all(`SELECT * FROM time_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subject_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM room_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subjects`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM teachers`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM classes`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM rooms`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM programs`, (e, r) => e ? rej(e.message) : res(r))),
    ]);

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeSlots = [
      '7:00 AM-7:30 AM', '7:30 AM-8:00 AM', '8:00 AM-8:30 AM', '8:30 AM-9:00 AM',
      '9:00 AM-9:30 AM', '9:30 AM-10:00 AM', '10:00 AM-10:30 AM', '10:30 AM-11:00 AM',
      '11:00 AM-11:30 AM', '11:30 AM-12:00 PM', '12:00 PM-12:30 PM', '12:30 PM-1:00 PM',
      '1:00 PM-1:30 PM', '1:30 PM-2:00 PM', '2:00 PM-2:30 PM', '2:30 PM-3:00 PM',
      '3:00 PM-3:30 PM', '3:30 PM-4:00 PM', '4:00 PM-4:30 PM', '4:30 PM-5:00 PM',
      '5:00 PM-5:30 PM', '5:30 PM-6:00 PM', '6:00 PM-6:30 PM', '6:30 PM-7:00 PM',
      '7:00 PM-7:30 PM', '7:30 PM-8:00 PM', '8:00 PM-8:30 PM', '8:30 PM-9:00 PM',
      '9:00 PM-9:30 PM', '9:30 PM-10:00 PM'
    ];

    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
    const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));
    const programMap = Object.fromEntries(programs.map(p => [p.id, p]));

    let html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Schedule Print</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            font-size: 9px;
            margin: 0;
            padding: 10px;
            background: white;
            color: #000;
          }
          h1 {
            text-align: center;
            font-size: 12px;
            margin: 6px 0;
            color: #000;
          }
          .institution {
            text-align: center;
            font-weight: bold;
            margin-bottom: 6px;
            font-size: 10px;
            color: #000;
          }
          .year-level-title, .room-title {
            text-align: center;
            font-weight: bold;
            font-size: 11px;
            margin: 15px 0 10px 0;
            color: #000;
          }
          .first-page {
            page-break-before: avoid;
          }
          .new-page {
            page-break-before: always;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            background: white;
          }
          th, td {
            border: 1px solid #000;
            padding: 4px;
            vertical-align: top;
            word-break: break-word;
            background: white;
            color: #000;
            font-size: 8px;
          }
          th {
            background: #f0f0f0 !important;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
          }
          .time-col {
            width: 80px;
            font-size: 8px;
            background: #e0e0e0 !important;
            color: #000 !important;
            white-space: nowrap;
            text-align: center;
            font-weight: bold;
          }
          .day-col {
            width: 50px;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
          }
          .slot-cell {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 3px;
            font-size: 8px;
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.2;
            min-width: 120px;
            text-align: center;
          }
          .subject-name {
            font-weight: bold;
            display: block;
            word-break: break-word;
            white-space: normal;
            color: #000;
            margin-bottom: 2px;
            text-align: center;
          }
          .teacher-name, .class-name, .program-name {
            display: block;
            font-size: 7px;
            color: #000;
            word-break: break-word;
            white-space: normal;
            text-align: center;
          }
          .room-name {
            display: block;
            font-size: 7px;
            color: #000;
            margin-top: 1px;
            text-align: center;
          }
          .sign-section {
            width: 100%;
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
          }
          .sign-block {
            display: inline-block;
            text-align: center;
          }
          .sign-line {
            width: 200px;
            border-bottom: 1px solid #000;
            margin: 30px auto 0 auto;
          }
        </style>
      </head>
      <body>
    `;

    const calculateTimeSlotSpan = (assignment) => {
      let startTime = assignment.timeSlot;
      if (startTime.includes('-')) {
        startTime = startTime.split('-')[0].trim();
      }
      const startIndex = timeSlots.findIndex(slot => slot.split('-')[0].trim() === startTime);
      if (startIndex === -1) {
        console.warn(`Invalid time slot for assignment ${assignment.id}: ${assignment.timeSlot}`);
        return { startIndex: -1, span: 1 };
      }
      const durationSlots = Math.ceil((assignment.duration || 30) / 30);
      const span = Math.max(1, durationSlots);
      return { startIndex, span };
    };

    if (type === 'teacher') {
      const teacherId = parseInt(id);
      const teacher = teacherMap[teacherId];
      if (!teacher) {
        console.error("Print failed: Teacher not found for id:", teacherId);
        return { success: false, message: "Teacher not found." };
      }
      const teacherTimeAssignments = timeAssignments.filter(a => parseInt(a.teacherId) === teacherId);
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Teacher Schedule</h1>
        <div style="text-align: center; font-size: 11px; margin-bottom: 15px;">${teacher.honorifics ? teacher.honorifics + ' ' : ''}${teacher.fullName}</div>`;

      const teacherGrid = {};
      dayOrder.forEach(day => {
        teacherGrid[day] = new Array(timeSlots.length).fill(null);
      });

      teacherTimeAssignments.forEach(assignment => {
        const { startIndex, span } = calculateTimeSlotSpan(assignment);
        if (startIndex !== -1) {
          for (let i = 0; i < span; i++) {
            const slotIndex = startIndex + i;
            if (slotIndex < timeSlots.length) {
              teacherGrid[assignment.day][slotIndex] = {
                assignment,
                isStart: i === 0,
                span: i === 0 ? span : 0
              };
            }
          }
        }
      });

      html += `<table>
        <thead>
          <tr>
            <th class="time-col">Time</th>`;
      dayOrder.forEach(day => {
        html += `<th>${day}</th>`;
      });
      html += `</tr>
        </thead>
        <tbody>`;

      timeSlots.forEach((timeSlot, timeIndex) => {
        html += `<tr>`;
        html += `<td class="time-col">${timeSlot}</td>`;
        dayOrder.forEach(day => {
          const cell = teacherGrid[day][timeIndex];
          if (!cell) {
            html += `<td class="slot-cell"></td>`;
          } else if (cell.span > 0) {
            const assignment = cell.assignment;
            const subject = subjectMap[assignment.subjectId];
            const className = classMap[assignment.classId]?.name || 'Unknown';
            const roomAssignment = roomAssignments.find(ra =>
              ra.scheduleFileId === assignment.scheduleFileId &&
              ra.subjectId === assignment.subjectId &&
              ra.teacherId === assignment.teacherId &&
              ra.classId === assignment.classId
            );
            const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';
            html += `<td class="slot-cell" rowspan="${cell.span}">`;
            html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
            html += `<span class="class-name">Class: ${className}</span>`;
            html += `<span class="room-name">Room: ${roomName}</span>`;
            html += `</td>`;
          }
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      html += `
        <div class="sign-section">
          <div class="sign-block">
            Prepared by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
            </div>
          </div>
          <div class="sign-block">
            Approved by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              DR. CRISTITA B. TAN<br>VPAA
            </div>
          </div>
        </div>`;

    } else if (type === 'program') {
      const programsToExport = (id === 'all') ? programs : programs.filter(p => p.id === parseInt(id));
      if (!programsToExport || programsToExport.length === 0) {
        console.error("Print failed: Program not found for id:", id);
        return { success: false, message: "Program not found." };
      }
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Program Schedule</h1>`;

      let isFirstYearLevel = true;
      for (const program of programsToExport) {
        const programClasses = classes.filter(c => c.programId === program.id);
        const classIds = programClasses.map(c => c.id);
        const programTimeAssignments = timeAssignments.filter(a => classIds.includes(a.classId));
        const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', '7th Year', '8th Year', '9th Year', '10th Year'];

        for (const yearLevel of yearLevels) {
          const yearClasses = programClasses.filter(c => c.yearLevel === yearLevel);
          const yearClassIds = yearClasses.map(c => c.id);
          const yearAssignments = programTimeAssignments.filter(a => yearClassIds.includes(a.classId));
          if (yearAssignments.length === 0) continue;

          const pageBreakClass = isFirstYearLevel ? 'first-page' : 'new-page';
          html += `<div class="year-level-title ${pageBreakClass}">${yearLevel} - ${program.name}</div>`;
          isFirstYearLevel = false;

          const scheduleGrid = {};
          dayOrder.forEach(day => {
            scheduleGrid[day] = new Array(timeSlots.length).fill(null);
          });

          yearAssignments.forEach(assignment => {
            const { startIndex, span } = calculateTimeSlotSpan(assignment);
            if (startIndex !== -1) {
              for (let i = 0; i < span; i++) {
                const slotIndex = startIndex + i;
                if (slotIndex < timeSlots.length) {
                  scheduleGrid[assignment.day][slotIndex] = {
                    assignment,
                    isStart: i === 0,
                    span: i === 0 ? span : 0
                  };
                }
              }
            }
          });

          html += `<table>
            <thead>
              <tr>
                <th class="time-col">Time</th>`;
          dayOrder.forEach(day => {
            html += `<th>${day}</th>`;
          });
          html += `</tr>
            </thead>
            <tbody>`;

          timeSlots.forEach((timeSlot, timeIndex) => {
            html += `<tr>`;
            html += `<td class="time-col">${timeSlot}</td>`;
            dayOrder.forEach(day => {
              const cell = scheduleGrid[day][timeIndex];
              if (!cell) {
                html += `<td class="slot-cell"></td>`;
              } else if (cell.span > 0) {
                const assignment = cell.assignment;
                const subject = subjectMap[assignment.subjectId];
                const teacher = teacherMap[assignment.teacherId];
                const className = classMap[assignment.classId]?.name || 'Unknown';
                const roomAssignment = roomAssignments.find(ra =>
                  ra.scheduleFileId === assignment.scheduleFileId &&
                  ra.subjectId === assignment.subjectId &&
                  ra.teacherId === assignment.teacherId &&
                  ra.classId === assignment.classId
                );
                const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';
                html += `<td class="slot-cell" rowspan="${cell.span}">`;
                html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
                html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
                html += `<span class="room-name">Room: ${roomName}</span>`;
                html += `</td>`;
              }
            });
            html += `</tr>`;
          });

          html += `</tbody></table>`;
          html += `
            <div class="sign-section">
              <div class="sign-block">
                Prepared by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
                </div>
              </div>
              <div class="sign-block">
                Approved by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  DR. CRISTITA B. TAN<br>VPAA
                </div>
              </div>
            </div>`;
        }
      }
    } else if (type === 'room') {
      const roomsToExport = (id === 'all') ? rooms : rooms.filter(r => r.id === parseInt(id));
      if (!roomsToExport || roomsToExport.length === 0) {
        console.error("Print failed: Room not found for id:", id);
        return { success: false, message: "Room not found." };
      }
      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Room Schedule</h1>`;

      let isFirstRoom = true;
      for (const room of roomsToExport) {
        const roomTimeAssignments = timeAssignments.filter(ta =>
          roomAssignments.some(ra =>
            ra.roomId === room.id &&
            ra.scheduleFileId === ta.scheduleFileId &&
            ra.subjectId === ta.subjectId &&
            ra.teacherId === ta.teacherId &&
            ra.classId === ta.classId
          )
        );

        if (roomTimeAssignments.length === 0) {
          console.warn(`No assignments found for room: ${room.name}`);
          continue;
        }

        const pageBreakClass = isFirstRoom ? 'first-page' : 'new-page';
        html += `<div class="room-title ${pageBreakClass}">${room.name} </div>`;
        isFirstRoom = false;

        const roomGrid = {};
        dayOrder.forEach(day => {
          roomGrid[day] = new Array(timeSlots.length).fill(null);
        });

        roomTimeAssignments.forEach(assignment => {
          const { startIndex, span } = calculateTimeSlotSpan(assignment);
          if (startIndex !== -1) {
            for (let i = 0; i < span; i++) {
              const slotIndex = startIndex + i;
              if (slotIndex < timeSlots.length) {
                roomGrid[assignment.day][slotIndex] = {
                  assignment,
                  isStart: i === 0,
                  span: i === 0 ? span : 0
                };
              }
            }
          }
        });

        html += `<table>
          <thead>
            <tr>
              <th class="time-col">Time</th>`;
        dayOrder.forEach(day => {
          html += `<th>${day}</th>`;
        });
        html += `</tr>
          </thead>
          <tbody>`;

        timeSlots.forEach((timeSlot, timeIndex) => {
          html += `<tr>`;
          html += `<td class="time-col">${timeSlot}</td>`;
          dayOrder.forEach(day => {
            const cell = roomGrid[day][timeIndex];
            if (!cell) {
              html += `<td class="slot-cell"></td>`;
            } else if (cell.span > 0) {
              const assignment = cell.assignment;
              const subject = subjectMap[assignment.subjectId];
              const teacher = teacherMap[assignment.teacherId];
              const classObj = classMap[assignment.classId];
              const className = classObj?.name || 'Unknown';
              const program = classObj ? programMap[classObj.programId] : null;
              const programName = program?.name || 'Unknown';
              html += `<td class="slot-cell" rowspan="${cell.span}">`;
              html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
              html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
              html += `<span class="class-name">Class: ${className}</span>`;
              html += `<span class="program-name">Program: ${programName}</span>`;
              html += `</td>`;
            }
          });
          html += `</tr>`;
        });

        html += `</tbody></table>`;
        html += `
          <div class="sign-section">
            <div class="sign-block">
              Prepared by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
              </div>
            </div>
            <div class="sign-block">
              Approved by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                DR. CRISTITA B. TAN<br>VPAA
              </div>
            </div>
          </div>`;
      }
    } else {
      console.error("Print failed: Invalid print type:", type);
      return { success: false, message: "Invalid print type. Use 'teacher', 'program', or 'room'." };
    }

    html += `</body></html>`;

    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      }
    });

    try {
      const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
      await printWindow.loadURL(dataUri);
      console.log("Print window loaded HTML content");
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log("Sending to printer...");
      return await new Promise((resolve, reject) => {
        printWindow.webContents.print({
          landscape: true,
          marginsType: 1,
          pageSize: 'A4'
        }, (success, failureReason) => {
          console.log("Print operation result:", success ? "Success" : `Failed: ${failureReason}`);
          printWindow.close();
          if (success) {
            resolve({ success: true, message: "File sent to printer!" });
          } else {
            reject({ success: false, message: "Print failed: " + (failureReason || "Unknown error") });
          }
        });
      });
    } catch (err) {
      console.error("Error in print operation:", err.message);
      printWindow.close();
      return { success: false, message: "Print failed: " + err.message };
    }
  } catch (err) {
    console.error("Print error:", err.message || err);
    return { success: false, message: "Print failed: " + (err.message || err) };
  }
});

ipcMain.handle("get-all-schedule-files", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM schedule_files ORDER BY updatedAt DESC`, (err, rows) => {
      if (err) {
        console.error("Get all files error:", err.message);
        reject(err.message);
      } else {
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle("delete-schedule-file", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM schedule_files WHERE id=?`, [id], (err) => {
      if (err) {
        console.error("Delete file error:", err.message);
        reject(err.message);
        return;
      }
      const deleteAssignments = [
        db.run(`DELETE FROM subject_assignments WHERE scheduleFileId=?`, [id]),
        db.run(`DELETE FROM time_assignments WHERE scheduleFileId=?`, [id]),
        db.run(`DELETE FROM room_assignments WHERE scheduleFileId=?`, [id])
      ];
      Promise.all(deleteAssignments).then(() => {
        if (openFiles.has(id)) {
          openFiles.delete(id);
        }
        resolve({ success: true, message: "File deleted!" });
      }).catch((err) => {
        console.error("Delete assignments error:", err.message);
        reject(err.message);
      });
    });
  });
});

ipcMain.handle("archive-schedule-file", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE schedule_files SET status='archived', updatedAt=? WHERE id=?`, [new Date().toISOString(), id], (err) => {
      if (err) {
        console.error("Archive file error:", err.message);
        reject(err.message);
        return;
      }
      if (openFiles.has(id)) {
        openFiles.delete(id);
      }
      resolve({ success: true, message: "File archived!" });
    });
  });
});

ipcMain.handle("save-teacher", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.fullName || !data.color) {
      resolve({ success: false, message: "Full name and color are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE teachers SET fullName=?, honorifics=?, color=? WHERE id=?`,
        [data.fullName, data.honorifics, data.color, data.id],
        (err) => (err ? reject(err.message) : resolve({ success: true }))
      );
    } else {
      db.run(
        `INSERT INTO teachers (fullName, honorifics, color) VALUES (?, ?, ?)`,
        [data.fullName, data.honorifics, data.color],
        function (err) {
          if (err) reject(err.message);
          else resolve({ success: true, id: this.lastID });
        }
      );
    }
  });
});

ipcMain.handle("delete-teacher", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM teachers WHERE id=?`, [id], (err) => {
      if (err) reject(err.message);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle("get-subjects", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM subjects`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("save-subject", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.name || !data.code || !data.units) {
      resolve({ success: false, message: "Name, code, and units are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE subjects SET name=?, code=?, units=?, semester=?, programId=?, yearLevel=? WHERE id=?`,
        [data.name, data.code, data.units, data.semester, data.programId, data.yearLevel, data.id],
        (err) => (err ? reject(err.message) : resolve({ success: true }))
      );
    } else {
      db.run(
        `INSERT INTO subjects (name, code, units, semester, programId, yearLevel) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.name, data.code, data.units, data.semester, data.programId, data.yearLevel],
        function (err) {
          if (err) reject(err.message);
          else resolve({ success: true, id: this.lastID });
        }
      );
    }
  });
});

ipcMain.handle("delete-subject", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM subjects WHERE id=?`, [id], (err) => {
      if (err) reject(err.message);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle("get-rooms", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM rooms`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

ipcMain.handle("save-room", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.name || !data.capacity) {
      resolve({ success: false, message: "Name and capacity are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE rooms SET name=?, capacity=? WHERE id=?`,
        [data.name, data.capacity, data.id],
        (err) => (err ? reject(err.message) : resolve({ success: true }))
      );
    } else {
      db.run(
        `INSERT INTO rooms (name, capacity) VALUES (?, ?)`,
        [data.name, data.capacity],
        function (err) {
          if (err) reject(err.message);
          else resolve({ success: true, id: this.lastID });
        }
      );
    }
  });
});

ipcMain.handle("delete-room", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM rooms WHERE id=?`, [id], (err) => {
      if (err) reject(err.message);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle("save-program", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.name || !data.years) {
      resolve({ success: false, message: "Name and years are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE programs SET name=?, years=? WHERE id=?`,
        [data.name, data.years, data.id],
        (err) => {
          if (err) reject(err.message);
          else resolve({ success: true });
        }
      );
    } else {
      db.run(
        `INSERT INTO programs (name, years) VALUES (?, ?)`,
        [data.name, data.years],
        function (err) {
          if (err) reject(err.message);
          else resolve({ success: true, id: this.lastID });
        }
      );
    }
  });
});

ipcMain.handle("delete-program", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM programs WHERE id=?`, [id], (err) => {
      if (err) reject(err.message);
      else resolve({ success: true });
    });
  });
});

// ipcMain.handle("get-classes", () => {
//   return new Promise((resolve, reject) => {
//     db.all(`SELECT * FROM classes`, (err, rows) => {
//       if (err) reject(err.message);
//       else resolve(rows || []);
//     });
//   });
// });

ipcMain.handle("save-class", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.name || !data.students || !data.programId || !data.yearLevel) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE classes SET name=?, students=?, programId=?, yearLevel=? WHERE id=?`,
        [data.name, data.students, data.programId, data.yearLevel, data.id],
        (err) => (err ? reject(err.message) : resolve({ success: true }))
      );
    } else {
      db.run(
        `INSERT INTO classes (name, students, programId, yearLevel) VALUES (?, ?, ?, ?)`,
        [data.name, data.students, data.programId, data.yearLevel],
        function (err) {
          if (err) reject(err.message);
          else resolve({ success: true, id: this.lastID });
        }
      );
    }
  });
});

ipcMain.handle("delete-class", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM classes WHERE id=?`, [id], (err) => {
      if (err) reject(err.message);
      else resolve({ success: true });
    });
  });
});

ipcMain.handle("get-assignments", (event, fileId) => {
  return new Promise((resolve, reject) => {
    if (!fileId) {
      resolve({ success: false, message: "File ID is required" });
      return;
    }
    Promise.all([
      new Promise((res, rej) => {
        db.all(`SELECT *, 'subject' as type FROM subject_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
          if (err) rej(err.message);
          else res(rows || []);
        });
      }),
      new Promise((res, rej) => {
        db.all(`SELECT *, 'time' as type FROM time_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
          if (err) rej(err.message);
          else res(rows || []);
        });
      }),
      new Promise((res, rej) => {
        db.all(`SELECT *, 'room' as type FROM room_assignments WHERE scheduleFileId = ?`, [fileId], (err, rows) => {
          if (err) rej(err.message);
          else res(rows || []);
        });
      }),
    ]).then(([subjects, times, rooms]) => {
      resolve([...subjects, ...times, ...rooms]);
    }).catch(reject);
  });
});

ipcMain.handle("assign-teacher-to-subject", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.scheduleFileId || !data.subjectId || !data.teacherId) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    const id = uuidv4();
    db.run(
      `INSERT INTO subject_assignments (id, scheduleFileId, subjectId, teacherId) VALUES (?, ?, ?, ?)`,
      [id, data.scheduleFileId, data.subjectId, data.teacherId],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true, id });
            }
          );
        }
      }
    );
  });
});

ipcMain.handle("assign-time-slot", (event, data) => {
  return new Promise((resolve, reject) => {
    // Remove teacherId from required fields check
    if (!data.scheduleFileId || !data.subjectId || !data.classId || !data.day || !data.timeSlot || !data.duration) {
      resolve({ success: false, message: "Schedule file, subject, class, day, time slot, and duration are required" });
      return;
    }
    const id = uuidv4();
    db.run(
      `INSERT INTO time_assignments (id, scheduleFileId, subjectId, teacherId, classId, day, timeSlot, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.scheduleFileId, data.subjectId, data.teacherId || null, data.classId, data.day, data.timeSlot, data.duration],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true, id });
            }
          );
        }
      }
    );
  });
});

ipcMain.handle("assign-room", (event, data) => {
  return new Promise((resolve, reject) => {
    // Remove teacherId from required fields check
    if (!data.scheduleFileId || !data.subjectId || !data.classId || !data.roomId) {
      resolve({ success: false, message: "Schedule file, subject, class, and room are required" });
      return;
    }
    const id = uuidv4();
    db.run(
      `INSERT INTO room_assignments (id, scheduleFileId, subjectId, teacherId, classId, roomId) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.scheduleFileId, data.subjectId, data.teacherId || null, data.classId, data.roomId],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true, id });
            }
          );
        }
      }
    );
  });
});

ipcMain.handle("delete-assignment", (event, id) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT scheduleFileId FROM subject_assignments WHERE id = ?`, [id], (err, row) => {
      if (err) {
        reject(err.message);
        return;
      }
      if (row) {
        db.run(`DELETE FROM subject_assignments WHERE id = ?`, [id], (err) => {
          if (err) reject(err.message);
          else {
            db.run(
              `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
              [new Date().toISOString(), row.scheduleFileId],
              (err) => {
                if (err) console.error("Update file timestamp error:", err.message);
                resolve({ success: true });
              }
            );
          }
        });
        return;
      }
      db.get(`SELECT scheduleFileId FROM time_assignments WHERE id = ?`, [id], (err, row) => {
        if (err) {
          reject(err.message);
          return;
        }
        if (row) {
          db.run(`DELETE FROM time_assignments WHERE id = ?`, [id], (err) => {
            if (err) reject(err.message);
            else {
              db.run(
                `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
                [new Date().toISOString(), row.scheduleFileId],
                (err) => {
                  if (err) console.error("Update file timestamp error:", err.message);
                  resolve({ success: true });
                }
              );
            }
          });
          return;
        }
        db.get(`SELECT scheduleFileId FROM room_assignments WHERE id = ?`, [id], (err, row) => {
          if (err) {
            reject(err.message);
            return;
          }
          if (row) {
            db.run(`DELETE FROM room_assignments WHERE id = ?`, [id], (err) => {
              if (err) reject(err.message);
              else {
                db.run(
                  `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
                  [new Date().toISOString(), row.scheduleFileId],
                  (err) => {
                    if (err) console.error("Update file timestamp error:", err.message);
                    resolve({ success: true });
                  }
                );
              }
            });
          } else {
            resolve({ success: false, message: "Assignment not found" });
          }
        });
      });
    });
  });
});

ipcMain.handle("update-teacher-subject-assignment", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.id || !data.scheduleFileId || !data.subjectId || !data.teacherId) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }
    db.run(
      `UPDATE subject_assignments SET subjectId=?, teacherId=? WHERE id=?`,
      [data.subjectId, data.teacherId, data.id],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true });
            }
          );
        }
      }
    );
  });
});

ipcMain.handle("update-time-slot-assignment", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.id || !data.scheduleFileId || !data.subjectId || !data.teacherId || !data.classId || !data.day || !data.timeSlot || !data.duration) {
      resolve({ success: false, message: "All fields are required, including teacher" });
      return;
    }
    db.run(
      `UPDATE time_assignments SET subjectId=?, teacherId=?, classId=?, day=?, timeSlot=?, duration=? WHERE id=?`,
      [data.subjectId, data.teacherId, data.classId, data.day, data.timeSlot, data.duration, data.id],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true });
            }
          );
        }
      }
    );
  });
});

ipcMain.handle("update-room-assignment", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.id || !data.scheduleFileId || !data.subjectId || !data.teacherId || !data.classId || !data.roomId) {
      resolve({ success: false, message: "All fields are required, including teacher" });
      return;
    }
    db.run(
      `UPDATE room_assignments SET subjectId=?, teacherId=?, classId=?, roomId=? WHERE id=?`,
      [data.subjectId, data.teacherId, data.classId, data.roomId, data.id],
      (err) => {
        if (err) reject(err.message);
        else {
          db.run(
            `UPDATE schedule_files SET updatedAt=? WHERE id=?`,
            [new Date().toISOString(), data.scheduleFileId],
            (err) => {
              if (err) console.error("Update file timestamp error:", err.message);
              resolve({ success: true });
            }
          );
        }
      }
    );
  });
});

// Updated get-classes handler (returns only classes not part of merges)
ipcMain.handle("get-classes", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM classes WHERE mergedInto IS NULL ORDER BY name`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

// Get all classes including merge status
ipcMain.handle("get-all-classes-with-merge-status", () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT c.*, 
             CASE 
               WHEN c.isMerged = 1 THEN 'merged'
               WHEN c.mergedInto IS NOT NULL THEN 'part_of_merge'
               ELSE 'normal'
             END as merge_status,
             m.name as merged_into_name
      FROM classes c
      LEFT JOIN classes m ON c.mergedInto = m.id
      ORDER BY c.isMerged DESC, c.name ASC
    `, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

// Get classes available for merging
ipcMain.handle("get-available-classes-for-merge", () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT * FROM classes 
      WHERE isMerged = 0 AND mergedInto IS NULL 
      ORDER BY programId, yearLevel, name
    `, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

// Create merged class
ipcMain.handle("create-merged-class", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.name || !data.classIds || !data.classIds.length) {
      resolve({ success: false, message: "Class name and at least one class are required" });
      return;
    }

    const getTotalStudents = (classIds) => {
      return new Promise((res, rej) => {
        const placeholders = classIds.map(() => '?').join(',');
        db.all(`SELECT students FROM classes WHERE id IN (${placeholders})`, classIds, (err, rows) => {
          if (err) rej(err.message);
          else {
            const total = rows.reduce((sum, row) => sum + (parseInt(row.students) || 0), 0);
            res(total);
          }
        });
      });
    };

    getTotalStudents(data.classIds).then(totalStudents => {
      const mergedFrom = JSON.stringify(data.classIds);
      
      db.run(
        `INSERT INTO classes (name, students, programId, yearLevel, isMerged, mergedFrom) VALUES (?, ?, ?, ?, ?, ?)`,
        [data.name, totalStudents, data.programId, data.yearLevel, 1, mergedFrom],
        function (err) {
          if (err) reject(err.message);
          else {
            const mergedClassId = this.lastID;
            
            const updatePromises = data.classIds.map(classId => {
              return new Promise((res, rej) => {
                db.run(
                  `UPDATE classes SET mergedInto = ? WHERE id = ?`,
                  [mergedClassId, classId],
                  (err) => err ? rej(err.message) : res()
                );
              });
            });
            
            Promise.all(updatePromises).then(() => {
              resolve({ success: true, id: mergedClassId, totalStudents });
            }).catch(reject);
          }
        }
      );
    }).catch(reject);
  });
});

// Get merged class details
ipcMain.handle("get-merged-class-details", (event, classId) => {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM classes WHERE id = ?`, [classId], (err, row) => {
      if (err) {
        reject(err.message);
        return;
      }
      
      if (!row || !row.isMerged) {
        resolve({ success: false, message: "Class not found or not a merged class" });
        return;
      }
      
      let mergedClassIds = [];
      try {
        mergedClassIds = JSON.parse(row.mergedFrom || '[]');
      } catch (e) {
        console.error("Error parsing mergedFrom:", e);
      }
      
      if (mergedClassIds.length === 0) {
        resolve({ 
          success: true, 
          mergedClass: row, 
          originalClasses: [] 
        });
        return;
      }
      
      const placeholders = mergedClassIds.map(() => '?').join(',');
      db.all(
        `SELECT * FROM classes WHERE id IN (${placeholders})`, 
        mergedClassIds,
        (err, originalClasses) => {
          if (err) {
            reject(err.message);
            return;
          }
          
          resolve({ 
            success: true, 
            mergedClass: row, 
            originalClasses: originalClasses || [] 
          });
        }
      );
    });
  });
});

// Update merged class
ipcMain.handle("update-merged-class", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.id || !data.name || !data.classIds || !data.classIds.length) {
      resolve({ success: false, message: "All fields are required" });
      return;
    }

    const getTotalStudents = (classIds) => {
      return new Promise((res, rej) => {
        const placeholders = classIds.map(() => '?').join(',');
        db.all(`SELECT students FROM classes WHERE id IN (${placeholders})`, classIds, (err, rows) => {
          if (err) rej(err.message);
          else {
            const total = rows.reduce((sum, row) => sum + (parseInt(row.students) || 0), 0);
            res(total);
          }
        });
      });
    };

    db.run(`UPDATE classes SET mergedInto = NULL WHERE mergedInto = ?`, [data.id], (err) => {
      if (err) {
        reject(err.message);
        return;
      }

      getTotalStudents(data.classIds).then(totalStudents => {
        const mergedFrom = JSON.stringify(data.classIds);
        
        db.run(
          `UPDATE classes SET name = ?, students = ?, programId = ?, yearLevel = ?, mergedFrom = ? WHERE id = ?`,
          [data.name, totalStudents, data.programId, data.yearLevel, mergedFrom, data.id],
          (err) => {
            if (err) {
              reject(err.message);
              return;
            }
            
            const updatePromises = data.classIds.map(classId => {
              return new Promise((res, rej) => {
                db.run(
                  `UPDATE classes SET mergedInto = ? WHERE id = ?`,
                  [data.id, classId],
                  (err) => err ? rej(err.message) : res()
                );
              });
            });
            
            Promise.all(updatePromises).then(() => {
              resolve({ success: true, totalStudents });
            }).catch(reject);
          }
        );
      }).catch(reject);
    });
  });
});

// Unmerge class
ipcMain.handle("unmerge-class", (event, classId) => {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE classes SET mergedInto = NULL WHERE mergedInto = ?`, [classId], (err) => {
      if (err) {
        reject(err.message);
        return;
      }
      
      db.run(`DELETE FROM classes WHERE id = ?`, [classId], (err) => {
        if (err) {
          reject(err.message);
          return;
        }
        
        resolve({ success: true });
      });
    });
  });
});

ipcMain.handle("reload-window", () => {
  if (mainWindow) {
    const isDev = !app.isPackaged; // 👈 add this line
    const startUrl = isDev
      ? "http://localhost:5173/#/"
      : `file://${path.join(__dirname, "../dist/index.html")}#/`;

    console.log("isDev:", isDev);
    console.log("startUrl:", startUrl);
    mainWindow.loadURL(startUrl);
    return { success: true, message: "Window reloaded" };
  }
  return { success: false, message: "No main window available" };
});


ipcMain.handle("generate-preview", async (event, args = {}) => {
  const { fileId: rawFileId, type, id } = args;
  console.log("Preview requested - args:", args);

  const fileId = typeof rawFileId === 'string' ? parseInt(rawFileId) : rawFileId;
  if (!fileId) {
    console.error("Preview failed: No fileId provided");
    return { success: false, message: "No file selected to preview." };
  }

  const file = await new Promise((res, rej) => {
    db.get(`SELECT * FROM schedule_files WHERE id=? AND status='active'`, [fileId], (err, row) => {
      if (err) {
        console.error("Error fetching file:", err.message);
        return rej(err.message);
      }
      res(row || null);
    });
  });
  if (!file) {
    console.error("Preview failed: File not found for fileId:", fileId);
    return { success: false, message: "Selected file not found." };
  }

  try {
    const [
      timeAssignments,
      subjectAssignments,
      roomAssignments,
      subjects,
      teachers,
      classes,
      rooms,
      programs
    ] = await Promise.all([
      new Promise((res, rej) => db.all(`SELECT * FROM time_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subject_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM room_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM subjects`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM teachers`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM classes`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM rooms`, (e, r) => e ? rej(e.message) : res(r))),
      new Promise((res, rej) => db.all(`SELECT * FROM programs`, (e, r) => e ? rej(e.message) : res(r))),
    ]);

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const timeSlots = [
      '7:00 AM-7:30 AM', '7:30 AM-8:00 AM', '8:00 AM-8:30 AM', '8:30 AM-9:00 AM',
      '9:00 AM-9:30 AM', '9:30 AM-10:00 AM', '10:00 AM-10:30 AM', '10:30 AM-11:00 AM',
      '11:00 AM-11:30 AM', '11:30 AM-12:00 PM', '12:00 PM-12:30 PM', '12:30 PM-1:00 PM',
      '1:00 PM-1:30 PM', '1:30 PM-2:00 PM', '2:00 PM-2:30 PM', '2:30 PM-3:00 PM',
      '3:00 PM-3:30 PM', '3:30 PM-4:00 PM', '4:00 PM-4:30 PM', '4:30 PM-5:00 PM',
      '5:00 PM-5:30 PM', '5:30 PM-6:00 PM', '6:00 PM-6:30 PM', '6:30 PM-7:00 PM',
      '7:00 PM-7:30 PM', '7:30 PM-8:00 PM', '8:00 PM-8:30 PM', '8:30 PM-9:00 PM',
      '9:00 PM-9:30 PM', '9:30 PM-10:00 PM'
    ];

    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));
    const classMap = Object.fromEntries(classes.map(c => [c.id, c]));
    const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));
    const programMap = Object.fromEntries(programs.map(p => [p.id, p]));

    let html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Schedule Preview</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 9px; 
            margin: 0; 
            padding: 10px;
            background: white;
            color: #000;
          }
          h1 { 
            text-align: center; 
            font-size: 12px; 
            margin: 6px 0; 
            color: #000;
          }
          .institution { 
            text-align: center; 
            font-weight: bold; 
            margin-bottom: 6px; 
            font-size: 10px; 
            color: #000;
          }
          .year-level-title, .room-title {
            text-align: center; 
            font-weight: bold; 
            font-size: 11px; 
            margin: 15px 0 10px 0;
            color: #000;
          }
          .first-page {
            page-break-before: avoid;
          }
          .new-page {
            page-break-before: always;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px; 
            background: white;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 4px; 
            vertical-align: top; 
            word-break: break-word; 
            background: white;
            color: #000;
            font-size: 8px;
          }
          th { 
            background: #f0f0f0 !important; 
            font-size: 9px; 
            font-weight: bold;
            text-align: center;
          }
          .time-col { 
            width: 80px; 
            font-size: 8px;
            background: #e0e0e0 !important;
            color: #000 !important;
            white-space: nowrap;
            text-align: center;
            font-weight: bold;
          }
          .day-col {
            width: 50px;
            font-size: 8px;
            font-weight: bold;
            text-align: center;
          }
          .slot-cell { 
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 3px; 
            font-size: 8px; 
            white-space: normal; 
            word-wrap: break-word; 
            overflow-wrap: break-word;
            line-height: 1.2;
            min-width: 120px;
            text-align: center;
          }
          .subject-name { 
            font-weight: bold; 
            display: block; 
            word-break: break-word; 
            white-space: normal; 
            color: #000;
            margin-bottom: 2px;
            text-align: center;
          }
          .teacher-name, .class-name, .program-name { 
            display: block; 
            font-size: 7px; 
            color: #000;
            word-break: break-word;
            white-space: normal;
            text-align: center;
          }
          .room-name {
            display: block; 
            font-size: 7px; 
            color: #000;
            margin-top: 1px;
            text-align: center;
          }
          .sign-section {
            width: 100%;
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
          }
          .sign-block {
            display: inline-block;
            text-align: center;
          }
          .sign-line {
            width: 200px;
            border-bottom: 1px solid #000;
            margin: 30px auto 0 auto;
          }
        </style>
      </head>
      <body>
    `;

    const calculateTimeSlotSpan = (assignment) => {
      let startTime = assignment.timeSlot;
      if (startTime.includes('-')) {
        startTime = startTime.split('-')[0].trim();
      }
      const startIndex = timeSlots.findIndex(slot => slot.split('-')[0].trim() === startTime);
      if (startIndex === -1) {
        console.warn(`Invalid time slot for assignment ${assignment.id}: ${assignment.timeSlot}`);
        return { startIndex: -1, span: 1 };
      }
      const durationSlots = Math.ceil((assignment.duration || 30) / 30);
      const span = Math.max(1, durationSlots);
      return { startIndex, span };
    };

    if (type === 'teacher') {
      const teacherId = parseInt(id);
      const teacher = teacherMap[teacherId];
      if (!teacher) {
        console.error("Preview failed: Teacher not found for id:", teacherId);
        return { success: false, message: "Teacher not found." };
      }

      const teacherTimeAssignments = timeAssignments.filter(a => parseInt(a.teacherId) === teacherId);

      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Teacher Schedule</h1>
        <div style="text-align: center; font-size: 11px; margin-bottom: 15px;">${teacher.honorifics ? teacher.honorifics + ' ' : ''}${teacher.fullName}</div>`;

      const teacherGrid = {};
      dayOrder.forEach(day => {
        teacherGrid[day] = new Array(timeSlots.length).fill(null);
      });

      teacherTimeAssignments.forEach(assignment => {
        const { startIndex, span } = calculateTimeSlotSpan(assignment);
        if (startIndex !== -1) {
          for (let i = 0; i < span; i++) {
            const slotIndex = startIndex + i;
            if (slotIndex < timeSlots.length) {
              teacherGrid[assignment.day][slotIndex] = {
                assignment,
                isStart: i === 0,
                span: i === 0 ? span : 0
              };
            }
          }
        }
      });

      html += `<table>
        <thead>
          <tr>
            <th class="time-col">Time</th>`;

      dayOrder.forEach(day => {
        html += `<th>${day}</th>`;
      });

      html += `</tr>
        </thead>
        <tbody>`;

      timeSlots.forEach((timeSlot, timeIndex) => {
        html += `<tr>`;
        html += `<td class="time-col">${timeSlot}</td>`;

        dayOrder.forEach(day => {
          const cell = teacherGrid[day][timeIndex];

          if (!cell) {
            html += `<td class="slot-cell"></td>`;
          } else if (cell.span > 0) {
            const assignment = cell.assignment;
            const subject = subjectMap[assignment.subjectId];
            const className = classMap[assignment.classId]?.name || 'Unknown';
            const roomAssignment = roomAssignments.find(ra =>
              ra.scheduleFileId === assignment.scheduleFileId &&
              ra.subjectId === assignment.subjectId &&
              ra.teacherId === assignment.teacherId &&
              ra.classId === assignment.classId
            );
            const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';

            html += `<td class="slot-cell" rowspan="${cell.span}">`;
            html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
            html += `<span class="class-name">Class: ${className}</span>`;
            html += `<span class="room-name">Room: ${roomName}</span>`;
            html += `</td>`;
          }
        });

        html += `</tr>`;
      });

      html += `</tbody></table>`;

      html += `
        <div class="sign-section">
          <div class="sign-block">
            Prepared by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
            </div>
          </div>
          <div class="sign-block">
            Approved by:
            <div class="sign-line"></div>
            <div style="margin-top: 5px; font-weight: bold;">
              DR. CRISTITA B. TAN<br>VPAA
            </div>
          </div>
        </div>`;

    } else if (type === 'program') {
      const programsToExport = (id === 'all') ? programs : programs.filter(p => p.id === parseInt(id));
      if (!programsToExport || programsToExport.length === 0) {
        console.error("Preview failed: Program not found for id:", id);
        return { success: false, message: "Program not found." };
      }

      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Program Schedule</h1>`;

      let isFirstYearLevel = true;

      for (const program of programsToExport) {
        const programClasses = classes.filter(c => c.programId === program.id);
        const classIds = programClasses.map(c => c.id);
        const programTimeAssignments = timeAssignments.filter(a => classIds.includes(a.classId));

        const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', '7th Year', '8th Year', '9th Year', '10th Year'];

        for (const yearLevel of yearLevels) {
          const yearClasses = programClasses.filter(c => c.yearLevel === yearLevel);
          const yearClassIds = yearClasses.map(c => c.id);
          const yearAssignments = programTimeAssignments.filter(a => yearClassIds.includes(a.classId));

          if (yearAssignments.length === 0) continue;

          const pageBreakClass = isFirstYearLevel ? 'first-page' : 'new-page';
          html += `<div class="year-level-title ${pageBreakClass}">${yearLevel} - ${program.name}</div>`;
          isFirstYearLevel = false;

          const scheduleGrid = {};
          dayOrder.forEach(day => {
            scheduleGrid[day] = new Array(timeSlots.length).fill(null);
          });

          yearAssignments.forEach(assignment => {
            const { startIndex, span } = calculateTimeSlotSpan(assignment);
            if (startIndex !== -1) {
              for (let i = 0; i < span; i++) {
                const slotIndex = startIndex + i;
                if (slotIndex < timeSlots.length) {
                  scheduleGrid[assignment.day][slotIndex] = {
                    assignment,
                    isStart: i === 0,
                    span: i === 0 ? span : 0
                  };
                }
              }
            }
          });

          html += `<table>
            <thead>
              <tr>
                <th class="time-col">Time</th>`;

          dayOrder.forEach(day => {
            html += `<th>${day}</th>`;
          });

          html += `</tr>
            </thead>
            <tbody>`;

          timeSlots.forEach((timeSlot, timeIndex) => {
            html += `<tr>`;
            html += `<td class="time-col">${timeSlot}</td>`;

            dayOrder.forEach(day => {
              const cell = scheduleGrid[day][timeIndex];

              if (!cell) {
                html += `<td class="slot-cell"></td>`;
              } else if (cell.span > 0) {
                const assignment = cell.assignment;
                const subject = subjectMap[assignment.subjectId];
                const teacher = teacherMap[assignment.teacherId];
                const className = classMap[assignment.classId]?.name || 'Unknown';
                const roomAssignment = roomAssignments.find(ra =>
                  ra.scheduleFileId === assignment.scheduleFileId &&
                  ra.subjectId === assignment.subjectId &&
                  ra.teacherId === assignment.teacherId &&
                  ra.classId === assignment.classId
                );
                const roomName = roomAssignment ? (roomMap[roomAssignment.roomId]?.name || 'N/A') : 'N/A';

                html += `<td class="slot-cell" rowspan="${cell.span}">`;
                html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
                html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
                html += `<span class="room-name">Room: ${roomName}</span>`;
                html += `</td>`;
              }
            });

            html += `</tr>`;
          });

          html += `</tbody></table>`;

          html += `
            <div class="sign-section">
              <div class="sign-block">
                Prepared by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
                </div>
              </div>
              <div class="sign-block">
                Approved by:
                <div class="sign-line"></div>
                <div style="margin-top: 5px; font-weight: bold;">
                  DR. CRISTITA B. TAN<br>VPAA
                </div>
              </div>
            </div>`;
        }
      }
    } else if (type === 'room') {
      const roomsToExport = (id === 'all') ? rooms : rooms.filter(r => r.id === parseInt(id));
      if (!roomsToExport || roomsToExport.length === 0) {
        console.error("Preview failed: Room not found for id:", id);
        return { success: false, message: "Room not found." };
      }

      html += `
        <div class="institution">GOLDEN GATE COLLEGES</div>
        <h1>Room Schedule</h1>`;

      let isFirstRoom = true;

      for (const room of roomsToExport) {
        const roomTimeAssignments = timeAssignments.filter(ta =>
          roomAssignments.some(ra =>
            ra.roomId === room.id &&
            ra.scheduleFileId === ta.scheduleFileId &&
            ra.subjectId === ta.subjectId &&
            ra.teacherId === ta.teacherId &&
            ra.classId === ta.classId
          )
        );

        if (roomTimeAssignments.length === 0) {
          console.warn(`No assignments found for room: ${room.name}`);
          continue;
        }

        const pageBreakClass = isFirstRoom ? 'first-page' : 'new-page';
        html += `<div class="room-title ${pageBreakClass}">${room.name} </div>`;
        isFirstRoom = false;

        const roomGrid = {};
        dayOrder.forEach(day => {
          roomGrid[day] = new Array(timeSlots.length).fill(null);
        });

        roomTimeAssignments.forEach(assignment => {
          const { startIndex, span } = calculateTimeSlotSpan(assignment);
          if (startIndex !== -1) {
            for (let i = 0; i < span; i++) {
              const slotIndex = startIndex + i;
              if (slotIndex < timeSlots.length) {
                roomGrid[assignment.day][slotIndex] = {
                  assignment,
                  isStart: i === 0,
                  span: i === 0 ? span : 0
                };
              }
            }
          }
        });

        html += `<table>
          <thead>
            <tr>
              <th class="time-col">Time</th>`;

        dayOrder.forEach(day => {
          html += `<th>${day}</th>`;
        });

        html += `</tr>
          </thead>
          <tbody>`;

        timeSlots.forEach((timeSlot, timeIndex) => {
          html += `<tr>`;
          html += `<td class="time-col">${timeSlot}</td>`;

          dayOrder.forEach(day => {
            const cell = roomGrid[day][timeIndex];

            if (!cell) {
              html += `<td class="slot-cell"></td>`;
            } else if (cell.span > 0) {
              const assignment = cell.assignment;
              const subject = subjectMap[assignment.subjectId];
              const teacher = teacherMap[assignment.teacherId];
              const classObj = classMap[assignment.classId];
              const className = classObj?.name || 'Unknown';
              const program = classObj ? programMap[classObj.programId] : null;
              const programName = program?.name || 'Unknown';

              html += `<td class="slot-cell" rowspan="${cell.span}">`;
              html += `<span class="subject-name">${subject?.name || 'Unknown'}</span>`;
              html += `<span class="teacher-name">${teacher?.honorifics ? teacher.honorifics + ' ' : ''}${teacher?.fullName || 'TBA'}</span>`;
              html += `<span class="class-name">Class: ${className}</span>`;
              html += `<span class="program-name">Program: ${programName}</span>`;
              html += `</td>`;
            }
          });

          html += `</tr>`;
        });

        html += `</tbody></table>`;

        html += `
          <div class="sign-section">
            <div class="sign-block">
              Prepared by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                ENGR. REYNALDO C. DIMAYACYAC<br>Dean, College of Engineering Technology
              </div>
            </div>
            <div class="sign-block">
              Approved by:
              <div class="sign-line"></div>
              <div style="margin-top: 5px; font-weight: bold;">
                DR. CRISTITA B. TAN<br>VPAA
              </div>
            </div>
          </div>`;
      }

      if (isFirstRoom) {
        html += `<div style="text-align: center; font-size: 11px; margin-top: 15px;">No assignments found for selected room(s).</div>`;
      }
    } else {
      console.error("Preview failed: Invalid export type:", type);
      return { success: false, message: "Invalid export type. Use 'teacher', 'program', or 'room'." };
    }

    html += `</body></html>`;

    return { success: true, html: html };

  } catch (err) {
    console.error("Preview error:", err.message || err);
    return { success: false, message: "Preview failed: " + (err.message || err) };
  }
});

ipcMain.handle("get-users", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, username, role FROM users`, (err, rows) => {
      if (err) {
        console.error("Get users error:", err.message);
        reject(err.message);
      } else {
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle("save-user", (event, data) => {
  return new Promise((resolve, reject) => {
    if (!data.username || !data.password) {
      resolve({ success: false, message: "Username and password are required" });
      return;
    }
    if (data.id) {
      db.run(
        `UPDATE users SET username=?, password=?, role=? WHERE id=?`,
        [data.username, data.password, data.role, data.id],
        (err) => {
          if (err) {
            console.error("Update user error:", err.message);
            reject(err.message);
          } else {
            resolve({ success: true });
          }
        }
      );
    } else {
      db.get(
        `SELECT * FROM users WHERE username=?`,
        [data.username],
        (err, row) => {
          if (err) {
            console.error("Check user error:", err.message);
            reject(err.message);
            return;
          }
          if (row) {
            resolve({ success: false, message: "Username already exists" });
            return;
          }
          db.run(
            `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
            [data.username, data.password, data.role],
            function (err) {
              if (err) {
                console.error("Insert user error:", err.message);
                reject(err.message);
              } else {
                resolve({ success: true, id: this.lastID });
              }
            }
          );
        }
      );
    }
  });
});

ipcMain.handle("delete-user", (event, id) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM users WHERE id=?`, [id], (err) => {
      if (err) {
        console.error("Delete user error:", err.message);
        reject(err.message);
      } else {
        resolve({ success: true });
      }
    });
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
