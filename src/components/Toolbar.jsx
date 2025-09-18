import { FiPlus, FiSave, FiEdit, FiDownload, FiPrinter, FiX, FiHelpCircle, FiZoomIn, FiZoomOut, FiCalendar, FiUsers } from "react-icons/fi";
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
  const [isExporting, setIsExporting] = useState(false); // New state for export loading
  const [isPrinting, setIsPrinting] = useState(false); // New state for print loading
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
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (event) => {
      const { ctrlKey, metaKey, key, shiftKey } = event;
      const isModifier = ctrlKey || metaKey; // Support both Ctrl and Cmd (Mac)

      // Prevent shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        // Only allow Escape to close modals when in input fields
        if (key === 'Escape') {
          closeAllModals();
        }
        return;
      }

      // Handle Escape key to close modals
      if (key === 'Escape') {
        event.preventDefault();
        closeAllModals();
        return;
      }

      if (isModifier) {
        switch (key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            handleNew();
            break;
          case 's':
            event.preventDefault();
            if (shiftKey) {
              handleSaveAs();
            } else {
              handleSave();
            }
            break;
          case 'e':
            event.preventDefault();
            handleExport();
            break;
          case 'p':
            event.preventDefault();
            handlePrint();
            break;
          case 'h':
            event.preventDefault();
            navigate("/help");
            break;
          case 'w':
            event.preventDefault();
            if (activeFileId) {
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

      // Handle F11 for fullscreen (without modifier)
      if (key === 'F11' && showViewTools && location.pathname === '/home') {
        event.preventDefault();
        handleFullScreen();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    showViewTools,
    location.pathname,
    activeFileId,
    navigate,
    // Include handler dependencies
    showNewModal,
    showSaveAsModal,
    showCloseConfirmModal,
    showExportModal,
    showPrintModal
  ]);

  // Helper function to close all modals
  const closeAllModals = () => {
    setShowNewModal(false);
    setShowSaveAsModal(false);
    setShowCloseConfirmModal(false);
    setShowExportModal(false);
    setShowPrintModal(false);
    setFormData({ name: "", academic_year: "", semester: "" });
    setExportData({ fileId: "", type: "program", id: "", format: "pdf" });
    setFileToCloseId(null);
    setIsExporting(false); // Reset export loading state
    setIsPrinting(false); // Reset print loading state
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
        const [teachersData, programsData] = await Promise.all([
          window.api.getTeachers(),
          window.api.getPrograms(),
        ]);
        setTeachers(teachersData || []);
        setPrograms(programsData || []);
      } catch (error) {
        console.error("Error fetching current files:", error);
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
    if (isExporting) return; // Prevent multiple export requests
    const defaultFileId = activeFileId || (openFiles.length > 0 ? openFiles[0].id : "");
    const defaultType = "program";
    const defaultId = programs.length > 0 ? programs[0].id.toString() : "all";
    setExportData({
      fileId: defaultFileId.toString(),
      type: defaultType,
      id: defaultId,
      format: "pdf",
    });
    setShowExportModal(true);
  };

  const handlePrint = () => {
    if (isPrinting) return; // Prevent multiple print requests
    const defaultFileId = activeFileId || (openFiles.length > 0 ? openFiles[0].id : "");
    const defaultType = "program";
    const defaultId = programs.length > 0 ? programs[0].id.toString() : "all";
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
        setLastActiveFileId(result.file.id);
        setFormData({ name: "", academic_year: "", semester: "" });
        navigate("/assign");
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
    if (isExporting) return; // Prevent multiple export requests
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
    if (isPrinting) return; // Prevent multiple print requests
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
    setExportData((prev) => ({ ...prev, [field]: value }));
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
    } else {
      setActiveFileId(lastActiveFileId);
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

  // Updated buttons array with keyboard shortcuts in tooltips and loading state
  const buttons = [
    { name: "New", icon: <FiPlus />, onClick: handleNew, shortcut: "Ctrl+N" },
    { name: "Save", icon: <FiSave />, onClick: handleSave, disabled: !activeFileId, shortcut: "Ctrl+S" },
    { name: "Save As", icon: <FiSave />, onClick: handleSaveAs, disabled: !activeFileId, shortcut: "Ctrl+Shift+S" },
    { name: "Export", icon: isExporting ? <FaSpinner className="animate-spin text-base" /> : <FiDownload />, onClick: handleExport, disabled: !activeFileId || isExporting, shortcut: "Ctrl+E" },
    { name: "Print", icon: isPrinting ? <FaSpinner className="animate-spin text-base" /> : <FiPrinter />, onClick: handlePrint, disabled: !activeFileId || isPrinting, shortcut: "Ctrl+P" },
  ];

  return (
    <>
      <div
        className="border-b"
        style={{
          backgroundColor: "#f8fafc",
          borderColor: "#e5e7eb",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {buttons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${btn.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
                    }`}
                  style={{
                    border: "1px solid transparent",
                  }}
                  title={`${btn.name} (${btn.shortcut})`}
                  onMouseEnter={(e) => {
                    if (!btn.disabled) {
                      e.target.style.borderColor = "#d1d5db";
                      e.target.style.backgroundColor = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!btn.disabled) {
                      e.target.style.borderColor = "transparent";
                      e.target.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span className="text-base">{btn.icon}</span>
                  <span className="hidden sm:inline">{btn.name}</span>
                </button>
              ))}
            </div>

            {/* Help button positioned in the right corner */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  navigate("/help");
                  window.location.reload();
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-700 hover:text-gray-900 hover:bg-white/80"
                style={{
                  border: "1px solid transparent",
                }}
                title="Help (Ctrl+H)"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span className="text-base"><FiHelpCircle /></span>
                <span className="hidden sm:inline">Help</span>
              </button>
            </div>
          </div>

          {location.pathname === '/home' && showViewTools && (
            <div className="mt-2 flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-white/80 transition-colors duration-200"
                style={{
                  border: "1px solid transparent",
                }}
                title="Zoom In (Ctrl++)"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.backgroundColor = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "transparent";
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <FiZoomIn className="text-base" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-white/80 transition-colors duration-200"
                style={{
                  border: "1px solid transparent",
                }}
                title="Zoom Out (Ctrl+-)"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.backgroundColor = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "transparent";
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <FiZoomOut className="text-base" />
              </button>
              <button
                onClick={handleFullSchedule}
                className={`p-2 rounded-lg transition-colors duration-200 ${fullScheduleActive ? 'bg-teal-500 text-gray-700' : 'text-gray-700 hover:text-gray-900'
                  }`}
                style={{
                  border: "1px solid",
                }}
                title="All Schedules"
                onMouseEnter={(e) => {
                  if (!fullScheduleActive) {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.backgroundColor = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!fullScheduleActive) {
                    e.target.style.borderColor = "transparent";
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <FiCalendar className="text-base" />
              </button>
              <select
                onChange={(e) => handleScheduleByCourse(e.target.value ? parseInt(e.target.value) : null)}
                className="p-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500"
                title="Schedule by Course"
              >
                <option value="">Course</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
              <select
                onChange={(e) => handleYearLevelSchedule(e.target.value)}
                className="p-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500"
                title="Year-Level Schedule"
              >
                <option value="">Year</option>
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <button
                onClick={handleFullScreen}
                className="p-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-white/80 transition-colors duration-200"
                style={{
                  border: "1px solid transparent",
                }}
                title="Full Screen (Ctrl+F or F11)"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.backgroundColor = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "transparent";
                  e.target.style.backgroundColor = "transparent";
                }}
              >
                <GrExpand className="text-base" />
              </button>
            </div>
          )}
        </div>

        <div className="px-4 pb-0">
          {openFiles.length > 0 ? (
            <div className="flex items-center space-x-1">
              {openFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center px-3 py-2 rounded-t-lg text-sm cursor-pointer transition-colors duration-200 border-b-2 relative ${file.id === activeFileId
                    ? 'bg-white text-zinc-600 border-teal-500 shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent hover:border-gray-300'
                    }`}
                  onClick={() => handleTabClick(file.id)}
                  style={{
                    maxWidth: '250px',
                    minWidth: '120px',
                  }}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    {loadingFiles.has(file.id) && (
                      <FaSpinner className="animate-spin text-gray-500" size={14} />
                    )}
                    <span className="truncate font-medium">
                      {file.name}
                      {file.hasUnsavedChanges && <span className="text-orange-500 ml-1">•</span>}
                    </span>
                    <button
                      onClick={(e) => handleCloseFile(file.id, e)}
                      className="flex-shrink-0 p-1 rounded hover:bg-red-100 hover:text-red-600 transition-colors duration-150"
                      title="Close file (Ctrl+W)"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic py-2">
              No files open. Click "New" to create a schedule file or select a schedule file on the list.
            </div>
          )}
        </div>
      </div>

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
              {/* <option value="Summer">Summer</option> */}
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
              {/* <option value="Summer">Summer</option> */}
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
          }}
          onSave={submitExport}
          saveText={isExporting ? "Exporting..." : "Export"}
          saveDisabled={isExporting}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
            <select
              value={exportData.fileId || ""}
              onChange={(e) => handleExportChange("fileId", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
            >
              <option value="program">Program</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {exportData.type === "program" ? "Program" : "Teacher"}
            </label>
            <select
              value={exportData.id}
              onChange={(e) => handleExportChange("id", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
            >
              <option value="">
                Select {exportData.type === "program" ? "Program" : "Teacher"}
              </option>
              {exportData.type === "program" && <option value="all">All Programs</option>}
              {(exportData.type === "program" ? programs : teachers).map((item) => (
                <option key={item.id} value={item.id}>
                  {exportData.type === "program" ? item.name : item.fullName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={exportData.format}
              onChange={(e) => handleExportChange("format", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isExporting}
            >
              <option value="pdf">PDF</option>
              {/* <option value="json">JSON</option> */}
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
          saveDisabled={isPrinting}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
            <select
              value={exportData.fileId || ""}
              onChange={(e) => handleExportChange("fileId", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isPrinting}
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
              disabled={isPrinting}
            >
              <option value="program">Program</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {exportData.type === "program" ? "Program" : "Teacher"}
            </label>
            <select
              value={exportData.id}
              onChange={(e) => handleExportChange("id", e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isPrinting}
            >
              <option value="">
                Select {exportData.type === "program" ? "Program" : "Teacher"}
              </option>
              {exportData.type === "program" && <option value="all">All Programs</option>}
              {(exportData.type === "program" ? programs : teachers).map((item) => (
                <option key={item.id} value={item.id}>
                  {exportData.type === "program" ? item.name : item.fullName}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}