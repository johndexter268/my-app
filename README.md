# Class Scheduling System

A desktop-based **Class Scheduling System** for **Golden Gate Colleges**, developed as a capstone project. The system is designed to streamline the process of creating, managing, and finalizing class schedules, reducing manual workload and minimizing scheduling conflicts.

Built with:

* ⚛️ **React** – Component-based front-end framework
* ⚡ **Vite** – Fast development environment and build tool
* 🎨 **Tailwind CSS** – Utility-first CSS framework for styling
* 🖥️ **Electron** – Cross-platform desktop app framework
* 📦 **NPM** – Package manager for dependencies
* 🗄️ **SQLite3** – Lightweight relational database for local data storage

---

## ✨ Features

### 🔑 Authentication

* Secure login system for users.

### 📂 Navigations

* **File** – Manage files and sessions.
* **Home** – Dashboard with quick access to core functions.
* **Scheduling Tool**

  * *Manage Data* – Input and organize class, faculty, and room information.
  * *Assigning* – Assign faculty and classrooms to classes with conflict checks.
* **View** – Toggle different views and layouts.
* **Help** – Access help documentation and shortcut keys.

### 📊 Scheduling

* Automated class scheduling with conflict detection.
* Support for multiple programs.
* Real-time updates when assigning classes.

### 🛠️ Tools & Usability

* Modern UI with **Tailwind** styling.
* Lightweight, responsive, and desktop-friendly via **Electron**.
* Local data persistence using **SQLite3**.

---

## ⚙️ Setup Instructions

Follow these steps to set up the system locally:

### 1. Clone the repository

```bash
git clone https://github.com/johndexter268/my-app.git
cd my-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app in development mode

```bash
npm run dev
```

### 4. Run Electron with React + Vite

```bash
npm run dev
```

*(Make sure you’ve set up scripts for `electron:dev` in `package.json`.)*

### 5. Build the app for production

```bash
npm run build
npm run electron:build
```

---

## 🗄️ Database Setup (SQLite3)

1. The database file (`database.sqlite`) is automatically generated when the app is first run.
2. Use the included migrations or schema file (`/db/schema.sql`) to initialize the structure.

---

## 📖 Help & Shortcuts

* **Ctrl+N** – New File
* **Ctrl+S** – Save
* **Ctrl+Shift+S** – Save As
* **Ctrl+E** – Export
* **Ctrl+P** – Print
* **Ctrl+H** – Help
* **Ctrl+W** – Close File
* **Ctrl++ / Ctrl+=** – Zoom In
* **Ctrl+-** – Zoom Out
* **Ctrl+F / F11** – Full Screen
* **Escape** – Close modal

---

## 👨‍💻 Developers

* **Umali, Allan Joseph R.**
* **Mendoza, Angelo R.**
* **Rementilla, Tai Lee D.**

Capstone Project – Bachelor of Science in Information Technology
Golden Gate Colleges

---
