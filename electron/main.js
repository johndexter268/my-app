const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const isDev = require("electron-is-dev");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");

let mainWindow;
let db;

// Store multiple open files with their IDs
const openFiles = new Map(); // Map<fileId, fileData>

// ---------------- DATABASE ----------------
function initializeDatabase() {
  db = new sqlite3.Database(path.join(app.getPath("userData"), "app.db"), (err) => {
    if (err) console.error("DB Error:", err.message);
    else console.log("SQLite DB ready");
  });

  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT
    )`);

    // Create schedule_files table with updatedAt
    db.run(`CREATE TABLE IF NOT EXISTS schedule_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      semester TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create teachers table
    db.run(`CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      honorifics TEXT,
      color TEXT NOT NULL
    )`);

    // Create programs table
    db.run(`CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      years INTEGER NOT NULL
    )`);

    // Create subjects table
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

    // Create rooms table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      capacity INTEGER NOT NULL
    )`);

    // Create classes table
    db.run(`CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      students INTEGER NOT NULL,
      programId INTEGER NOT NULL,
      yearLevel TEXT NOT NULL,
      FOREIGN KEY (programId) REFERENCES programs(id)
    )`);

    // Create subject_assignments table
    db.run(`CREATE TABLE IF NOT EXISTS subject_assignments (
      id TEXT PRIMARY KEY,
      scheduleFileId INTEGER,
      subjectId INTEGER,
      teacherId INTEGER,
      FOREIGN KEY(scheduleFileId) REFERENCES schedule_files(id),
      FOREIGN KEY(subjectId) REFERENCES subjects(id),
      FOREIGN KEY(teacherId) REFERENCES teachers(id)
    )`);

    // Create time_assignments table with teacherId
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

    // Create room_assignments table with teacherId
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

    // Create default admin user
    db.get(`SELECT * FROM users WHERE username=?`, ["admin"], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ["admin", "password"]);
        console.log("Default admin user created");
      }
    });

    // Migration for adding teacherId if not present (for existing databases)
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Class Scheduling System",
    icon: path.join(__dirname, "app-icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? "http://localhost:5173/#/"
    : `file://${path.join(__dirname, "../dist/index.html")}#/`;

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

