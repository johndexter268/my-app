import { FiPlus, FiSave, FiEdit, FiDownload, FiX, FiPrinter, FiHelpCircle, FiZoomIn, FiZoomOut, FiCalendar } from "react-icons/fi";
import { MdOutlineAssignmentTurnedIn } from "react-icons/md";
import { GrExpand } from "react-icons/gr";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from "./Modal";
import { FaSpinner } from "react-icons/fa";

export default function Toolbar() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showViewTools, setShowViewTools] = useState(false);
  const [fileToCloseId, setFileToCloseId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const MAX_OPEN_FILES = 5;
  const [formData, setFormData] = useState({
    name: "",
    academic_year: "",
    semester: "",
  });
  const [exportData, setExportData] = useState({
    fileId: "",
    type: "program",
    id: "",
    format: "pdf",
  });
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [lastActiveFileId, setLastActiveFileId] = useState(null);
  const [fullScheduleActive, setFullScheduleActive] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(new Set());
  const [teachers, setTeachers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [rooms, setRooms] = useState([]); // New state for rooms
  const navigate = useNavigate();
  const location = useLocation();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const userRole = localStorage.getItem('userRole') || 'user';

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { ctrlKey, metaKey, key, shiftKey } = event;
      const isModifier = ctrlKey || metaKey;

      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        if (key === 'Escape') {
          closeAllModals();
        }
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        closeAllModals();
        return;
      }

      if (isModifier) {
        switch (key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            if (userRole !== 'view') handleNew(); // Changed from 'admin' check to exclude 'view'
            break;
          case 's':
            event.preventDefault();
            if (userRole !== 'view') { // Changed from 'admin' check to exclude 'view'
              if (shiftKey) {
                handleSaveAs();
              } else {
                handleSave();
              }
            }
            break;
          case 'e':
            event.preventDefault();
            if (userRole !== 'view') handleExport(); // Changed from 'admin' check to exclude 'view'
            break;
          case 'p':
            event.preventDefault();
            if (userRole !== 'view') handlePrint(); // Changed from 'admin' check to exclude 'view'
            break;
          case 'h':
            event.preventDefault();
            navigate("/help");
            break;
          case 'w':
            event.preventDefault();
            if (userRole !== 'view' && activeFileId) { // Changed from 'admin' check to exclude 'view'
              handleCloseFile(activeFileId);
            }
            break;
          case '=':
          case '+':
            if (showViewTools && location.pathname === '/home') {
              event.preventDefault();
              handleZoomIn();
            }
            break;
          case '-':
            if (showViewTools && location.pathname === '/home') {
              event.preventDefault();
              handleZoomOut();
            }
            break;
          case 'f':
            if (showViewTools && location.pathname === '/home') {
              event.preventDefault();
              handleFullScreen();
            }
            break;
        }
      }

      if (key === 'F11' && showViewTools && location.pathname === '/home') {
        event.preventDefault();
        handleFullScreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    showViewTools,
    location.pathname,
    activeFileId,
    navigate,
    showNewModal,
    showSaveAsModal,
    showCloseConfirmModal,
    showExportModal,
    showPrintModal,
    userRole
  ]);

  const closeAllModals = () => {
    setShowNewModal(false);
    setShowSaveAsModal(false);
    setShowCloseConfirmModal(false);
    setShowExportModal(false);
    setShowPrintModal(false);
    setShowPreviewModal(false);
    setFormData({ name: "", academic_year: "", semester: "" });
    setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
    setFileToCloseId(null);
    setIsExporting(false);
    setIsPrinting(false);
    setIsGeneratingPreview(false);
    setPreviewHtml("");
  };

  useEffect(() => {
    const fetchCurrentFiles = async () => {
      try {
        const { files } = await window.api.getCurrentFile();
        setOpenFiles(files || []);
        if (files && files.length > 0 && !fullScheduleActive) {
          const currentFile = files.find(f => f.id === activeFileId) || files[0];
          setActiveFileId(currentFile.id);
          setLastActiveFileId(currentFile.id);
          window.dispatchEvent(new CustomEvent('fileSelected', { detail: currentFile }));
        }
        const [teachersData, programsData, roomsData] = await Promise.all([
          window.api.getTeachers(),
          window.api.getPrograms(),
          window.api.getRooms(), // Fetch rooms
        ]);
        setTeachers(teachersData || []);
        setPrograms(programsData || []);
        setRooms(roomsData || []); // Set rooms state
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error fetching data: " + error.message);
      }
    };
    fetchCurrentFiles();

    const handleFileSelected = async (event) => {
      const file = event.detail;

      if (openFiles.length >= MAX_OPEN_FILES && !openFiles.some(f => f.id === file.id)) {
        alert(`You can only open up to ${MAX_OPEN_FILES} schedule files at a time. Please close one before opening another.`);
        return;
      }

      setLoadingFiles((prev) => new Set([...prev, file.id]));
      try {
        await window.api.setCurrentFile(file);
        const assignments = await window.api.getAssignments(file.id);
        setOpenFiles((prev) => {
          const exists = prev.some((f) => f.id === file.id);
          if (!exists) {
            return [...prev, { ...file, hasUnsavedChanges: false, assignments }];
          }
          return prev.map((f) =>
            f.id === file.id ? { ...f, assignments, hasUnsavedChanges: false } : f
          );
        });
        if (!fullScheduleActive) {
          setActiveFileId(file.id);
          window.activeFileId = file.id;
          setLastActiveFileId(file.id);
        }
      } catch (error) {
        console.error("Error loading file assignments:", error);
        alert("Error loading file assignments: " + error.message);
      } finally {
        setLoadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(file.id);
          return newSet;
        });
      }
    };

    const handleToggleViewTools = () => {
      setShowViewTools((prev) => !prev);
    };

    window.addEventListener('fileSelected', handleFileSelected);
    window.addEventListener('toggleViewTools', handleToggleViewTools);
    return () => {
      window.removeEventListener('fileSelected', handleFileSelected);
      window.removeEventListener('toggleViewTools', handleToggleViewTools);
    };
  }, [fullScheduleActive, activeFileId]);

  const handleTabClick = (fileId) => {
    const file = openFiles.find((f) => f.id === fileId);
    if (file && !fullScheduleActive) {
      setActiveFileId(fileId);
      window.activeFileId = fileId;
      setLastActiveFileId(fileId);
      window.dispatchEvent(new CustomEvent('fileSelected', { detail: file }));
      navigate('/home');
    }
  };

  const refreshAppState = async () => {
    try {
      const { files } = await window.api.getCurrentFile();
      const updatedFiles = await Promise.all(
        (files || []).map(async (file) => {
          const assignments = await window.api.getAssignments(file.id);
          return { ...file, hasUnsavedChanges: false, assignments };
        })
      );
      setOpenFiles(updatedFiles);
      if (!fullScheduleActive && updatedFiles.length > 0) {
        const newActiveFileId = updatedFiles.find((f) => f.id === activeFileId)?.id || updatedFiles[0].id;
        setActiveFileId(newActiveFileId);
        setLastActiveFileId(newActiveFileId);
        window.dispatchEvent(
          new CustomEvent('fileSelected', { detail: updatedFiles.find((f) => f.id === newActiveFileId) })
        );
      } else if (fullScheduleActive) {
        setActiveFileId(null);
      }
      if (updatedFiles.length === 0) {
        navigate("/file");
      }
    } catch (error) {
      console.error("Error refreshing app state:", error);
      alert("Error refreshing app state: " + error.message);
    }
  };

  const handleNew = () => {
    setFormData({ name: "", academic_year: "", semester: "" });
    setShowNewModal(true);
  };

  const handleSave = async () => {
    try {
      const currentFile = openFiles.find((f) => f.id === activeFileId);
      if (!currentFile) {
        alert("No file selected. Please create or open a file first.");
        return;
      }
      const missingFields = [];
      if (!currentFile.name) missingFields.push("Name");
      if (!currentFile.academic_year) missingFields.push("Academic Year");
      if (!currentFile.semester) missingFields.push("Semester");

      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
        return;
      }
      const result = await window.api.saveFile({
        id: currentFile.id,
        name: currentFile.name,
        academic_year: currentFile.academic_year,
        semester: currentFile.semester,
      });
      if (result.success) {
        alert("File saved successfully!");
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.id === currentFile.id
              ? { ...f, ...result.file, hasUnsavedChanges: false }
              : f
          )
        );
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error saving file: " + error.message);
    }
  };

  const handleSaveAs = () => {
    const currentFile = openFiles.find((f) => f.id === activeFileId);
    setFormData({
      name: currentFile ? `${currentFile.name} - Copy` : "",
      academic_year: currentFile ? currentFile.academic_year : "",
      semester: currentFile ? currentFile.semester : "",
    });
    setShowSaveAsModal(true);
  };

  const handleExport = () => {
    if (isExporting) return;
    const defaultFileId = activeFileId || (openFiles.length > 0 ? openFiles[0].id : "");
    const defaultType = "program";
    const defaultId = programs.length > 0 ? programs[0].id.toString() : rooms.length > 0 ? rooms[0].id.toString() : "all";
    setExportData({
      fileId: defaultFileId.toString(),
      type: defaultType,
      id: defaultId,
      format: "pdf",
    });
    setShowExportModal(true);
  };

  const handlePrint = () => {
    if (isPrinting) return;
    const defaultFileId = activeFileId || (openFiles.length > 0 ? openFiles[0].id : "");
    const defaultType = "program";
    const defaultId = programs.length > 0 ? programs[0].id.toString() : rooms.length > 0 ? rooms[0].id.toString() : "all";
    setExportData({
      fileId: defaultFileId.toString(),
      type: defaultType,
      id: defaultId,
    });
    setShowPrintModal(true);
  };

  const handleCloseFile = (fileId, event) => {
    if (event) {
      event.stopPropagation();
    }
    const fileToClose = openFiles.find((f) => f.id === fileId);
    if (fileToClose.hasUnsavedChanges) {
      setFileToCloseId(fileId);
      setShowCloseConfirmModal(true);
    } else {
      confirmCloseFile(fileId);
    }
  };

  const confirmCloseFile = async (fileId) => {
    try {
      await window.api.closeCurrentFile(fileId);
      const remainingFiles = openFiles.filter((f) => f.id !== fileId);
      setOpenFiles(remainingFiles);
      if (fileId === activeFileId) {
        const newActiveFile = remainingFiles.length > 0 ? remainingFiles[0] : null;
        setActiveFileId(newActiveFile?.id || null);
        window.activeFileId = newActiveFile?.id || null;
        setLastActiveFileId(newActiveFile?.id || null);
        if (newActiveFile) {
          window.dispatchEvent(
            new CustomEvent('fileSelected', { detail: newActiveFile })
          );
        } else {
          navigate("/file");
        }
      }
      setShowCloseConfirmModal(false);
      setFileToCloseId(null);
      await refreshAppState();
    } catch (error) {
      console.error("Error closing file:", error);
      alert("Error closing file: " + error.message);
    }
  };

  const submitNewFile = async () => {
    if (!formData.name?.trim() || !formData.academic_year?.trim() || !formData.semester?.trim()) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const result = await window.api.newScheduleFile(formData);
      if (result.success) {
        await window.api.setCurrentFile(result.file);
        alert("New file created successfully!");
        setShowNewModal(false);
        setOpenFiles((prev) => [
          ...prev,
          { ...result.file, hasUnsavedChanges: false, assignments: [] },
        ]);
        setActiveFileId(result.file.id);
        window.activeFileId = result.file.id;
        setLastActiveFileId(result.file.id);
        setFormData({ name: "", academic_year: "", semester: "" });
        navigate("/home");
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error creating file: " + error.message);
    }
  };

  const submitSaveAs = async () => {
    if (!formData.name?.trim() || !formData.academic_year?.trim() || !formData.semester?.trim()) {
      alert("Please fill in all fields");
      return;
    }
    try {
      const result = await window.api.saveAsFile({ fileId: activeFileId, ...formData });
      if (result.success) {
        alert("File saved as new file successfully!");
        setShowSaveAsModal(false);
        setOpenFiles((prev) => [
          ...prev,
          { ...result.file, hasUnsavedChanges: false, assignments: [] },
        ]);
        setActiveFileId(result.file.id);
        setLastActiveFileId(result.file.id);
        setFormData({ name: "", academic_year: "", semester: "" });
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error saving as new file: " + error.message);
    }
  };

  const submitExport = async () => {
    if (isExporting) return;
    const fileIdToUse = exportData.fileId;
    if (!fileIdToUse) {
      alert("Please select a file to export.");
      return;
    }
    if (!exportData.type || !exportData.id) {
      alert("Please select an export type and ID.");
      return;
    }
    setIsExporting(true);
    try {
      const result = await window.api.exportFile({
        fileId: fileIdToUse,
        type: exportData.type,
        id: exportData.id === "all" ? "all" : parseInt(exportData.id),
        format: exportData.format,
      });
      if (result.success) {
        alert(result.message);
        setShowExportModal(false);
        setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error exporting file: " + (error.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const submitPrint = async () => {
    if (isPrinting) return;
    const fileIdToUse = exportData.fileId;
    if (!fileIdToUse) {
      alert("Please select a file to print.");
      return;
    }
    if (!exportData.type || !exportData.id) {
      alert("Please select a print type and ID.");
      return;
    }
    setIsPrinting(true);
    try {
      const result = await window.api.printFile({
        fileId: fileIdToUse,
        type: exportData.type,
        id: exportData.id === "all" ? "all" : parseInt(exportData.id),
      });
      if (result.success) {
        alert(result.message);
        setShowPrintModal(false);
        setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Error printing file: " + (error.message || "Unknown error"));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (openFiles.some((f) => f.id === activeFileId)) {
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId ? { ...f, [field]: value, hasUnsavedChanges: true } : f
        )
      );
    }
  };

  const handleExportChange = (field, value) => {
    setExportData((prev) => {
      const newData = { ...prev, [field]: value };
      // Reset id when type changes to ensure valid selection
      if (field === "type") {
        newData.id = value === "program" && programs.length > 0
          ? programs[0].id.toString()
          : value === "teacher" && teachers.length > 0
            ? teachers[0].id.toString()
            : value === "room" && rooms.length > 0
              ? rooms[0].id.toString()
              : "all";
      }
      return newData;
    });
  };

  const handleZoomIn = () => {
    window.dispatchEvent(new CustomEvent('viewZoom', { detail: { zoom: 'in' } }));
  };

  const handleZoomOut = () => {
    window.dispatchEvent(new CustomEvent('viewZoom', { detail: { zoom: 'out' } }));
  };

  const handleFullSchedule = () => {
    const newFullScheduleActive = !fullScheduleActive;
    setFullScheduleActive(newFullScheduleActive);
    if (newFullScheduleActive) {
      setLastActiveFileId(activeFileId);
      setActiveFileId(null);
      window.activeFileId = null;
    } else {
      setActiveFileId(lastActiveFileId);
      window.activeFileId = lastActiveFileId;
      if (lastActiveFileId) {
        const file = openFiles.find((f) => f.id === lastActiveFileId);
        if (file) {
          window.dispatchEvent(new CustomEvent('fileSelected', { detail: file }));
        }
      }
    }
    window.dispatchEvent(new CustomEvent('viewFullSchedule', { detail: { fullScheduleActive: newFullScheduleActive } }));
  };

  const handleScheduleByCourse = (programId) => {
    if (fullScheduleActive) {
      setFullScheduleActive(false);
      setActiveFileId(lastActiveFileId);
      window.activeFileId = lastActiveFileId;
      if (lastActiveFileId) {
        const file = openFiles.find((f) => f.id === lastActiveFileId);
        if (file) {
          window.dispatchEvent(new CustomEvent('fileSelected', { detail: file }));
        }
      }
      window.dispatchEvent(new CustomEvent('viewFullSchedule', { detail: { fullScheduleActive: false } }));
    }
    window.dispatchEvent(new CustomEvent('viewByCourse', { detail: { programId } }));
  };

  const handleYearLevelSchedule = (yearLevel) => {
    if (fullScheduleActive) {
      setFullScheduleActive(false);
      setActiveFileId(lastActiveFileId);
      window.activeFileId = lastActiveFileId;
      if (lastActiveFileId) {
        const file = openFiles.find((f) => f.id === lastActiveFileId);
        if (file) {
          window.dispatchEvent(new CustomEvent('fileSelected', { detail: file }));
        }
      }
      window.dispatchEvent(new CustomEvent('viewFullSchedule', { detail: { fullScheduleActive: false } }));
    }
    window.dispatchEvent(new CustomEvent('viewByYearLevel', { detail: { yearLevel } }));
  };

  const handleFullScreen = () => {
    window.dispatchEvent(new CustomEvent('viewFullScreen'));
  };

  const handlePreview = async () => {
    if (isGeneratingPreview) return;

    const fileIdToUse = exportData.fileId;
    if (!fileIdToUse || !exportData.type || !exportData.id) {
      alert("Please select all required fields for preview.");
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const result = await window.api.generatePreview({
        fileId: fileIdToUse,
        type: exportData.type,
        id: exportData.id === "all" ? "all" : parseInt(exportData.id),
      });

      if (result.success) {
        setPreviewHtml(result.html);
        setShowPreviewModal(true);
        setShowExportModal(false);
      } else {
        alert(result.message || "Failed to generate preview");
      }
    } catch (error) {
      alert("Error generating preview: " + (error.message || "Unknown error"));
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const buttons = [
    {
      name: "New",
      icon: <FiPlus />,
      onClick: handleNew,
      shortcut: "Ctrl+N",
      disabled: userRole === 'view' // Changed from 'user' to 'view'
    },
    {
      name: "Export",
      icon: isExporting ? <FaSpinner className="animate-spin text-base" /> : <FiDownload />,
      onClick: handleExport,
      disabled: userRole === 'view' || !activeFileId || isExporting, // Changed from 'user' to 'view'
      shortcut: "Ctrl+E"
    },
    {
      name: "Print",
      icon: isPrinting ? <FaSpinner className="animate-spin text-base" /> : <FiPrinter />,
      onClick: handlePrint,
      disabled: userRole === 'view' || !activeFileId || isPrinting, // Changed from 'user' to 'view'
      shortcut: "Ctrl+P"
    },
  ];

  return (
    <>
      <div className="bg-[#0f162b] border-b border-gray-600 shadow-sm">
        <div className="px-1 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex items-center gap-1 mr-6">
                {buttons.map((btn, idx) => (
                  <div key={idx} className="relative group">
                    <button
                      onClick={btn.onClick}
                      disabled={btn.disabled}
                      className={`
                        relative flex items-center gap-2.5 px-2.5 py-1 rounded-md font-medium text-sm
                        transition-all duration-200 ease-out
                        ${btn.disabled
                          ? 'text-gray-500 bg-gray-700 cursor-not-allowed border border-gray-600'
                          : 'text-gray-200 hover:text-white hover:bg-gray-700 hover:shadow-sm active:scale-95 border border-gray-600 hover:border-gray-500'
                        }
                      `}
                      title={`${btn.name} (${btn.shortcut})`}
                    >
                      <span className="text-lg">{btn.icon}</span>
                      <span className="hidden lg:inline font-medium">{btn.name}</span>
                    </button>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity poInter-events-none whitespace-nowrap lg:hidden">
                      {btn.name}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Help button */}
            <div className="relative group">
              <button
                onClick={() => {
                  navigate("/help");
                  window.location.reload();
                }}
                className="flex items-center gap-2.5 px-2.5 py-1 rounded-md text-sm font-medium text-gray-200 hover:text-white hover:bg-gray-700 hover:shadow-sm transition-all duration-200 ease-out active:scale-95 border border-gray-600 hover:border-gray-500"
                title="Help (Ctrl+H)"
              >
                <span className="text-lg"><FiHelpCircle /></span>
                <span className="hidden lg:inline font-medium">Help</span>
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity poInter-events-none whitespace-nowrap lg:hidden">
                Help
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>

          {/* View Tools */}
          {location.pathname === '/home' && showViewTools && (
            <div className="mt-2 p-1 bg-gray-700 rounded-md border border-gray-600">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 p-0">
                  <button
                    onClick={handleZoomIn}
                    className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-500 transition-all duration-200 active:scale-95"
                    title="Zoom In (Ctrl++)"
                  >
                    <FiZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-500"></div>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-500 transition-all duration-200 active:scale-95"
                    title="Zoom Out (Ctrl+-)"
                  >
                    <FiZoomOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Schedule Toggle */}
                <button
                  onClick={handleFullSchedule}
                  className={`
                    flex items-center gap-2 px-2 py-1 rounded-md font-medium text-sm
                    transition-all duration-200 ease-out active:scale-95
                    ${fullScheduleActive
                      ? 'bg-teal-600 text-white border border-teal-500 shadow-sm hover:bg-teal-500'
                      : 'bg-gray-600 text-gray-200 hover:text-white hover:bg-gray-500 border border-gray-500'
                    }
                  `}
                  title="All Schedules"
                >
                  <FiCalendar className="w-4 h-4" />
                  <span>All Schedules</span>
                </button>

                {/* Dropdowns */}
                <select
                  onChange={(e) => handleScheduleByCourse(e.target.value ? parseInt(e.target.value) : null)}
                  className="px-2 py-1 rounded-md text-sm font-medium text-gray-200 bg-gray-600 border border-gray-500 hover:border-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                  title="Schedule by Course"
                >
                  <option value="">Select Course</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => handleYearLevelSchedule(e.target.value)}
                  className="px-2 py-1 rounded-md text-sm font-medium text-gray-200 bg-gray-600 border border-gray-500 hover:border-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 outline-none"
                  title="Year-Level Schedule"
                >
                  <option value="">Select Year</option>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>

                {/* Full Screen */}
                <button
                  onClick={handleFullScreen}
                  className="flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium text-gray-200 bg-gray-600 border border-gray-500 hover:text-white hover:bg-gray-500 hover:border-gray-400 transition-all duration-200 active:scale-95"
                  title="Full Screen (Ctrl+F or F11)"
                >
                  <GrExpand className="w-4 h-4" />
                  <span>Fullscreen</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* File Tabs */}
        <div className="px-0 pb-0 border-t border-gray-600">
          {openFiles.length > 0 ? (
            <div className="flex items-start px-1 pt-1 gap-1 -mb-px bg-gray-700">
              {openFiles.map((file) => (
                <div
                  key={file.id}
                  className={`
                    group flex items-center gap-2 px-4 py-1 rounded-t-xl text-sm cursor-poInter
                    transition-all duration-200 ease-out border-b-2 relative min-w-0 flex-shrink-0
                    ${file.id === activeFileId
                      ? 'bg-gray-600 text-gray-100 border-teal-500 shadow-sm transform translate-y-px'
                      : 'text-gray-300 hover:text-gray-100 hover:bg-gray-650 border-transparent hover:border-gray-500'
                    }
                  `}
                  onClick={() => handleTabClick(file.id)}
                  style={{ maxWidth: '240px', minWidth: '140px', cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {loadingFiles.has(file.id) && (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-teal-500 rounded-full animate-spin flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {file.name}
                      </div>
                    </div>
                    {file.hasUnsavedChanges && (
                      <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Unsaved changes" />
                    )}
                    <button
                      onClick={(e) => handleCloseFile(file.id, e)}
                      disabled={userRole === 'view'}
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-md 
                        transition-all duration-200 flex-shrink-0
                        ${userRole === 'view'
                          ? 'opacity-0 cursor-not-allowed'
                          : 'opacity-0 group-hover:opacity-100 hover:border border-red-500 hover:text-white'
                        }
                      `}
                      title="Close file (Ctrl+W)"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-1 text-sm text-gray-400 text-center mx-0 my-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-gray-600 rounded-lg flex items-center justify-center">
                  <FiEdit className="w-3 h-3 text-gray-400" />
                </div>
                <span>No files open. Click "New" to create a schedule file.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showNewModal && (
        <Modal
          title="Create New Schedule File"
          onClose={() => {
            setShowNewModal(false);
            setFormData({ name: "", academic_year: "", semester: "" });
          }}
          onSave={submitNewFile}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter schedule name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <input
              type="text"
              value={formData.academic_year}
              onChange={(e) => handleFormChange("academic_year", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 2024-2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={formData.semester}
              onChange={(e) => handleFormChange("semester", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>
        </Modal>
      )}

      {showSaveAsModal && (
        <Modal
          title="Save As New Schedule File"
          onClose={() => {
            setShowSaveAsModal(false);
            setFormData({ name: "", academic_year: "", semester: "" });
          }}
          onSave={submitSaveAs}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new schedule name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <input
              type="text"
              value={formData.academic_year}
              onChange={(e) => handleFormChange("academic_year", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 2024-2025"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select
              value={formData.semester}
              onChange={(e) => handleFormChange("semester", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Semester</option>
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
            </select>
          </div>
        </Modal>
      )}

      {showCloseConfirmModal && (
        <Modal
          title="Unsaved Changes"
          onClose={() => setShowCloseConfirmModal(false)}
          onSave={() => confirmCloseFile(fileToCloseId)}
          saveText="Close Anyway"
        >
          <p className="text-sm text-gray-700">
            You have unsaved changes. Are you sure you want to close this file?
          </p>
        </Modal>
      )}

      {showExportModal && (
        <Modal
          title="Export Schedule"
          onClose={() => {
            setShowExportModal(false);
            setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
            setIsExporting(false);
            setIsGeneratingPreview(false);
          }}
          customButtons={
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
                  setIsExporting(false);
                  setIsGeneratingPreview(false);
                }}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={userRole === 'view' || isGeneratingPreview || isExporting || !exportData.fileId || !exportData.type || !exportData.id}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${userRole === 'view' || isGeneratingPreview || isExporting || !exportData.fileId || !exportData.type || !exportData.id
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal-700 text-white hover:bg-teal-900'
                  }`}
              >
                {isGeneratingPreview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  'Preview'
                )}
              </button>
              <button
                type="button"
                onClick={submitExport}
                disabled={userRole === 'view' || isExporting || isGeneratingPreview}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${userRole === 'view' || isExporting || isGeneratingPreview
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </>
                ) : (
                  'Export'
                )}
              </button>
            </div>
          }
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
            <select
              value={exportData.fileId || ""}
              onChange={(e) => handleExportChange("fileId", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={userRole === 'view' || isExporting || isGeneratingPreview}
            >
              <option value="">Select Schedule File</option>
              {openFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({file.semester} {file.academic_year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Export Type</label>
            <select
              value={exportData.type}
              onChange={(e) => handleExportChange("type", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={userRole === 'view' || isExporting || isGeneratingPreview}
            >
              <option value="program">Program</option>
              <option value="teacher">Teacher</option>
              <option value="room">Room</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {exportData.type === "program" ? "Program" : exportData.type === "teacher" ? "Teacher" : "Room"}
            </label>
            <select
              value={exportData.id}
              onChange={(e) => handleExportChange("id", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={userRole === 'view' || isExporting || isGeneratingPreview}
            >
              <option value="">
                Select {exportData.type === "program" ? "Program" : exportData.type === "teacher" ? "Teacher" : "Room"}
              </option>
              {(exportData.type === "program" ? programs : exportData.type === "teacher" ? teachers : rooms).map((item) => (
                <option key={item.id} value={item.id}>
                  {exportData.type === "program" ? item.name : exportData.type === "teacher" ? item.fullName : item.name}
                </option>
              ))}
              {["program", "room"].includes(exportData.type) && <option value="all">All {exportData.type === "program" ? "Programs" : "Rooms"}</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={exportData.format}
              onChange={(e) => handleExportChange("format", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={userRole === 'view' || isExporting || isGeneratingPreview}
            >
              <option value="pdf">PDF</option>
            </select>
          </div>
        </Modal>
      )}

      {showPrintModal && (
        <Modal
          title="Print Schedule"
          onClose={() => {
            setShowPrintModal(false);
            setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
            setIsPrinting(false);
          }}
          onSave={submitPrint}
          saveText={isPrinting ? "Printing..." : "Print"}
          saveDisabled={userRole === 'view' || isPrinting}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
            <select
              value={exportData.fileId || ""}
              onChange={(e) => handleExportChange("fileId", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={userRole === 'view' || isPrinting}
            >
              <option value="">Select Schedule File</option>
              {openFiles.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.name} ({file.semester} {file.academic_year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Print Type</label>
            <select
              value={exportData.type}
              onChange={(e) => handleExportChange("type", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={userRole === 'view' || isPrinting}
            >
              <option value="program">Program</option>
              <option value="teacher">Teacher</option>
              <option value="room">Room</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {exportData.type === "program" ? "Program" : exportData.type === "teacher" ? "Teacher" : "Room"}
            </label>
            <select
              value={exportData.id}
              onChange={(e) => handleExportChange("id", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={userRole === 'view' || isPrinting}
            >
              <option value="">
                Select {exportData.type === "program" ? "Program" : exportData.type === "teacher" ? "Teacher" : "Room"}
              </option>
              {(exportData.type === "program" ? programs : exportData.type === "teacher" ? teachers : rooms).map((item) => (
                <option key={item.id} value={item.id}>
                  {exportData.type === "program" ? item.name : exportData.type === "teacher" ? item.fullName : item.name}
                </option>
              ))}
              {["program", "room"].includes(exportData.type) && <option value="all">All {exportData.type === "program" ? "Programs" : "Rooms"}</option>}
            </select>
          </div>
        </Modal>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-lg w-11/12 h-5/6 max-w-6xl flex rollen flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Export Preview</h2>
              <div className="flex space-x-2">
                <button
                  onClick={submitExport}
                  disabled={userRole === 'view' || isExporting}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${userRole === 'view' || isExporting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    'Export PDF'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewHtml("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Export Preview"
                style={{ backgroundColor: 'white' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}