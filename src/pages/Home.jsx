/* eslint-disable no-unused-vars */
/* eslint-disable no-unreachable */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import Toolbar from '../components/Toolbar';
import Modal from "../components/Modal"
import AssignmentList from "../components/AssignmentList";

// Schedule Cell Tooltip Component
const ScheduleCellTooltip = ({ assignment, rooms, onRemove, onEdit, onClose, getSubjectName, getTeacherName, getAssignmentRoom, getTeacherColor, getSubjectUnits, getTimeSlotRange, days, timeSlots }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    day: assignment.day,
    startTime: assignment.timeSlot.split('-')[0].trim(),
    duration: assignment.duration
  });

  if (!assignment) return null;

  const subjectName = getSubjectName(assignment.subjectId);
  const teacherName = getTeacherName(assignment.teacherId);
  const roomName = getAssignmentRoom(assignment);
  const color = getTeacherColor(assignment.teacherId);

  const getDarkerColor = (hexColor) => {
    if (!hexColor || hexColor === "#e5e7eb") return "#9ca3af";
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return "#9ca3af";
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    r = Math.max(0, r - 40);
    g = Math.max(0, g - 40);
    b = Math.max(0, b - 40);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleSaveEdit = () => {
    const updatedAssignment = {
      ...assignment,
      day: editForm.day,
      timeSlot: getTimeSlotRange(editForm.startTime, editForm.duration),
      duration: parseInt(editForm.duration)
    };
    onEdit(updatedAssignment);
    setIsEditing(false);
  };

  const handleRemove = () => {
    onRemove(assignment.id);
    onClose();
  };

  return (
    <div className="absolute z-50 bg-zinc-800 border border-gray-300 shadow-xl p-4 min-w-80 max-w-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-white">Schedule Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>

      {!isEditing ? (
        <>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getDarkerColor(color) }}
              ></div>
              <span className="font-medium text-gray-900" style={{ color: getDarkerColor(color) }}>{subjectName}</span>
            </div>
            <div className="text-sm text-white">
              <div><strong></strong> {teacherName}</div>
              <div><strong></strong> Date: {assignment.day}, {assignment.timeSlot}</div>
              <div><strong></strong> Room: {roomName}</div>
              {/* <div><strong>Duration:</strong> {assignment.duration / 60} hour(s)</div> */}
              {/* <div><strong>Units:</strong> {getSubjectUnits(assignment.subjectId)}</div> */}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              onClick={handleRemove}
              className="flex-1 px-3 py-2 text-red-500 text-sm transition-colors border-r-2 border-gray-300"
            >
              Remove
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-3 py-2 text-white text-sm transition-colors"
            >
              Edit
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
            <select
              value={editForm.day}
              onChange={(e) => setEditForm(prev => ({ ...prev, day: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              value={editForm.roomId || ""}
              onChange={(e) => setEditForm(prev => ({ ...prev, roomId: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">No Room</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <select
              value={editForm.startTime}
              onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              {timeSlots.map(slot => {
                const startTime = slot.split('-')[0].trim();
                return (
                  <option key={startTime} value={startTime}>{startTime}</option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
            <select
              value={editForm.duration / 60}
              onChange={(e) => setEditForm(prev => ({ ...prev, duration: parseInt(e.target.value) * 60 }))}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              {[1, 2, 3, 4, 5].map(hours => (
                <option key={hours} value={hours}>{hours} hour(s)</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [showArchived, setShowArchived] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [openFiles, setOpenFiles] = useState([]);
  const [timeAssignments, setTimeAssignments] = useState([]);
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [conflictModal, setConflictModal] = useState({ open: false, conflicts: [] });
  const [deleteModal, setDeleteModal] = useState({ open: false, assignmentId: null });
  const [filterOptions, setFilterOptions] = useState({
    teacherId: "",
    showWithSchedule: false,
    showWithoutSchedule: true,
  });
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedMergeClassId, setSelectedMergeClassId] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScheduleActive, setFullScheduleActive] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // Tooltip states
  const [clickedCell, setClickedCell] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const contentRef = useRef(null);
  const getYearLevel = (classId) => classes.find(c => c.id === classId)?.yearLevel || null;
  const getSubjectYearLevel = (subjectId) => subjects.find(s => s.id === subjectId)?.yearLevel || null;
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'view';
  const [isAssignmentListOpen, setIsAssignmentListOpen] = useState(false);

  const handleZoomChange = (e) => {
    const zoomValue = parseInt(e.target.value) / 100;
    setZoomLevel(zoomValue);
  };

  // Add helper function for darker color
  const getDarkerColor = (hexColor) => {
    if (!hexColor || hexColor === "#e5e7eb") return "#9ca3af";

    // Convert hex to RGB and darken by 40%
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return "#9ca3af";

    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);

    r = Math.max(0, r - 40);
    g = Math.max(0, g - 40);
    b = Math.max(0, b - 40);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Add helper function to get subject units
  const getSubjectUnits = (subjectId) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? parseInt(subject.units) || 1 : 1; // Default to 1 unit if not found
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fileResponse = await window.api.getCurrentFile();
        setOpenFiles(fileResponse.files || []);
        if (!fileResponse.files || fileResponse.files.length === 0) {
          return;
        }
        const activeFile = fileResponse.files.find((f) => f.id === window.activeFileId) || fileResponse.files[0];
        setCurrentFile(activeFile);
        const [teachersData, classesData, subjectsData, roomsData, programsData] = await Promise.all([
          window.api.getTeachers(),
          window.api.getClasses(),
          window.api.getSubjects(),
          window.api.getRooms(),
          window.api.getPrograms(),
        ]);
        setTeachers(teachersData || []);
        setClasses(classesData || []);
        setSubjects(subjectsData || []);
        setRooms(roomsData || []);
        setPrograms(programsData || []);
        if (fullScheduleActive) {
          const allAssignments = await Promise.all(
            fileResponse.files.map(async (file) => {
              const assignments = await window.api.getAssignments(file.id);
              return assignments.map((a) => ({ ...a, scheduleFileId: file.id }));
            })
          );
          const flattenedAssignments = allAssignments.flat();
          setTimeAssignments(flattenedAssignments.filter((a) => a.type === "time") || []);
          setRoomAssignments(flattenedAssignments.filter((a) => a.type === "room") || []);
          setSubjectAssignments(flattenedAssignments.filter((a) => a.type === "subject") || []);
        } else {
          const assignmentsData = await window.api.getAssignments(activeFile.id);
          setTimeAssignments(assignmentsData.filter((a) => a.type === "time") || []);
          setRoomAssignments(assignmentsData.filter((a) => a.type === "room") || []);
          setSubjectAssignments(assignmentsData.filter((a) => a.type === "subject") || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    const handleFileSelected = (event) => {
      const file = event.detail;
      if (file && !fullScheduleActive) {
        setCurrentFile(file);
        window.api.getAssignments(file.id).then((data) => {
          setTimeAssignments(data.filter((a) => a.type === "time") || []);
          setRoomAssignments(data.filter((a) => a.type === "room") || []);
          setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
        }).catch(console.error);
      }
    };
    const handleZoom = (event) => {
      setZoomLevel((prev) => event.detail.zoom === 'in' ? Math.min(prev + 0.1, 2) : Math.max(prev - 0.1, 0.5));
    };
    const handleFullSchedule = (event) => {
      setFullScheduleActive(event.detail.fullScheduleActive);
      if (event.detail.fullScheduleActive) {
        const fetchAllAssignments = async () => {
          const allAssignments = await Promise.all(
            openFiles.map(async (file) => {
              const assignments = await window.api.getAssignments(file.id);
              return assignments.map((a) => ({ ...a, scheduleFileId: file.id }));
            })
          );
          const flattenedAssignments = allAssignments.flat();
          setTimeAssignments(flattenedAssignments.filter((a) => a.type === "time") || []);
          setRoomAssignments(flattenedAssignments.filter((a) => a.type === "room") || []);
          setSubjectAssignments(flattenedAssignments.filter((a) => a.type === "subject") || []);
        };
        fetchAllAssignments();
      } else {
        if (window.activeFileId) {
          window.api.getAssignments(window.activeFileId).then((data) => {
            setTimeAssignments(data.filter((a) => a.type === "time") || []);
            setRoomAssignments(data.filter((a) => a.type === "room") || []);
            setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
            setCurrentFile(openFiles.find((f) => f.id === window.activeFileId));
          }).catch(console.error);
        }
      }
    };
    const handleScheduleByCourse = (event) => {
      setSelectedProgramId(event.detail.programId || null);
    };
    const handleClassSchedule = (event) => {
      setSelectedClassId(event.detail.classId || null);
    };
    window.addEventListener("viewByClass", handleClassSchedule);
    const handleFullScreen = () => {
      setIsFullScreen((prev) => !prev);
    };
    window.addEventListener("fileSelected", handleFileSelected);
    window.addEventListener("viewZoom", handleZoom);
    window.addEventListener("viewFullSchedule", handleFullSchedule);
    window.addEventListener("viewByCourse", handleScheduleByCourse);
    window.addEventListener("viewByClass", handleClassSchedule);
    window.addEventListener("viewFullScreen", handleFullScreen);
    return () => {
      window.removeEventListener("fileSelected", handleFileSelected);
      window.removeEventListener("viewZoom", handleZoom);
      window.removeEventListener("viewFullSchedule", handleFullSchedule);
      window.removeEventListener("viewByCourse", handleScheduleByCourse);
      window.removeEventListener("viewByClass", handleClassSchedule);
      window.removeEventListener("viewFullScreen", handleFullScreen);
    };
  }, [navigate, fullScheduleActive, openFiles]);

  useEffect(() => {
    const listAssignments = [...timeAssignments];
    const unscheduledRooms = roomAssignments.filter(
      (ra) => !timeAssignments.some((ta) => ta.subjectId === ra.subjectId && ta.teacherId === ra.teacherId && ta.classId === ra.classId)
    );
    listAssignments.push(...unscheduledRooms);
    const unscheduledSubjects = subjectAssignments.filter(
      (sa) => !timeAssignments.some((ta) => ta.subjectId === sa.subjectId && ta.teacherId === sa.teacherId)
    );
    listAssignments.push(
      ...unscheduledSubjects.map((sa) => ({
        ...sa,
        classId: null,
        roomId: null,
        timeSlot: null,
        day: null,
        duration: null,
      }))
    );
    // Add subjects without any assignments (no teacher assigned yet)
    const subjectsWithoutAssignments = subjects.filter(
      (subject) => !subjectAssignments.some((sa) => sa.subjectId === subject.id) &&
        !timeAssignments.some((ta) => ta.subjectId === subject.id)
    );
    listAssignments.push(
      ...subjectsWithoutAssignments.map((subject) => ({
        id: `unassigned-subject-${subject.id}`,
        subjectId: subject.id,
        teacherId: null,
        classId: null,
        roomId: null,
        timeSlot: null,
        day: null,
        duration: null,
        type: "subject",
        scheduleFileId: currentFile?.id,
      }))
    );
    setAssignments(listAssignments);
  }, [timeAssignments, roomAssignments, subjectAssignments, subjects, currentFile?.id]);

  useEffect(() => {
    if (!contentRef.current) return;
    const handleMouseDown = (e) => {
      // Only handle mousedown if the target is within contentRef
      if (!contentRef.current.contains(e.target)) return;
      if (zoomLevel <= 1) return;
      setIsDragging(true);
      setStartX(e.pageX - panX);
      setStartY(e.pageY - panY);
      contentRef.current.style.cursor = 'grabbing';
    };
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPanX(e.pageX - startX);
      setPanY(e.pageY - startY);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      if (contentRef.current) {
        contentRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
      }
    };
    contentRef.current.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, panX, panY, startX, startY, zoomLevel]);

  useEffect(() => {
    const handleToggleAssignmentList = () => {
      setIsAssignmentListOpen(prev => !prev);
    };

    window.addEventListener('toggleAssignmentList', handleToggleAssignmentList);

    return () => {
      window.removeEventListener('toggleAssignmentList', handleToggleAssignmentList);
    };
  }, []);

  useEffect(() => {
    const handleViewByCourse = (event) => {
      setSelectedProgramId(event.detail.programId);
      setSelectedClassId(null);
      setSelectedMergeClassId(null);
    };

    const handleViewByClass = (event) => {
      setSelectedClassId(event.detail.classId);
      setSelectedProgramId(null);
      setSelectedMergeClassId(null);
    };

    const handleViewByMergeClass = (event) => {
      setSelectedMergeClassId(event.detail.mergeClassId);
      setSelectedProgramId(null);
      setSelectedClassId(null);
    };

    window.addEventListener("viewByCourse", handleViewByCourse);
    window.addEventListener("viewByClass", handleViewByClass);
    window.addEventListener("viewByMergeClass", handleViewByMergeClass);

    return () => {
      window.removeEventListener("viewByCourse", handleViewByCourse);
      window.removeEventListener("viewByClass", handleViewByClass);
      window.removeEventListener("viewByMergeClass", handleViewByMergeClass);
    };
  }, []);

  const timeSlots = [
    '7:00 AM - 7:30 AM', '7:30 AM - 8:00 AM', '8:00 AM - 8:30 AM', '8:30 AM - 9:00 AM',
    '9:00 AM - 9:30 AM', '9:30 AM - 10:00 AM', '10:00 AM - 10:30 AM', '10:30 AM - 11:00 AM',
    '11:00 AM - 11:30 AM', '11:30 AM - 12:00 PM', '12:00 PM - 12:30 PM', '12:30 PM - 1:00 PM',
    '1:00 PM - 1:30 PM', '1:30 PM - 2:00 PM', '2:00 PM - 2:30 PM', '2:30 PM - 3:00 PM',
    '3:00 PM - 3:30 PM', '3:30 PM - 4:00 PM', '4:00 PM - 4:30 PM', '4:30 PM - 5:00 PM',
    '5:00 PM - 5:30 PM', '5:30 PM - 6:00 PM', '6:00 PM - 6:30 PM', '6:30 PM - 7:00 PM',
    '7:00 PM - 7:30 PM', '7:30 PM - 8:00 PM', '8:00 PM - 8:30 PM', '8:30 PM - 9:00 PM',
    '9:30 PM - 10:00 PM',
  ];

  const parseTime = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getTeacherColor = (teacherId) => {
    return teachers.find((t) => t.id === teacherId)?.color || "#e5e7eb"
  }

  const getLightBackgroundColor = (hexColor) => {
    if (!hexColor || hexColor === "#e5e7eb") return "rgba(229, 231, 235, 0.5)" // light gray
    // Convert hex to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
    if (!result) return "rgba(229, 231, 235, 0.5)"
    const r = Number.parseInt(result[1], 16)
    const g = Number.parseInt(result[2], 16)
    const b = Number.parseInt(result[3], 16)
    // Return light version with low opacity
    return `rgba(${r}, ${g}, ${b}, 0.15)`
  }

  const getClassName = (classId) => {
    return classes.find((c) => c.id === classId)?.name || "Unknown";
  };

  const getRoomName = (roomId) => {
    return rooms.find((r) => r.id === roomId)?.name || "N/A";
  };

  const getProgramId = (classId) => {
    return classes.find((c) => c.id === classId)?.programId || null;
  };

  const getProgramName = (programId) => {
    return programs.find((p) => p.id === programId)?.name || "Unknown";
  };

  const getAssignmentRoom = (assignment) => {
    const roomAssignment = roomAssignments.find(
      (ra) =>
        ra.scheduleFileId === assignment.scheduleFileId &&
        ra.subjectId === assignment.subjectId &&
        ra.teacherId === assignment.teacherId &&
        ra.classId === assignment.classId
    );
    return roomAssignment ? getRoomName(roomAssignment.roomId) : "N/A";
  };

  const getDayAssignments = (day, teacherId = null, programId = null, classId = null) => {
    let filtered = timeAssignments.filter(a => a.day === day);
    if (teacherId) filtered = filtered.filter(a => a.teacherId === teacherId);
    if (programId) filtered = filtered.filter(a => getProgramId(a.classId) === programId);
    if (classId) filtered = filtered.filter(a => a.classId === classId); // Add class filtering

    return filtered.map(a => {
      const start = a.timeSlot.split('-')[0].trim();
      const idx = timeSlots.findIndex(s => s.startsWith(start));
      const span = Math.round(a.duration / 30);
      return { start: idx, span, assignment: a };
    }).filter(x => x.start !== -1).sort((a, b) => a.start - b.start);
  };

  const getSubjectName = (subjectId) => {
    return subjects.find((s) => s.id === subjectId)?.name || "Unknown";
  };

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? (teacher.honorifics ? `${teacher.honorifics} ${teacher.fullName}` : teacher.fullName) : "No Teacher";
  };

  const getTotalStudentsForMergedClasses = (assignment, day, timeSlot) => {
    const matchingAssignments = timeAssignments.filter(
      (a) =>
        a.subjectId === assignment.subjectId &&
        a.teacherId === assignment.teacherId &&
        a.day === day &&
        a.timeSlot === timeSlot &&
        a.id !== assignment.id
    );
    const classIds = [assignment.classId, ...matchingAssignments.map((a) => a.classId)];
    return classIds.reduce((total, classId) => {
      const classData = classes.find((c) => c.id === classId);
      return total + (classData?.numStudents || 0); // Fixed to use numStudents
    }, 0);
  };

  const getTimeSlotRange = (startTime, duration) => {
    const startMinutes = parseTime(startTime);
    if (startMinutes === null) return "";
    const endMinutes = startMinutes + parseInt(duration);
    const endTime = formatTime(endMinutes);
    return `${startTime}-${endTime}`;
  };

  // Tooltip handlers
  const handleRemoveAssignment = async (assignmentId) => {
    await handleDelete(assignmentId);
    setShowTooltip(false);
    setClickedCell(null);
  };

  const handleEditAssignment = async (updatedAssignment) => {
    await handleSaveEdit(updatedAssignment.id, updatedAssignment);
    setShowTooltip(false);
    setClickedCell(null);
  };

  const handleDrop = async (event, day, timeIndex, classId, programId = null) => {
    event.preventDefault();
    const assignmentId = event.dataTransfer.getData("text/plain");
    const assignment = assignments.find((a) => a.id === assignmentId);

    if (!assignment) {
      console.error("Assignment not found for ID:", assignmentId);
      return;
    }

    let updatedAssignment;
    let newRoomId;

    // Determine the target class
    let targetClass = null;
    if (classId) {
      targetClass = classes.find((c) => c.id === classId);
    } else if (programId) {
      targetClass = classes.find((c) => c.programId === programId);
    }

    if (!targetClass && (assignment.type === "subject" || assignment.type === "room")) {
      setConflictModal({
        open: true,
        conflicts: ["No matching class found for the selected program and year level."],
      });
      return;
    }

    const startTime = timeSlots[timeIndex].split('-')[0].trim();

    // Calculate duration based on subject units (1 unit = 1 hour = 60 minutes)
    const subjectUnits = getSubjectUnits(assignment.subjectId);
    const duration = subjectUnits * 60; // Convert hours to minutes

    if (assignment.type === "time") {
      const timeSlot = getTimeSlotRange(startTime, duration);
      updatedAssignment = {
        ...assignment,
        day,
        timeSlot,
        duration: duration, // Use calculated duration
      };
      newRoomId = getAssignmentRoom(assignment) !== "N/A"
        ? roomAssignments.find(
          (ra) =>
            ra.scheduleFileId === assignment.scheduleFileId &&
            ra.subjectId === assignment.subjectId &&
            ra.teacherId === assignment.teacherId &&
            ra.classId === assignment.classId
        )?.roomId
        : null;
    } else if (assignment.type === "room") {
      const timeSlot = getTimeSlotRange(startTime, duration);
      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        day,
        timeSlot,
        duration: duration, // Use calculated duration
        type: "time",
        scheduleFileId: currentFile?.id || assignment.scheduleFileId,
      };
      newRoomId = assignment.roomId;
    } else if (assignment.type === "subject") {
      const subject = subjects.find((s) => s.id === assignment.subjectId);
      const timeSlot = getTimeSlotRange(startTime, duration);
      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: targetClass?.id || "",
        day,
        timeSlot,
        duration: duration, // Use calculated duration
        type: "time",
        scheduleFileId: currentFile?.id || assignment.scheduleFileId,
      };
      newRoomId = null;
    }

    // IMPROVED CONFLICT DETECTION
    const conflictSet = new Set();
    const startSlot = timeSlots.findIndex((slot) =>
      slot.split('-')[0].trim() === updatedAssignment.timeSlot.split('-')[0].trim()
    );
    const span = Math.round(updatedAssignment.duration / 30);

    // Get all assignments in the target time range on this day
    const overlappingAssignments = getDayAssignments(day, null)
      .filter(({ start, span: assSpan }) =>
        start < startSlot + span && start + assSpan > startSlot
      );

    for (const { assignment: existing } of overlappingAssignments) {
      // 1. Teacher Conflict
      if (
        existing.teacherId === updatedAssignment.teacherId &&
        existing.subjectId !== updatedAssignment.subjectId
      ) {
        conflictSet.add(
          `Teacher ${getTeacherName(existing.teacherId)} is already teaching ${getSubjectName(existing.subjectId)} at this time.`
        );
      }

      // 2. Class Conflict
      if (existing.classId === updatedAssignment.classId) {
        conflictSet.add(`Class ${getClassName(existing.classId)} already has a class at this time.`);
      }

      // 3. Room Conflict
      if (newRoomId) {
        const existingRoomId = getAssignmentRoom(existing);
        if (existingRoomId !== "N/A" && existingRoomId === getRoomName(newRoomId)) {
          // Check if this is a merged class scenario
          const isSameSubjectTeacher =
            existing.subjectId === updatedAssignment.subjectId &&
            existing.teacherId === updatedAssignment.teacherId;

          if (!isSameSubjectTeacher) {
            conflictSet.add(`Room ${getRoomName(newRoomId)} is already occupied by ${getSubjectName(existing.subjectId)}.`);
          }
        }
      }
    }

    // 4. Room Capacity Check
    if (newRoomId) {
      const room = rooms.find(r => r.id === newRoomId);
      if (room) {
        const classData = classes.find(c => c.id === updatedAssignment.classId);
        if (classData && classData.students > room.capacity) {
          conflictSet.add(
            `Room ${room.name} capacity (${room.capacity}) exceeded. Class has ${classData.students} students.`
          );
        }
      }
    }

    if (conflictSet.size > 0) {
      setConflictModal({
        open: true,
        conflicts: [...conflictSet],
      });
      return;
    }

    // Save the assignment
    try {
      const result = assignment.type === "time"
        ? await window.api.updateTimeSlotAssignment(updatedAssignment)
        : await window.api.assignTimeSlot(updatedAssignment);

      if (result.success) {
        // Handle room assignment and refresh data
        if (newRoomId) {
          const existingRoomAssignment = roomAssignments.find(
            (ra) =>
              ra.scheduleFileId === updatedAssignment.scheduleFileId &&
              ra.subjectId === updatedAssignment.subjectId &&
              ra.teacherId === updatedAssignment.teacherId &&
              ra.classId === updatedAssignment.classId
          );
          if (existingRoomAssignment) {
            await window.api.updateRoomAssignment({
              id: existingRoomAssignment.id,
              scheduleFileId: updatedAssignment.scheduleFileId,
              subjectId: updatedAssignment.subjectId,
              teacherId: updatedAssignment.teacherId,
              classId: updatedAssignment.classId,
              roomId: newRoomId,
            });
          } else {
            await window.api.assignRoom({
              scheduleFileId: updatedAssignment.scheduleFileId,
              subjectId: updatedAssignment.subjectId,
              teacherId: updatedAssignment.teacherId,
              classId: updatedAssignment.classId,
              roomId: newRoomId,
            });
          }
        }

        // Refresh assignments
        const data = await window.api.getAssignments(currentFile?.id || updatedAssignment.scheduleFileId);
        setTimeAssignments(data.filter((a) => a.type === "time") || []);
        setRoomAssignments(data.filter((a) => a.type === "room") || []);
        setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
      } else {
        setConflictModal({
          open: true,
          conflicts: ["Failed to assign time slot: " + (result.message || "Unknown error")],
        });
      }
    } catch (error) {
      console.error("Error assigning time slot:", error);
      setConflictModal({
        open: true,
        conflicts: ["An error occurred while assigning the time slot: " + error.message],
      });
    }
  };

  const handleSaveEdit = async (assignmentId, updatedData) => {
    const newTimeSlot = getTimeSlotRange(updatedData.startTime, updatedData.duration);
    if (!newTimeSlot) {
      setConflictModal({
        open: true,
        conflicts: ["Invalid start time or duration."],
      });
      return;
    }
    const newData = {
      ...updatedData,
      timeSlot: newTimeSlot,
      duration: parseInt(updatedData.duration),
    };
    const dayAssignments = getDayAssignments(newData.day, null).filter((ass) => ass.assignment.id !== assignmentId);
    const conflicts = new Set();
    const startSlot = timeSlots.findIndex((slot) => slot.split('-')[0].trim() === newData.timeSlot.split('-')[0].trim());
    const span = Math.round(newData.duration / 30);
    // Consolidated conflict detection
    const teacherConflicts = new Set();
    const classConflicts = new Set();
    const subjectConflicts = new Set();
    const roomConflicts = new Set();
    for (let i = startSlot; i < startSlot + span; i++) {
      dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
        if (start <= i && start + assSpan > i) {
          if (
            ass.teacherId === newData.teacherId &&
            ass.subjectId !== newData.subjectId &&
            !teacherConflicts.has(ass.teacherId)
          ) {
            teacherConflicts.add(ass.teacherId);
            conflicts.add(
              `Teacher ${getTeacherName(ass.teacherId)} is already assigned to ${getSubjectName(ass.subjectId)} at this time.`
            );
          }
          if (ass.classId === newData.classId && !classConflicts.has(ass.classId)) {
            classConflicts.add(ass.classId);
            conflicts.add(`Class ${getClassName(ass.classId)} is already scheduled at this time.`);
          }
          if (
            ass.subjectId === newData.subjectId &&
            ass.day === newData.day &&
            ass.timeSlot === newData.timeSlot &&
            ass.teacherId !== newData.teacherId &&
            !subjectConflicts.has(ass.subjectId)
          ) {
            subjectConflicts.add(ass.subjectId);
            conflicts.add(
              `Subject ${getSubjectName(ass.subjectId)} is already assigned to ${getTeacherName(ass.teacherId)} at this time.`
            );
          }
        }
      });
    }
    if (newData.roomId) {
      const room = rooms.find((r) => r.id === newData.roomId);
      if (room) {
        const totalStudents = getTotalStudentsForMergedClasses(newData, newData.day, newData.timeSlot);
        if (totalStudents > room.capacity) {
          conflicts.add(`Room ${room.name} capacity (${room.capacity}) exceeded. Total students: ${totalStudents}`);
        }
      }
      for (let i = startSlot; i < startSlot + span; i++) {
        dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
          if (start <= i && start + assSpan > i) {
            const assRoomId = getAssignmentRoom(ass) !== "N/A" ? roomAssignments.find(
              (ra) =>
                ra.scheduleFileId === ass.scheduleFileId &&
                ra.subjectId === ass.subjectId &&
                ra.teacherId === ass.teacherId &&
                ra.classId === ass.classId
            )?.roomId : null;
            if (
              assRoomId &&
              newData.roomId === assRoomId &&
              !(
                ass.subjectId === newData.subjectId &&
                ass.teacherId === newData.teacherId &&
                ass.day === newData.day &&
                ass.timeSlot === newData.timeSlot
              ) &&
              !roomConflicts.has(assRoomId)
            ) {
              roomConflicts.add(assRoomId);
              conflicts.add(`Room ${getRoomName(assRoomId)} is already occupied by another class.`);
            }
          }
        });
      }
    }
    if (conflicts.size > 0) {
      setConflictModal({
        open: true,
        conflicts: [...conflicts],
      });
      return;
    }
    try {
      const result = await window.api.updateTimeSlotAssignment(newData);
      if (!result.success) {
        setConflictModal({
          open: true,
          conflicts: [result.message || "Failed to update assignment."],
        });
        return;
      }
      const existingRoomAssignment = roomAssignments.find(
        (ra) =>
          ra.scheduleFileId === newData.scheduleFileId &&
          ra.subjectId === newData.subjectId &&
          ra.teacherId === newData.teacherId &&
          ra.classId === newData.classId
      );
      if (newData.roomId) {
        if (existingRoomAssignment) {
          const roomResult = await window.api.updateRoomAssignment({
            id: existingRoomAssignment.id,
            scheduleFileId: newData.scheduleFileId,
            subjectId: newData.subjectId,
            teacherId: newData.teacherId,
            classId: newData.classId,
            roomId: newData.roomId,
          });
          if (!roomResult.success) {
            setConflictModal({
              open: true,
              conflicts: [roomResult.message || "Failed to update room assignment."],
            });
            return;
          }
        } else {
          const roomResult = await window.api.assignRoom({
            scheduleFileId: newData.scheduleFileId,
            subjectId: newData.subjectId,
            teacherId: newData.teacherId,
            classId: newData.classId,
            roomId: newData.roomId,
          });
          if (!roomResult.success) {
            setConflictModal({
              open: true,
              conflicts: [roomResult.message || "Failed to assign room."],
            });
            return;
          }
        }
      } else if (existingRoomAssignment) {
        await window.api.deleteAssignment(existingRoomAssignment.id);
      }
      const data = await window.api.getAssignments(currentFile.id);
      setTimeAssignments(data.filter((a) => a.type === "time") || []);
      setRoomAssignments(data.filter((a) => a.type === "room") || []);
      setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
      setEditingAssignment(null);
      setConflictModal({
        open: true,
        conflicts: ["Assignment updated successfully!"],
      });
    } catch (error) {
      console.error("Error updating assignment:", error);
      setConflictModal({
        open: true,
        conflicts: ["Error updating assignment: " + (error.message || "Unknown error")],
      });
    }
  };

  const handleDelete = async (assignmentId) => {
    setDeleteModal({ open: true, assignmentId }); // Show modal instead of confirm
  };

  const confirmDelete = async () => {
    const assignmentId = deleteModal.assignmentId;
    try {
      const timeAssignment = timeAssignments.find((a) => a.id === assignmentId);
      if (!timeAssignment) {
        setConflictModal({
          open: true,
          conflicts: ["Assignment not found."],
        });
        setDeleteModal({ open: false, assignmentId: null });
        return;
      }
      const timeResult = await window.api.deleteAssignment(assignmentId);
      if (!timeResult.success) {
        setConflictModal({
          open: true,
          conflicts: [timeResult.message],
        });
        setDeleteModal({ open: false, assignmentId: null });
        return;
      }
      const roomAssignment = roomAssignments.find(
        (ra) =>
          ra.scheduleFileId === timeAssignment.scheduleFileId &&
          ra.subjectId === timeAssignment.subjectId &&
          ra.teacherId === timeAssignment.teacherId &&
          ra.classId === timeAssignment.classId
      );
      if (roomAssignment) {
        const roomResult = await window.api.deleteAssignment(roomAssignment.id);
        if (!roomResult.success) {
          setConflictModal({
            open: true,
            conflicts: [roomResult.message],
          });
          setDeleteModal({ open: false, assignmentId: null });
          return;
        }
      }
      const data = await window.api.getAssignments(currentFile.id);
      setTimeAssignments(data.filter((a) => a.type === "time") || []);
      setRoomAssignments(data.filter((a) => a.type === "room") || []);
      setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
      setConflictModal({
        open: true,
        conflicts: ["Assignment deleted successfully!"],
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      setConflictModal({
        open: true,
        conflicts: ["Error deleting assignment: " + error.message],
      });
    }
    setDeleteModal({ open: false, assignmentId: null });
  };

  const createScheduleGrid = (programId = null, classId = null, mergeClassId = null) => {
    let targetClasses = [];

    if (mergeClassId) {
      // Handle merged class - get all classes that are part of this merge
      const mergedClass = classes.find(cls => cls.id === mergeClassId);
      if (mergedClass && mergedClass.isMerged && mergedClass.mergedFrom) {
        targetClasses = classes.filter(cls => mergedClass.mergedFrom.includes(cls.id));
      } else {
        targetClasses = [mergedClass].filter(Boolean);
      }
    } else if (classId) {
      // Single class
      targetClasses = classes.filter((c) => c.id === classId);
    } else if (programId) {
      // All classes in program
      targetClasses = classes.filter((c) => c.programId === programId);
    } else {
      // All classes (for full schedule)
      targetClasses = classes;
    }

    if (targetClasses.length === 0) return null;

    // For day-column layout (class view), we need a different grid structure
    if (classId || mergeClassId) {
      const grid = {};

      // Initialize grid with time slots as rows and days as columns
      timeSlots.forEach((_, timeIndex) => {
        grid[timeIndex] = {};
        days.forEach(day => {
          grid[timeIndex][day] = {
            occupied: false,
            assignment: null,
            span: 1
          };
        });
      });

      // Populate with assignments for the target classes
      days.forEach(day => {
        const dayAssignments = getDayAssignments(day, null, programId, classId || (mergeClassId ? null : undefined));
        dayAssignments.forEach(({ start, span, assignment }) => {
          if (targetClasses.some(c => c.id === assignment.classId)) {
            const slotSpan = Math.round(assignment.duration / 30);
            if (grid[start] && grid[start][day]) {
              grid[start][day] = {
                occupied: true,
                assignment,
                span: slotSpan,
              };

              // Mark subsequent slots as occupied (for rowSpan)
              for (let i = 1; i < slotSpan; i++) {
                if (grid[start + i] && grid[start + i][day]) {
                  grid[start + i][day] = {
                    occupied: true,
                    assignment: null,
                    span: 0,
                  };
                }
              }
            }
          }
        });
      });

      return { grid, classes: targetClasses, isDayColumn: true };
    } else {
      // Original grid structure for program view
      const grid = {};
      days.forEach((day) => {
        grid[day] = {};
        timeSlots.forEach((_, index) => {
          grid[day][index] = { classes: {} };
          targetClasses.forEach((cls) => {
            grid[day][index].classes[cls.id] = { occupied: false, assignment: null, span: 1 };
          });
        });

        const dayAssignments = getDayAssignments(day, selectedTeacherId, programId);
        dayAssignments.forEach(({ start, span, assignment }) => {
          if (targetClasses.some((c) => c.id === assignment.classId)) {
            const slotSpan = Math.round(assignment.duration / 30);
            grid[day][start].classes[assignment.classId] = {
              occupied: true,
              assignment,
              span: slotSpan,
            };
            for (let i = 1; i < slotSpan; i++) {
              if (grid[day][start + i]) {
                grid[day][start + i].classes[assignment.classId] = {
                  occupied: true,
                  assignment: null,
                  span: 0,
                };
              }
            }
          }
        });
      });

      return { grid, classes: targetClasses, isDayColumn: false };
    }
  };

  // Create merged schedule grid for full schedule
  const createMergedScheduleGrid = () => {
    const mergedGrid = {};
    days.forEach((day) => {
      mergedGrid[day] = {};
      timeSlots.forEach((_, timeIndex) => {
        mergedGrid[day][timeIndex] = { programs: {} };
        programs.forEach((program) => {
          mergedGrid[day][timeIndex].programs[program.id] = { classes: {} };
          classes
            .filter((c) => c.programId === program.id)
            .forEach((cls) => {
              mergedGrid[day][timeIndex].programs[program.id].classes[cls.id] = {
                occupied: false,
                assignment: null,
                span: 1,
              };
            });
        });
      });

      const dayAssignments = getDayAssignments(day, selectedTeacherId);
      dayAssignments.forEach(({ start, span, assignment }) => {
        const programId = getProgramId(assignment.classId);
        if (programId && mergedGrid[day][start]?.programs[programId]?.classes[assignment.classId]) {
          const slotSpan = Math.round(assignment.duration / 30);
          mergedGrid[day][start].programs[programId].classes[assignment.classId] = {
            occupied: true,
            assignment,
            span: slotSpan,
          };
          for (let i = 1; i < slotSpan; i++) {
            if (mergedGrid[day][start + i]) {
              mergedGrid[day][start + i].programs[programId].classes[assignment.classId] = {
                occupied: true,
                assignment: null,
                span: 0,
              };
            }
          }
        }
      });
    });
    return mergedGrid;
  };

  const getAvailableSlotsForTeacher = (teacherId) => {
    if (!teacherId) return {};
    const available = {};
    days.forEach((day) => {
      available[day] = timeSlots.map((_, index) => {
        const dayAssignments = getDayAssignments(day);
        const isOccupied = dayAssignments.some(
          (ass) =>
            ass.start <= index &&
            ass.start + ass.span > index &&
            ass.assignment.teacherId === teacherId
        );
        return !isOccupied;
      });
    });
    return available;
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const subjectName = getSubjectName(assignment.subjectId).toLowerCase();
    const teacherName = getTeacherName(assignment.teacherId).toLowerCase();
    const matchesSearch = subjectName.includes(searchTerm.toLowerCase()) || teacherName.includes(searchTerm.toLowerCase());
    const hasSchedule = !!assignment.timeSlot;
    const matchesTeacher = !filterOptions.teacherId || assignment.teacherId === filterOptions.teacherId;
    const matchesWithSchedule = filterOptions.showWithSchedule && hasSchedule;
    const matchesWithoutSchedule = filterOptions.showWithoutSchedule && !hasSchedule;
    // Get class or subject data for filtering by program and year level
    const classData = assignment.classId ? classes.find((c) => c.id === assignment.classId) : null;
    const subjectData = subjects.find((s) => s.id === assignment.subjectId);
    const programId = classData?.programId || subjectData?.programId || null;

    const matchesProgram = !selectedProgramId || programId === selectedProgramId;
    const matchesClass = !selectedClassId || assignment.classId === selectedClassId;
    return (
      matchesSearch &&
      matchesTeacher &&
      (matchesWithSchedule || matchesWithoutSchedule) &&
      matchesProgram &&
      matchesClass
    );
  });

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }
  if (!currentFile && !fullScheduleActive) {
    return <div className="p-4">No file selected.</div>;
  }

  const programsToShow = selectedProgramId
    ? programs.filter((p) => p.id === selectedProgramId)
    : programs;
  // Check if we should use day-column layout (specific program AND year level selected)
  const useDayColumnLayout = selectedProgramId && selectedClassId;

  const grids = (() => {
    if (selectedMergeClassId) {
      // Show merged class schedule
      const gridData = createScheduleGrid(null, null, selectedMergeClassId);
      const mergedClass = classes.find(cls => cls.id === selectedMergeClassId);
      return gridData ? [{
        program: { id: 'merged', name: `${mergedClass?.name || 'Merged Class'} Schedule` },
        ...gridData,
        isDayColumn: true
      }] : [];
    } else if (selectedClassId) {
      // Show specific class schedule
      const classData = classes.find(cls => cls.id === selectedClassId);
      const program = classData ? programs.find(p => p.id === classData.programId) : null;
      const gridData = createScheduleGrid(null, selectedClassId);
      return gridData ? [{
        program: program || { id: 'class', name: 'Class Schedule' },
        ...gridData,
        isDayColumn: true
      }] : [];
    } else if (selectedProgramId) {
      // Show program schedule
      const program = programs.find(p => p.id === selectedProgramId);
      const gridData = createScheduleGrid(selectedProgramId);
      return gridData ? [{ program, ...gridData, isDayColumn: false }] : [];
    } else if (fullScheduleActive) {
      // Show all programs
      return programs
        .map(program => {
          const gridData = createScheduleGrid(program.id);
          return gridData ? { program, ...gridData, classes: gridData.classes, isDayColumn: false } : null;
        })
        .filter(Boolean);
    } else {
      // Show current file's schedule
      const currentPrograms = [...new Set(classes.map(c => c.programId))].map(programId =>
        programs.find(p => p.id === programId)
      ).filter(Boolean);

      return currentPrograms
        .map(program => {
          const gridData = createScheduleGrid(program.id);
          return gridData ? { program, ...gridData, classes: gridData.classes, isDayColumn: false } : null;
        })
        .filter(Boolean);
    }
  })();

  const availableSlots = selectedTeacherId ? getAvailableSlotsForTeacher(selectedTeacherId) : {};
  const mergedGrid = fullScheduleActive ? createMergedScheduleGrid() : null;

  return (
    <>
      <div className="sticky top-0 z-30 pb-4 bg-[#f8f8f8]">
        <div className="max-w-7xl mx-auto px-6">
          <Toolbar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showArchived={showArchived}
            setShowArchived={setShowArchived}
          />
        </div>
      </div>

      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] bg-gray-50 overflow-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6 bg-white rounded-lg shadow-sm p-4">
              <div className="text-lg font-medium text-gray-700">
                {fullScheduleActive
                  ? "All Programs Schedule"
                  : `${currentFile?.semester || ""} | School Year: ${currentFile?.academic_year || ""}`}
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
              >
                Close Full Screen
              </button>
            </div>

            <div className="space-y-12">
              {grids.map(({ program, grid, classes: classList, isDayColumn }, progIndex) => (
                <div key={program.id || progIndex}>
                  {(!selectedProgramId || fullScheduleActive) && (
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">{program.name}</h2>
                  )}

                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div
                      ref={contentRef}
                      className="relative"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: "top left",
                        cursor: zoomLevel > 1 ? "grab" : "default",
                      }}
                    >
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-white sticky top-0 z-20">
                          <tr>
                            {isDayColumn ? (
                              <>
                                <th className="px-4 py-3 text-left font-semibold" style={{ width: "140px" }}>
                                  Time
                                </th>
                                {days.map((day) => (
                                  <th key={day} className="px-4 py-3 text-center font-semibold min-w-36">
                                    {day}
                                  </th>
                                ))}
                              </>
                            ) : (
                              <>
                                <th className="px-4 py-3 text-center font-semibold" style={{ width: "70px" }}>
                                  Day
                                </th>
                                <th className="px-4 py-3 text-left font-semibold" style={{ width: "140px" }}>
                                  Time
                                </th>
                                {classList.map((cls) => (
                                  <th key={cls.id} className="px-4 py-3 text-center font-semibold min-w-40">
                                    {cls.name}
                                  </th>
                                ))}
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                              </>
                            )}
                          </tr>
                        </thead>

                        <tbody className="bg-white">
                          {isDayColumn ? (
                            timeSlots.map((timeSlot, timeIndex) => {
                              const gridSlot = grid[timeIndex] || {};

                              return (
                                <tr key={timeIndex} className="border-b border-gray-100">
                                  <td className="px-4 py-2 font-medium text-gray-700 text-xs sticky left-0 bg-white z-10 border-r">
                                    {timeSlot}
                                  </td>

                                  {days.map((day) => {
                                    const cell = gridSlot[day] || { span: 1, occupied: false };
                                    if (cell.span === 0) return null;

                                    const assignment = cell.assignment;
                                    const isAvailable = selectedTeacherId && availableSlots[day]?.[timeIndex];

                                    if (cell.occupied && assignment) {
                                      const subjectName = getSubjectName(assignment.subjectId);
                                      const teacherName = getTeacherName(assignment.teacherId);
                                      const room = getAssignmentRoom(assignment);
                                      const color = getTeacherColor(assignment.teacherId);
                                      const lightBg = getLightBackgroundColor(color);

                                      return (
                                        <td
                                          key={`${timeIndex}-${day}`}
                                          rowSpan={cell.span}
                                          className="p-3 text-center align-middle border border-gray-200 relative"
                                          style={{
                                            backgroundColor: lightBg,
                                            borderColor: color,
                                            boxShadow: `inset 0 0 0 3px ${color}`,
                                          }}
                                          {...(userRole !== "view"
                                            ? {
                                              draggable: true,
                                              onDragStart: (e) => e.dataTransfer.setData("text/plain", assignment.id),
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, selectedClassId, selectedProgramId),
                                            }
                                            : {})}
                                        >


                                          <div className="text-xs leading-tight">
                                            {/* Small circle marker - Click to toggle tooltip */}
                                            <button
                                              className="w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                              style={{ backgroundColor: getDarkerColor(color) }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setTooltipPosition({
                                                  x: rect.left + window.scrollX,
                                                  y: rect.top + window.scrollY
                                                });

                                                // Toggle tooltip
                                                if (showTooltip && clickedCell?.id === assignment.id) {
                                                  setShowTooltip(false);
                                                  setClickedCell(null);
                                                } else {
                                                  setClickedCell(assignment);
                                                  setShowTooltip(true);
                                                }
                                              }}
                                              title="Click for details"
                                            ></button>
                                            <div className="font-bold text-gray-900">{subjectName}</div>
                                            <div className="text-gray-600">{teacherName}</div>
                                            {room !== "N/A" && <div className="text-gray-500 text-xs">{room}</div>}
                                          </div>
                                        </td>
                                      );
                                    }

                                    return (
                                      <td
                                        key={`${timeIndex}-${day}`}
                                        className={`p-3 border border-gray-200 text-center ${isAvailable ? "bg-teal-50" : ""}`}
                                        {...(userRole !== "view"
                                          ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, selectedClassId, selectedProgramId),
                                          }
                                          : {})}
                                      />
                                    );
                                  })}
                                </tr>
                              );
                            })
                          ) : (
                            days.map((day) => {
                              let dayHeaderRendered = false;

                              return timeSlots.map((timeSlot, timeIndex) => {
                                const gridSlot = grid[day]?.[timeIndex] || { classes: {} };
                                const row = [];

                                if (!dayHeaderRendered) {
                                  row.push(
                                    <td
                                      key={`${day}-header`}
                                      rowSpan={timeSlots.length}
                                      className="px-4 py-2 font-bold text-gray-700 text-center sticky left-0 bg-white z-10 border-r border-gray-300"
                                    >
                                      {day}
                                    </td>
                                  );
                                  dayHeaderRendered = true;
                                }

                                row.push(
                                  <td
                                    key={`${day}-${timeIndex}-time`}
                                    className="px-4 py-2 text-xs font-medium text-gray-600 sticky left-20 bg-white z-10 border-r border-gray-300"
                                  >
                                    {timeSlot}
                                  </td>
                                );

                                classList.forEach((cls) => {
                                  const cell = gridSlot.classes[cls.id] || { span: 1, occupied: false };
                                  if (cell.span === 0) return;

                                  const assignment = cell.assignment;
                                  const isAvailable = selectedTeacherId && availableSlots[day]?.[timeIndex];

                                  if (cell.occupied && assignment) {
                                    const subjectName = getSubjectName(assignment.subjectId);
                                    const teacherName = getTeacherName(assignment.teacherId);
                                    const room = getAssignmentRoom(assignment);
                                    const color = getTeacherColor(assignment.teacherId);
                                    const lightBg = getLightBackgroundColor(color);

                                    row.push(
                                      <td
                                        key={`${day}-${timeIndex}-${cls.id}`}
                                        rowSpan={cell.span}
                                        className="p-3 text-center align-middle border border-gray-200 relative"
                                        style={{
                                          backgroundColor: lightBg,
                                          borderColor: color,
                                          boxShadow: `inset 0 0 0 3px ${color}`,
                                        }}
                                        {...(userRole !== "view"
                                          ? {
                                            draggable: true,
                                            onDragStart: (e) => e.dataTransfer.setData("text/plain", assignment.id),
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, cls.id),
                                          }
                                          : {})}
                                      >


                                        <div className="text-xs leading-tight">
                                          {/* Small circle marker - Click to toggle tooltip */}
                                          <button
                                            className="w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: getDarkerColor(color) }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setTooltipPosition({
                                                x: rect.left + window.scrollX,
                                                y: rect.top + window.scrollY
                                              });

                                              // Toggle tooltip
                                              if (showTooltip && clickedCell?.id === assignment.id) {
                                                setShowTooltip(false);
                                                setClickedCell(null);
                                              } else {
                                                setClickedCell(assignment);
                                                setShowTooltip(true);
                                              }
                                            }}
                                            title="Click for details"
                                          ></button>
                                          <div className="font-bold text-gray-900">{subjectName}</div>
                                          <div className="text-gray-600">{teacherName}</div>
                                          {room !== "N/A" && <div className="text-gray-500 text-xs">{room}</div>}
                                        </div>
                                      </td>
                                    );
                                  } else {
                                    row.push(
                                      <td
                                        key={`${day}-${timeIndex}-${cls.id}`}
                                        className={`p-3 border border-gray-200 text-center ${isAvailable ? "bg-teal-50" : ""}`}
                                        {...(userRole !== "view"
                                          ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, cls.id),
                                          }
                                          : {})}
                                      />
                                    );
                                  }
                                });
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);


                                return <tr key={`${day}-${timeIndex}`}>{row}</tr>;
                              });
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isFullScreen && (
        <div className={`pr-6 pl-6 flex flex-col lg:flex-row gap-6`}>
          <div className="flex-1 space-y-0">
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 
                bg-white rounded-t-lg shadow-lg p-4 border z-[20] 
                w-[800px]">
              <div className="flex items-center justify-between">

                <div className="text-sm font-semibold text-gray-700">
                  {fullScheduleActive
                    ? "All Programs Schedule"
                    : `${currentFile?.semester || ""} | School Year: ${currentFile?.academic_year || ""}`}
                </div>

                <div className="flex items-center gap-2 w-48">
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={zoomLevel * 100}
                    onChange={handleZoomChange}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-gray-600">Zoom</span>
                </div>

              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white">
              {grids.map(({ program, grid, classes: classList, isDayColumn }, progIndex) => (
                <div key={program.id || progIndex}>
                  {(!selectedProgramId || fullScheduleActive) && (
                    <h2 className="text-lg font-medium mb-4 text-gray-800">{program.name}</h2>
                  )}

                  <div className="bg-white shadow-md mb-5 border overflow-auto" style={{ maxHeight: "calc(100vh - 200px)", maxWidth: "calc(100vw - 180px)", scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.3) transparent", }}>
                    <div
                      ref={contentRef}
                      className="relative"
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                        transformOrigin: "top left",
                        cursor: zoomLevel > 1 ? "grab" : "default",
                      }}
                    >
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-[#B4D5F7] text-zinc-900 sticky top-0 z-20">
                          <tr>
                            {isDayColumn ? (
                              <>
                                <th className="px-4 py-3 text-left font-semibold" style={{ width: "140px" }}>
                                  Time
                                </th>
                                {days.map((day) => (
                                  <th key={day} className="px-4 py-3 text-center font-semibold min-w-36">
                                    {day}
                                  </th>
                                ))}

                              </>
                            ) : (
                              <>
                                <th className="px-4 py-3 text-center font-semibold" style={{ width: "70px" }}>
                                  Day
                                </th>
                                <th className="px-4 py-3 text-left font-semibold" style={{ width: "140px" }}>
                                  Time
                                </th>
                                {classList.map((cls) => (
                                  <th key={cls.id} className="px-4 py-3 text-center font-semibold min-w-40">
                                    {cls.name}
                                  </th>
                                ))}
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                                <th className="min-w-20">&nbsp;</th>
                              </>
                            )}
                          </tr>
                        </thead>

                        <tbody className="bg-white">
                          {isDayColumn ? (
                            timeSlots.map((timeSlot, timeIndex) => {
                              const gridSlot = grid[timeIndex] || {};

                              return (
                                <tr key={timeIndex} className="border-b border-gray-100">
                                  <td className="px-4 py-2 font-medium text-gray-700 text-xs sticky left-0 bg-white z-10 border-r">
                                    {timeSlot}
                                  </td>

                                  {days.map((day) => {
                                    const cell = gridSlot[day] || { span: 1, occupied: false };
                                    if (cell.span === 0) return null;

                                    const assignment = cell.assignment;
                                    const isAvailable = selectedTeacherId && availableSlots[day]?.[timeIndex];

                                    if (cell.occupied && assignment) {
                                      const subjectName = getSubjectName(assignment.subjectId);
                                      const teacherName = getTeacherName(assignment.teacherId);
                                      const room = getAssignmentRoom(assignment);
                                      const color = getTeacherColor(assignment.teacherId);
                                      const lightBg = getLightBackgroundColor(color);

                                      return (
                                        <td
                                          key={`${timeIndex}-${day}`}
                                          rowSpan={cell.span}
                                          className="p-3 text-center align-middle border border-gray-200 relative"
                                          style={{
                                            backgroundColor: lightBg,
                                            borderColor: color,
                                            boxShadow: `inset 0 0 0 3px ${color}`,
                                          }}
                                          {...(userRole !== "view"
                                            ? {
                                              draggable: true,
                                              onDragStart: (e) => e.dataTransfer.setData("text/plain", assignment.id),
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, selectedClassId, selectedProgramId),
                                            }
                                            : {})}
                                        >


                                          <div className="text-xs leading-tight">
                                            {/* Small circle marker - Click to toggle tooltip */}
                                            <button
                                              className="w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                              style={{ backgroundColor: getDarkerColor(color) }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setTooltipPosition({
                                                  x: rect.left + window.scrollX,
                                                  y: rect.top + window.scrollY
                                                });

                                                // Toggle tooltip
                                                if (showTooltip && clickedCell?.id === assignment.id) {
                                                  setShowTooltip(false);
                                                  setClickedCell(null);
                                                } else {
                                                  setClickedCell(assignment);
                                                  setShowTooltip(true);
                                                }
                                              }}
                                              title="Click for details"
                                            ></button>
                                            <div className="font-bold text-gray-900">{subjectName}</div>
                                            <div className="text-gray-600">{teacherName}</div>
                                            {room !== "N/A" && <div className="text-gray-500 text-xs">{room}</div>}
                                          </div>
                                        </td>
                                      );
                                    }

                                    return (
                                      <td
                                        key={`${timeIndex}-${day}`}
                                        className={`p-3 border border-gray-200 text-center ${isAvailable ? "bg-teal-50" : ""}`}
                                        {...(userRole !== "view"
                                          ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, selectedClassId, selectedProgramId),
                                          }
                                          : {})}

                                      />

                                    );

                                  })}

                                </tr>
                              );
                            })
                          ) : (
                            days.map((day) => {
                              let dayHeaderRendered = false;

                              return timeSlots.map((timeSlot, timeIndex) => {
                                const gridSlot = grid[day]?.[timeIndex] || { classes: {} };
                                const row = [];

                                if (!dayHeaderRendered) {
                                  row.push(
                                    <td
                                      key={`${day}-header`}
                                      rowSpan={timeSlots.length}
                                      className="px-4 py-2 font-bold text-gray-700 text-center sticky left-0 bg-white z-10 border-r border-gray-300"
                                    >
                                      {day}
                                    </td>
                                  );
                                  dayHeaderRendered = true;
                                }

                                row.push(
                                  <td
                                    key={`${day}-${timeIndex}-time`}
                                    className="text-xs font-medium text-gray-600 sticky bg-white z-10 border text-nowrap text-center"
                                  >
                                    {timeSlot}
                                  </td>
                                );

                                classList.forEach((cls) => {
                                  const cell = gridSlot.classes[cls.id] || { span: 1, occupied: false };
                                  if (cell.span === 0) return;

                                  const assignment = cell.assignment;
                                  const isAvailable = selectedTeacherId && availableSlots[day]?.[timeIndex];

                                  if (cell.occupied && assignment) {
                                    const subjectName = getSubjectName(assignment.subjectId);
                                    const teacherName = getTeacherName(assignment.teacherId);
                                    const room = getAssignmentRoom(assignment);
                                    const color = getTeacherColor(assignment.teacherId);
                                    const lightBg = getLightBackgroundColor(color);

                                    row.push(
                                      <td
                                        key={`${day}-${timeIndex}-${cls.id}`}
                                        rowSpan={cell.span}
                                        className="p-3 text-center align-middle border border-gray-200 relative"
                                        style={{
                                          backgroundColor: lightBg,
                                          borderColor: color,
                                          boxShadow: `inset 0 0 0 3px ${color}`,
                                        }}
                                        {...(userRole !== "view"
                                          ? {
                                            draggable: true,
                                            onDragStart: (e) => e.dataTransfer.setData("text/plain", assignment.id),
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, cls.id),
                                          }
                                          : {})}
                                      >


                                        <div className="text-xs leading-tight">
                                          {/* Small circle marker - Click to toggle tooltip */}
                                          <button
                                            className="w-3 h-3 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                            style={{ backgroundColor: getDarkerColor(color) }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setTooltipPosition({
                                                x: rect.left + window.scrollX,
                                                y: rect.top + window.scrollY
                                              });

                                              // Toggle tooltip
                                              if (showTooltip && clickedCell?.id === assignment.id) {
                                                setShowTooltip(false);
                                                setClickedCell(null);
                                              } else {
                                                setClickedCell(assignment);
                                                setShowTooltip(true);
                                              }
                                            }}
                                            title="Click for details"
                                          ></button>
                                          <div className="font-bold text-gray-900">{subjectName}</div>
                                          <div className="text-gray-600">{teacherName}</div>
                                          {room !== "N/A" && <div className="text-gray-500 text-xs">{room}</div>}
                                        </div>
                                      </td>
                                    );
                                  } else {
                                    row.push(
                                      <td
                                        key={`${day}-${timeIndex}-${cls.id}`}
                                        className={`p-3 border border-gray-200 text-center ${isAvailable ? "bg-teal-50" : ""}`}
                                        {...(userRole !== "view"
                                          ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, cls.id),
                                          }
                                          : {})}
                                      />
                                    );
                                  }
                                });
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);
                                row.push(<td className="min-w-20">&nbsp;</td>);


                                return <tr key={`${day}-${timeIndex}`}>{row}</tr>;
                              });
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {userRole !== "view" && isAssignmentListOpen && (
            <AssignmentList
              filteredAssignments={filteredAssignments}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterOptions={filterOptions}
              setFilterOptions={setFilterOptions}
              setSelectedTeacherId={setSelectedTeacherId}
              teachers={teachers}
              classes={classes}
              subjects={subjects}
              getSubjectName={getSubjectName}
              getTeacherName={getTeacherName}
              getTeacherColor={getTeacherColor}
              getLightBackgroundColor={getLightBackgroundColor}
              getClassName={getClassName}
              getRoomName={getRoomName}
              getProgramName={getProgramName}
              userRole={userRole}
            />
          )}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && clickedCell && (
        <div
          className="fixed z-[100]"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <ScheduleCellTooltip
            assignment={clickedCell}
            onRemove={handleRemoveAssignment}
            onEdit={handleEditAssignment}
            onClose={() => {
              setShowTooltip(false);
              setClickedCell(null);
            }}
            getSubjectName={getSubjectName}
            getTeacherName={getTeacherName}
            getAssignmentRoom={getAssignmentRoom}
            getTeacherColor={getTeacherColor}
            getSubjectUnits={getSubjectUnits}
            getTimeSlotRange={getTimeSlotRange}
            days={days}
            timeSlots={timeSlots}
            rooms={rooms} // Add this
            roomAssignments={roomAssignments} // Add this
          />
        </div>
      )}

      {conflictModal.open && (
        <Modal
          title="Scheduling Conflict"
          type="alert"
          message={
            <ul className="list-disc pl-6 space-y-1">
              {conflictModal.conflicts.map((c, i) => (
                <li key={i} className="text-red-600">
                  {c}
                </li>
              ))}
            </ul>
          }
          onClose={() => setConflictModal({ open: false, conflicts: [] })}
        />
      )}

      {deleteModal.open && userRole !== "view" && (
        <Modal
          title="Delete Assignment"
          type="confirm"
          message="Are you sure you want to delete this assignment?"
          onClose={() => setDeleteModal({ open: false, assignmentId: null })}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}