// ---------------- IPC HANDLERS ----------------
ipcMain.handle("login", (event, { username, password }) => {
  return new Promise((resolve, reject) => {
    if (!username || !password) {
      resolve({ success: false, message: "Username and password are required" });
      return;
    }
    db.get(
      `SELECT * FROM users WHERE username=? AND password=?`,
      [username, password],
      (err, row) => {
        if (err) {
          console.error("Login error:", err.message);
          reject(err.message);
        } else if (row) {
          resolve({ success: true, message: "Login success!" });
        } else {
          resolve({ success: false, message: "Invalid credentials" });
        }
      }
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
  if (!file || !file.id) {
    return { success: false, message: "Invalid file data" };
  }
  openFiles.set(file.id, { ...file, updatedAt: file.updatedAt || new Date().toISOString() });
  return { success: true, message: "Current file set", file };
});

ipcMain.handle("get-current-file", () => {
  return { success: true, files: Array.from(openFiles.values()) };
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

ipcMain.handle("print-file", async (event, args = {}) => {
  const { fileId, type, id } = args;
  console.log("Print requested - fileId:", fileId, "openFiles keys:", Array.from(openFiles.keys()));
  if (!fileId || !openFiles.has(fileId)) {
    console.log("Print failed: No valid file selected. openFiles:", openFiles);
    return { success: false, message: "No valid file selected to print." };
  }
  try {
    const file = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM schedule_files WHERE id=?`, [fileId], (err, row) => {
        if (err) reject(err.message);
        else resolve(row);
      });
    });
    const [timeAssignments, subjects, teachers, classes, rooms, programs, roomAssignments] = await Promise.all([
      new Promise((res) => db.all(`SELECT * FROM time_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM subjects`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM teachers`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM classes`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM rooms`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM programs`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM room_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => res(e ? [] : r))),
    ]);

    let htmlContent = `
      <html>
        <head>
          <style>
            @page { size: landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; font-size: 10px; }
            h1 { text-align: center; font-size: 14px; margin: 10px 0; }
            h2 { font-size: 12px; margin: 15px 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
            th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; font-size: 10px; }
            .time-slot { font-size: 9px; padding: 2px; margin: 2px; border-radius: 3px; white-space: normal; word-wrap: break-word; }
            .time-col { width: 80px; }
            .day-col { width: calc((100% - 80px) / 6); }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <h1>Schedule: ${file.name} (${file.semester} ${file.academic_year})</h1>
    `;

    const times = [
      '7:00 AM-8:00 AM', '8:00 AM-9:00 AM', '9:00 AM-10:00 AM', '10:00 AM-11:00 AM', '11:00 AM-12:00 PM',
      '12:00 PM-1:00 PM', '1:00 PM-2:00 PM', '2:00 PM-3:00 PM', '3:00 PM-4:00 PM', '4:00 PM-5:00 PM',
      '5:00 PM-6:00 PM', '6:00 PM-7:00 PM'
    ];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (type === 'teacher') {
      const teacher = teachers.find(t => t.id === id);
      if (!teacher) {
        return { success: false, message: "Teacher not found." };
      }
      htmlContent += `<h2>Schedule for ${teacher.fullName}</h2>`;
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th class="time-col">Time</th>
              ${days.map(day => `<th class="day-col">${day}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
      `;
      times.forEach(time => {
        htmlContent += `<tr><td class="time-col">${time}</td>`;
        days.forEach(day => {
          const timeAss = timeAssignments.filter(a => a.teacherId === id && a.day === day && a.timeSlot === time);
          htmlContent += `<td>`;
          timeAss.forEach(a => {
            const subject = subjects.find(s => s.id === a.subjectId)?.name || "Unknown";
            const cls = classes.find(c => c.id === a.classId)?.name || "Unassigned";
            const roomAss = roomAssignments.find(ra => ra.scheduleFileId === a.scheduleFileId && ra.subjectId === a.subjectId && ra.classId === a.classId);
            const room = roomAss ? (rooms.find(r => r.id === roomAss.roomId)?.name || "Unassigned") : "Unassigned";
            htmlContent += `<div class="time-slot" style="background-color: ${teacher.color};">${subject}<br>${cls}<br>${room}</div>`;
          });
          htmlContent += `</td>`;
        });
        htmlContent += `</tr>`;
      });
      htmlContent += `</tbody></table>`;
    } else if (type === 'program') {
      const program = programs.find(p => p.id === id);
      if (!program) {
        return { success: false, message: "Program not found." };
      }
      const classesByYear = {};
      classes.filter(cls => cls.programId === id).forEach(cls => {
        if (!classesByYear[cls.yearLevel]) {
          classesByYear[cls.yearLevel] = [];
        }
        classesByYear[cls.yearLevel].push(cls);
      });

      for (const yearLevel in classesByYear) {
        const classIds = classesByYear[yearLevel].map(cls => cls.id);
        htmlContent += `
          <div class="page-break"></div>
          <h2>${program.name} - ${yearLevel}</h2>
          <table>
            <thead>
              <tr>
                <th class="time-col">Time</th>
                ${days.map(day => `<th class="day-col">${day}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
        `;
        times.forEach(time => {
          htmlContent += `<tr><td class="time-col">${time}</td>`;
          days.forEach(day => {
            const timeAss = timeAssignments.filter(a => classIds.includes(a.classId) && a.day === day && a.timeSlot === time);
            htmlContent += `<td>`;
            timeAss.forEach(a => {
              const subject = subjects.find(s => s.id === a.subjectId)?.name || "Unknown";
              const teacher = teachers.find(t => t.id === a.teacherId)?.fullName || "Unassigned";
              const roomAss = roomAssignments.find(ra => ra.scheduleFileId === a.scheduleFileId && ra.subjectId === a.subjectId && ra.classId === a.classId);
              const room = roomAss ? (rooms.find(r => r.id === roomAss.roomId)?.name || "Unassigned") : "Unassigned";
              const teacherColor = teachers.find(t => t.id === a.teacherId)?.color || "#ffffff";
              htmlContent += `<div class="time-slot" style="background-color: ${teacherColor};">${subject}<br>${teacher}<br>${room}</div>`;
            });
            htmlContent += `</td>`;
          });
          htmlContent += `</tr>`;
        });
        htmlContent += `</tbody></table>`;
      }
    } else {
      return { success: false, message: "Invalid export type. Use 'teacher' or 'program'." };
    }

    htmlContent += `</body></html>`;

    const tempFilePath = path.join(app.getPath("temp"), `schedule_${fileId}.html`);
    fs.writeFileSync(tempFilePath, htmlContent);

    const printWindow = new BrowserWindow({ show: false });
    printWindow.loadFile(tempFilePath);
    printWindow.webContents.on("did-finish-load", () => {
      printWindow.webContents.printToPDF({ landscape: true }).then(data => {
        const pdfPath = path.join(app.getPath("temp"), `schedule_${fileId}.pdf`);
        fs.writeFileSync(pdfPath, data);
        printWindow.close();
        fs.unlinkSync(tempFilePath);
        mainWindow.webContents.send("print-complete", { pdfPath });
      }).catch(error => {
        printWindow.close();
        fs.unlinkSync(tempFilePath);
        throw new Error("PDF generation failed: " + error.message);
      });
    });
    return { success: true, message: "Generating PDF for print." };
  } catch (error) {
    console.error("Print error:", error.message);
    return { success: false, message: "Print failed: " + error.message };
  }
});

ipcMain.handle("export-file", async (event, args = {}) => {
  const { fileId, type, id, format = 'pdf' } = args;
  console.log("Export requested - fileId:", fileId, "openFiles keys:", Array.from(openFiles.keys()));
  if (!fileId || !openFiles.has(fileId)) {
    console.log("Export failed: No valid file selected. openFiles:", openFiles);
    return { success: false, message: "No valid file selected to export." };
  }
  try {
    const defaultPath = format === 'pdf' ? `schedule_${fileId}.pdf` : `schedule_${fileId}.json`;
    const filters = format === 'pdf' ? [{ name: "PDF Files", extensions: ["pdf"] }] : [{ name: "JSON Files", extensions: ["json"] }];
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath, filters });
    if (canceled || !filePath) {
      return { success: false, message: "Export cancelled." };
    }

    const file = await new Promise((resolve, reject) => {
      db.get(`SELECT * FROM schedule_files WHERE id=?`, [fileId], (err, row) => {
        if (err) reject(err.message);
        else resolve(row);
      });
    });
    const [timeAssignments, subjects, teachers, classes, rooms, programs, roomAssignments] = await Promise.all([
      new Promise((res) => db.all(`SELECT * FROM time_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM subjects`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM teachers`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM classes`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM rooms`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM programs`, (e, r) => res(e ? [] : r))),
      new Promise((res) => db.all(`SELECT * FROM room_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => res(e ? [] : r))),
    ]);

    if (format === 'json') {
      const subjectAssignments = await new Promise((res) => db.all(`SELECT * FROM subject_assignments WHERE scheduleFileId=?`, [fileId], (e, r) => res(e ? [] : r)));
      const exportData = {
        file: { ...file, updatedAt: file.updatedAt || new Date().toISOString() },
        assignments: [
          ...subjectAssignments.map(a => ({...a, type: 'subject'})),
          ...timeAssignments.map(a => ({...a, type: 'time'})),
          ...roomAssignments.map(a => ({...a, type: 'room'}))
        ],
        teachers,
        subjects,
        rooms,
        classes,
        programs,
      };
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
      return { success: true, message: "File exported as JSON!" };
    }

    // PDF Export
    let htmlContent = `
      <html>
        <head>
          <style>
            @page { size: landscape; margin: 1cm; }
            body { font-family: Arial, sans-serif; font-size: 10px; }
            h1 { text-align: center; font-size: 14px; margin: 10px 0; }
            h2 { font-size: 12px; margin: 15px 0 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: auto; }
            th, td { border: 1px solid #ddd; padding: 4px; text-align: left; vertical-align: top; }
            th { background-color: #f2f2f2; font-weight: bold; font-size: 10px; }
            .time-slot { font-size: 9px; padding: 2px; margin: 2px; border-radius: 3px; white-space: normal; word-wrap: break-word; }
            .time-col { width: 80px; }
            .day-col { width: calc((100% - 80px) / 6); }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <h1>Schedule: ${file.name} (${file.semester} ${file.academic_year})</h1>
    `;

    const times = [
      '7:00 AM-8:00 AM', '8:00 AM-9:00 AM', '9:00 AM-10:00 AM', '10:00 AM-11:00 AM', '11:00 AM-12:00 PM',
      '12:00 PM-1:00 PM', '1:00 PM-2:00 PM', '2:00 PM-3:00 PM', '3:00 PM-4:00 PM', '4:00 PM-5:00 PM',
      '5:00 PM-6:00 PM', '6:00 PM-7:00 PM'
    ];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    if (type === 'teacher') {
      const teacher = teachers.find(t => t.id === id);
      if (!teacher) {
        return { success: false, message: "Teacher not found." };
      }
      htmlContent += `<h2>Schedule for ${teacher.fullName}</h2>`;
      htmlContent += `
        <table>
          <thead>
            <tr>
              <th class="time-col">Time</th>
              ${days.map(day => `<th class="day-col">${day}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
      `;
      times.forEach(time => {
        htmlContent += `<tr><td class="time-col">${time}</td>`;
        days.forEach(day => {
          const timeAss = timeAssignments.filter(a => a.teacherId === id && a.day === day && a.timeSlot === time);
          htmlContent += `<td>`;
          timeAss.forEach(a => {
            const subject = subjects.find(s => s.id === a.subjectId)?.name || "Unknown";
            const cls = classes.find(c => c.id === a.classId)?.name || "Unassigned";
            const roomAss = roomAssignments.find(ra => ra.scheduleFileId === a.scheduleFileId && ra.subjectId === a.subjectId && ra.classId === a.classId);
            const room = roomAss ? (rooms.find(r => r.id === roomAss.roomId)?.name || "Unassigned") : "Unassigned";
            htmlContent += `<div class="time-slot" style="background-color: ${teacher.color};">${subject}<br>${cls}<br>${room}</div>`;
          });
          htmlContent += `</td>`;
        });
        htmlContent += `</tr>`;
      });
      htmlContent += `</tbody></table>`;
    } else if (type === 'program') {
      const program = programs.find(p => p.id === id);
      if (!program) {
        return { success: false, message: "Program not found." };
      }
      const classesByYear = {};
      classes.filter(cls => cls.programId === id).forEach(cls => {
        if (!classesByYear[cls.yearLevel]) {
          classesByYear[cls.yearLevel] = [];
        }
        classesByYear[cls.yearLevel].push(cls);
      });

      for (const yearLevel in classesByYear) {
        const classIds = classesByYear[yearLevel].map(cls => cls.id);
        htmlContent += `
          <div class="page-break"></div>
          <h2>${program.name} - ${yearLevel}</h2>
          <table>
            <thead>
              <tr>
                <th class="time-col">Time</th>
                ${days.map(day => `<th class="day-col">${day}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
        `;
        times.forEach(time => {
          htmlContent += `<tr><td class="time-col">${time}</td>`;
          days.forEach(day => {
            const timeAss = timeAssignments.filter(a => classIds.includes(a.classId) && a.day === day && a.timeSlot === time);
            htmlContent += `<td>`;
            timeAss.forEach(a => {
              const subject = subjects.find(s => s.id === a.subjectId)?.name || "Unknown";
              const teacher = teachers.find(t => t.id === a.teacherId)?.fullName || "Unassigned";
              const roomAss = roomAssignments.find(ra => ra.scheduleFileId === a.scheduleFileId && ra.subjectId === a.subjectId && ra.classId === a.classId);
              const room = roomAss ? (rooms.find(r => r.id === roomAss.roomId)?.name || "Unassigned") : "Unassigned";
              const teacherColor = teachers.find(t => t.id === a.teacherId)?.color || "#ffffff";
              htmlContent += `<div class="time-slot" style="background-color: ${teacherColor};">${subject}<br>${teacher}<br>${room}</div>`;
            });
            htmlContent += `</td>`;
          });
          htmlContent += `</tr>`;
        });
        htmlContent += `</tbody></table>`;
      }
    } else {
      return { success: false, message: "Invalid export type. Use 'teacher' or 'program'." };
    }

    htmlContent += `</body></html>`;

    const tempFilePath = path.join(app.getPath("temp"), `export_${fileId}.html`);
    fs.writeFileSync(tempFilePath, htmlContent);

    const exportWindow = new BrowserWindow({ show: false });
    exportWindow.loadFile(tempFilePath);
    return new Promise((resolve, reject) => {
      exportWindow.webContents.on("did-finish-load", () => {
        exportWindow.webContents.printToPDF({ landscape: true }).then(data => {
          fs.writeFileSync(filePath, data);
          exportWindow.close();
          fs.unlinkSync(tempFilePath);
          resolve({ success: true, message: "File exported as PDF!" });
        }).catch(error => {
          exportWindow.close();
          fs.unlinkSync(tempFilePath);
          reject(new Error("PDF generation failed: " + error.message));
        });
      });
    });
  } catch (error) {
    console.error("Export error:", error.message);
    return { success: false, message: "Export failed: " + error.message };
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

ipcMain.handle("get-classes", () => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM classes`, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows || []);
    });
  });
});

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
    if (!data.scheduleFileId || !data.subjectId || !data.teacherId || !data.classId || !data.day || !data.timeSlot || !data.duration) {
      resolve({ success: false, message: "All fields are required, including teacher" });
      return;
    }
    const id = uuidv4();
    db.run(
      `INSERT INTO time_assignments (id, scheduleFileId, subjectId, teacherId, classId, day, timeSlot, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.scheduleFileId, data.subjectId, data.teacherId, data.classId, data.day, data.timeSlot, data.duration],
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
    if (!data.scheduleFileId || !data.subjectId || !data.teacherId || !data.classId || !data.roomId) {
      resolve({ success: false, message: "All fields are required, including teacher" });
      return;
    }
    const id = uuidv4();
    db.run(
      `INSERT INTO room_assignments (id, scheduleFileId, subjectId, teacherId, classId, roomId) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.scheduleFileId, data.subjectId, data.teacherId, data.classId, data.roomId],
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

ipcMain.handle("reload-window", () => {
  if (mainWindow) {
    const startUrl = isDev
      ? "http://localhost:5173/#/"
      : `file://${path.join(__dirname, "../dist/index.html")}#/`;
    mainWindow.loadURL(startUrl);
    return { success: true, message: "Window reloaded" };
  }
  return { success: false, message: "No main window available" };
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