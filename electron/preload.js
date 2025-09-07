const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  login: (data) => ipcRenderer.invoke("login", data),
});
