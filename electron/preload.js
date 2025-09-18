// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  login: (data) => ipcRenderer.invoke("login", data),
  newScheduleFile: (data) => ipcRenderer.invoke("new-schedule-file", data),
  getCurrentFile: () => ipcRenderer.invoke("get-current-file"),
  saveFile: (data) => ipcRenderer.invoke("save-file", data),
  saveAsFile: (data) => ipcRenderer.invoke("save-as-file", data),
  exportFile: (args) => ipcRenderer.invoke("export-file", args),
  printFile: (args) => ipcRenderer.invoke("print-file", args),
  getAllScheduleFiles: () => ipcRenderer.invoke("get-all-schedule-files"),
  deleteScheduleFile: (id) => ipcRenderer.invoke("delete-schedule-file", id),
  archiveScheduleFile: (id) => ipcRenderer.invoke("archive-schedule-file", id),
  setCurrentFile: (file) => ipcRenderer.invoke("set-current-file", file),
  closeCurrentFile: (fileId) => ipcRenderer.invoke("close-current-file", fileId),
  
  // Data management
  getTeachers: () => ipcRenderer.invoke("get-teachers"),
  saveTeacher: (data) => ipcRenderer.invoke("save-teacher", data),
  deleteTeacher: (id) => ipcRenderer.invoke("delete-teacher", id),
  
  getSubjects: () => ipcRenderer.invoke("get-subjects"),
  saveSubject: (data) => ipcRenderer.invoke("save-subject", data),
  deleteSubject: (id) => ipcRenderer.invoke("delete-subject", id),
  
  getRooms: () => ipcRenderer.invoke("get-rooms"),
  saveRoom: (data) => ipcRenderer.invoke("save-room", data),
  deleteRoom: (id) => ipcRenderer.invoke("delete-room", id),
  
  getClasses: () => ipcRenderer.invoke("get-classes"),
  saveClass: (data) => ipcRenderer.invoke("save-class", data),
  deleteClass: (id) => ipcRenderer.invoke("delete-class", id),
  
  getPrograms: () => ipcRenderer.invoke("get-programs"),
  saveProgram: (data) => ipcRenderer.invoke("save-program", data),
  deleteProgram: (id) => ipcRenderer.invoke("delete-program", id),
  
  // Assignment management
  getAssignments: (fileId) => ipcRenderer.invoke("get-assignments", fileId),
  assignTeacherToSubject: (data) => ipcRenderer.invoke("assign-teacher-to-subject", data),
  assignTimeSlot: (data) => ipcRenderer.invoke("assign-time-slot", data),
  assignRoom: (data) => ipcRenderer.invoke("assign-room", data),
  deleteAssignment: (id) => ipcRenderer.invoke("delete-assignment", id),
  updateTeacherSubjectAssignment: (data) => ipcRenderer.invoke("update-teacher-subject-assignment", data),
  updateTimeSlotAssignment: (data) => ipcRenderer.invoke("update-time-slot-assignment", data),
  updateRoomAssignment: (data) => ipcRenderer.invoke("update-room-assignment", data),
  
  // Utility
  reloadWindow: () => ipcRenderer.invoke("reload-window"),
});