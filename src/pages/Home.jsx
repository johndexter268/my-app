/* eslint-disable no-unused-vars */
/* eslint-disable no-unreachable */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import Modal from "../components/Modal"
export default function Home() {
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
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScheduleActive, setFullScheduleActive] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const contentRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'view';
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
    const handleYearLevelSchedule = (event) => {
      setSelectedYearLevel(event.detail.yearLevel || null);
    };
    const handleFullScreen = () => {
      setIsFullScreen((prev) => !prev);
    };
    window.addEventListener("fileSelected", handleFileSelected);
    window.addEventListener("viewZoom", handleZoom);
    window.addEventListener("viewFullSchedule", handleFullSchedule);
    window.addEventListener("viewByCourse", handleScheduleByCourse);
    window.addEventListener("viewByYearLevel", handleYearLevelSchedule);
    window.addEventListener("viewFullScreen", handleFullScreen);
    return () => {
      window.removeEventListener("fileSelected", handleFileSelected);
      window.removeEventListener("viewZoom", handleZoom);
      window.removeEventListener("viewFullSchedule", handleFullSchedule);
      window.removeEventListener("viewByCourse", handleScheduleByCourse);
      window.removeEventListener("viewByYearLevel", handleYearLevelSchedule);
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
  // const startTimeArray = [
  // "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  // "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  // "5:00 PM", "6:00 PM"
  // ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
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
  const getYearLevel = (classId) => {
    return classes.find((c) => c.id === classId)?.yearLevel || null;
  };
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
  const getDayAssignments = (day, teacherId = null, programId = null, yearLevel = null) => {
    let filtered = timeAssignments.filter((a) => a.day === day);
    if (teacherId) {
      filtered = filtered.filter((a) => a.teacherId === teacherId);
    }
    if (programId) {
      filtered = filtered.filter((a) => getProgramId(a.classId) === programId);
    }
    if (yearLevel) {
      filtered = filtered.filter((a) => getYearLevel(a.classId) === yearLevel);
    }
    return filtered
      .map((a) => {
        const startTime = a.timeSlot.split('-')[0].trim(); // Extract start time from range
        const slotIndex = timeSlots.findIndex((slot) => slot.split('-')[0].trim() === startTime);
        const slotSpan = Math.round(a.duration / 30); // Calculate span for rowspan (e.g., 180 min = 6 slots)
        return {
          start: slotIndex,
          span: slotSpan,
          assignment: a,
        };
      })
      .filter((a) => a.start !== -1)
      .sort((a, b) => a.start - b.start);
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
  const createScheduleGrid = (programId = null, yearLevel = null) => {
    const grid = {};
    const allYearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const progClasses = classes.filter((c) => !programId || c.programId === programId);
    const levels = yearLevel ? allYearLevels.filter((l) => l === yearLevel) : allYearLevels;
    if (levels.length === 0) return null;
    days.forEach((day) => {
      grid[day] = {};
      const dayAssignments = getDayAssignments(day, selectedTeacherId, programId, yearLevel);
      timeSlots.forEach((_, index) => {
        grid[day][index] = { yearLevels: {} };
        levels.forEach((level) => {
          grid[day][index].yearLevels[level] = { occupied: false, assignment: null, span: 1 };
        });
      });
      dayAssignments.forEach(({ start, span, assignment }) => {
        const assYearLevel = getYearLevel(assignment.classId);
        if (assYearLevel && grid[day][start] && levels.includes(assYearLevel)) {
          const slotSpan = Math.round(assignment.duration / 30); // Calculate span for rowspan (e.g., 180 min = 6 slots)
          grid[day][start].yearLevels[assYearLevel] = {
            occupied: true,
            assignment: assignment,
            span: slotSpan,
          };
          for (let i = 1; i < slotSpan; i++) {
            if (grid[day][start + i]) {
              grid[day][start + i].yearLevels[assYearLevel] = {
                occupied: true,
                assignment: null,
                span: 0,
              };
            }
          }
        }
      });
    });
    return { grid, levels };
  };
  // Create merged schedule grid for full schedule
  const createMergedScheduleGrid = () => {
    const mergedGrid = {};
    days.forEach((day) => {
      mergedGrid[day] = {};
      timeSlots.forEach((_, timeIndex) => {
        mergedGrid[day][timeIndex] = { programs: {} };
        programs.forEach((program) => {
          mergedGrid[day][timeIndex].programs[program.id] = { yearLevels: {} };
          yearLevels.forEach((level) => {
            mergedGrid[day][timeIndex].programs[program.id].yearLevels[level] = {
              occupied: false,
              assignment: null,
              span: 1
            };
          });
        });
      });
      const dayAssignments = getDayAssignments(day, selectedTeacherId);
      dayAssignments.forEach(({ start, span, assignment }) => {
        const programId = getProgramId(assignment.classId);
        const assYearLevel = getYearLevel(assignment.classId);
        if (programId && assYearLevel && mergedGrid[day][start]) {
          const slotSpan = Math.round(assignment.duration / 30); // Calculate span for rowspan (e.g., 180 min = 6 slots)
          mergedGrid[day][start].programs[programId].yearLevels[assYearLevel] = {
            occupied: true,
            assignment: assignment,
            span: slotSpan,
          };
          for (let i = 1; i < slotSpan; i++) {
            if (mergedGrid[day][start + i]) {
              mergedGrid[day][start + i].programs[programId].yearLevels[assYearLevel] = {
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
  // Create schedule grid with Day as columns and Time as rows
  const createDayColumnScheduleGrid = (programId, yearLevel) => {
    const grid = {};
    timeSlots.forEach((timeSlot, timeIndex) => {
      grid[timeIndex] = {};
      days.forEach((day) => {
        grid[timeIndex][day] = { occupied: false, assignment: null, span: 1 };
      });
    });
    days.forEach((day) => {
      const dayAssignments = getDayAssignments(day, selectedTeacherId, programId, yearLevel);
      dayAssignments.forEach(({ start, span, assignment }) => {
        const assYearLevel = getYearLevel(assignment.classId);
        if (assYearLevel === yearLevel) {
          grid[start][day] = {
            occupied: true,
            assignment: assignment,
            span: span,
          };
          for (let i = 1; i < span; i++) {
            if (grid[start + i]) {
              grid[start + i][day] = {
                occupied: true,
                assignment: null,
                span: 0,
              };
            }
          }
        }
      });
    });
    return grid;
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
  const getTimeSlotRange = (startTime, duration) => {
    const startMinutes = parseTime(startTime);
    if (startMinutes === null) return "";
    const endMinutes = startMinutes + parseInt(duration);
    const endTime = formatTime(endMinutes);
    return `${startTime}-${endTime}`;
  };
  const handleDrop = async (event, day, timeIndex, yearLevel, programId = null) => {
    event.preventDefault();
    const assignmentId = event.dataTransfer.getData("text/plain");
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      console.error("Assignment not found for ID:", assignmentId);
      return;
    }
    let updatedAssignment;
    let newRoomId;
    // Determine the target class based on programId and yearLevel
    const targetClass = programId
      ? classes.find((c) => c.programId === programId && c.yearLevel === yearLevel)
      : classes.find((c) => c.yearLevel === yearLevel);
    if (!targetClass && (assignment.type === "subject" || assignment.type === "room")) {
      setConflictModal({
        open: true,
        conflicts: ["No matching class found for the selected program and year level."],
      });
      return;
    }
    const startTime = timeSlots[timeIndex].split('-')[0].trim();
    if (assignment.type === "time") {
      const assYearLevel = getYearLevel(assignment.classId);
      // Removed unnecessary year level check as filtering ensures match
      const timeSlot = getTimeSlotRange(startTime, assignment.duration);
      updatedAssignment = {
        ...assignment,
        day,
        timeSlot,
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
      if (getYearLevel(assignment.classId) !== yearLevel) {
        setConflictModal({
          open: true,
          conflicts: ["Class year level does not match the drop column."],
        });
        return;
      }
      const timeSlot = getTimeSlotRange(startTime, 30);
      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        day,
        timeSlot,
        duration: 30,
        type: "time",
        scheduleFileId: currentFile.id,
      };
      newRoomId = assignment.roomId;
    } else if (assignment.type === "subject") {
      const subject = subjects.find((s) => s.id === assignment.subjectId);
      if (subject && subject.yearLevel !== yearLevel) {
        setConflictModal({
          open: true,
          conflicts: ["Subject year level does not match the drop column."],
        });
        return;
      }
      const timeSlot = getTimeSlotRange(startTime, 30);
      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: targetClass?.id || "",
        day,
        timeSlot,
        duration: 30,
        type: "time",
        scheduleFileId: currentFile.id,
      };
      newRoomId = null;
    }
    let dayAssignments = getDayAssignments(day, null);
    if (assignment.type === "time") {
      dayAssignments = dayAssignments.filter(({ assignment: ass }) => ass.id !== assignment.id);
    }
    const conflictSet = new Set();
    const startSlot = timeSlots.findIndex((slot) => slot.split('-')[0].trim() === updatedAssignment.timeSlot.split('-')[0].trim());
    const span = Math.round(updatedAssignment.duration / 30);
    // Conflict detection
    const teacherConflicts = new Set();
    const classConflicts = new Set();
    const subjectConflicts = new Set();
    const roomConflicts = new Set();
    for (let i = startSlot; i < startSlot + span; i++) {
      dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
        if (start <= i && start + assSpan > i) {
          if (
            ass.teacherId === updatedAssignment.teacherId &&
            ass.subjectId !== updatedAssignment.subjectId &&
            !teacherConflicts.has(ass.teacherId)
          ) {
            teacherConflicts.add(ass.teacherId);
            conflictSet.add(
              `Teacher ${getTeacherName(ass.teacherId)} is already assigned to ${getSubjectName(ass.subjectId)} at this time.`
            );
          }
          if (ass.classId === updatedAssignment.classId && !classConflicts.has(ass.classId)) {
            classConflicts.add(ass.classId);
            conflictSet.add(`Class ${getClassName(ass.classId)} is already scheduled at this time.`);
          }
          if (
            ass.subjectId === updatedAssignment.subjectId &&
            ass.day === updatedAssignment.day &&
            ass.timeSlot === updatedAssignment.timeSlot &&
            ass.teacherId !== updatedAssignment.teacherId &&
            !subjectConflicts.has(ass.subjectId)
          ) {
            subjectConflicts.add(ass.subjectId);
            conflictSet.add(
              `Subject ${getSubjectName(ass.subjectId)} is already assigned to ${getTeacherName(ass.teacherId)} at this time.`
            );
          }
        }
      });
    }
    if (newRoomId) {
      const room = rooms.find((r) => r.id === newRoomId);
      if (room) {
        const totalStudents = getTotalStudentsForMergedClasses(updatedAssignment, day, updatedAssignment.timeSlot);
        if (totalStudents > room.capacity) {
          conflictSet.add(`Room ${room.name} capacity (${room.capacity}) exceeded. Total students: ${totalStudents}`);
        }
      }
      for (let i = startSlot; i < startSlot + span; i++) {
        dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
          if (start <= i && start + assSpan > i) {
            const assRoomId = getAssignmentRoom(ass) !== "N/A"
              ? roomAssignments.find(
                (ra) =>
                  ra.scheduleFileId === ass.scheduleFileId &&
                  ra.subjectId === ass.subjectId &&
                  ra.teacherId === ass.teacherId &&
                  ra.classId === ass.classId
              )?.roomId
              : null;
            if (
              assRoomId &&
              newRoomId === assRoomId &&
              !(
                ass.subjectId === updatedAssignment.subjectId &&
                ass.teacherId === updatedAssignment.teacherId &&
                ass.day === updatedAssignment.day &&
                ass.timeSlot === updatedAssignment.timeSlot
              ) &&
              !roomConflicts.has(assRoomId)
            ) {
              roomConflicts.add(assRoomId);
              conflictSet.add(`Room ${getRoomName(assRoomId)} is already occupied by another class.`);
            }
          }
        });
      }
    }
    if (conflictSet.size > 0) {
      setConflictModal({
        open: true,
        conflicts: [...conflictSet],
      });
      return;
    }
    try {
      const result = assignment.type === "time"
        ? await window.api.updateTimeSlotAssignment(updatedAssignment)
        : await window.api.assignTimeSlot(updatedAssignment);
      if (result.success) {
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
        // Update state to ensure visibility
        setTimeAssignments((prev) => {
          if (assignment.type === "time") {
            return prev.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
          }
          return [...prev, updatedAssignment];
        });
        setRoomAssignments((prev) => {
          const existing = prev.find(
            (ra) =>
              ra.scheduleFileId === updatedAssignment.scheduleFileId &&
              ra.subjectId === updatedAssignment.subjectId &&
              ra.teacherId === updatedAssignment.teacherId &&
              ra.classId === updatedAssignment.classId
          );
          if (existing && newRoomId) {
            return prev.map((ra) =>
              ra.id === existing.id ? { ...ra, roomId: newRoomId } : ra
            );
          }
          if (newRoomId) {
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                scheduleFileId: updatedAssignment.scheduleFileId,
                subjectId: updatedAssignment.subjectId,
                teacherId: updatedAssignment.teacherId,
                classId: updatedAssignment.classId,
                roomId: newRoomId,
              },
            ];
          }
          return prev;
        });
        setAssignments((prev) => {
          if (assignment.type === "time") {
            return prev.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
          }
          // Remove the original subject/room assignment and add the new time assignment
          const filtered = prev.filter((a) => a.id !== assignment.id);
          return [...filtered, updatedAssignment];
        });
        // Refresh assignments to ensure consistency
        const data = await window.api.getAssignments(currentFile.id);
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
    const yearLevel = classData?.yearLevel || subjectData?.yearLevel || null;
    // Apply program and year level filters
    const matchesProgram = !selectedProgramId || programId === selectedProgramId;
    const matchesYearLevel = !selectedYearLevel || yearLevel === selectedYearLevel;
    return (
      matchesSearch &&
      matchesTeacher &&
      (matchesWithSchedule || matchesWithoutSchedule) &&
      matchesProgram &&
      matchesYearLevel
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
  const useDayColumnLayout = selectedProgramId && selectedYearLevel;
  const grids = useDayColumnLayout
    ? [{
      program: programs.find((p) => p.id === selectedProgramId),
      grid: createDayColumnScheduleGrid(selectedProgramId, selectedYearLevel),
      isDayColumn: true,
    }]
    : programsToShow
      .map((program) => {
        const gridData = createScheduleGrid(program.id, selectedYearLevel);
        return gridData ? { program, ...gridData, isDayColumn: false } : null;
      })
      .filter(Boolean);
  const availableSlots = selectedTeacherId ? getAvailableSlotsForTeacher(selectedTeacherId) : {};
  const mergedGrid = fullScheduleActive ? createMergedScheduleGrid() : null;
  return (
    <>
      {isFullScreen && (
        <div className="fixed inset-0 bg-white z-[9999] overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                {/* <h1 className="text-2xl font-bold">CET Class Schedule</h1> */}
                <div className="text-sm text-gray-600">
                  {fullScheduleActive ? "All Schedules" : `${currentFile.semester} | S.Y. ${currentFile.academic_year}`}
                </div>
              </div>
              <button
                onClick={() => setIsFullScreen(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="space-y-8">
              {fullScheduleActive ? (
                <div>
                  <h2 className="text-xl font-bold mb-4">All Programs Schedule</h2>
                  <div className="bg-white rounded-lg shadow-sm border overflow-auto">
                    <div
                      ref={contentRef}
                      className="relative"
                      style={{
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                        transformOrigin: 'top left',
                        cursor: zoomLevel > 1 ? 'grab' : 'default',
                      }}
                    >
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-gradient-to-r from-slate-800 to-slate-900 sticky top-0 z-10">
                          <tr className="bg-gray-50">
                            <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "80px" }}>Program</th>
                            <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "60px" }}>Day</th>
                            <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                            {yearLevels.map((level) => (
                              <th key={level} className="border p-3 text-center text-zinc-900 font-semibold">{level}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {programs.map((program, progIndex) => {
                            const rows = [];
                            let programRowRendered = false;
                            days.forEach((day) => {
                              let dayColumnRendered = false;
                              timeSlots.forEach((timeSlot, timeIndex) => {
                                const gridSlot = mergedGrid[day][timeIndex];
                                const row = [];
                                if (!programRowRendered) {
                                  const totalRows = days.length * timeSlots.length;
                                  row.push(
                                    <td
                                      key={`${program.id}-program-column`}
                                      className="border p-1 font-bold text-sm bg-gray-100"
                                      rowSpan={totalRows}
                                      style={{
                                        verticalAlign: "middle",
                                        textAlign: "center",
                                        width: "80px",
                                        minWidth: "80px",
                                        maxWidth: "80px",
                                        writingMode: "vertical-rl",
                                        textOrientation: "mixed",
                                      }}
                                    >
                                      {program.name}
                                    </td>
                                  );
                                  programRowRendered = true;
                                }
                                if (!dayColumnRendered) {
                                  row.push(
                                    <td
                                      key={`${day}-day-column`}
                                      className="border p-1 font-bold text-sm"
                                      rowSpan={timeSlots.length}
                                      style={{
                                        verticalAlign: "middle",
                                        textAlign: "center",
                                        width: "60px",
                                        minWidth: "60px",
                                        maxWidth: "60px",
                                      }}
                                    >
                                      {day}
                                    </td>
                                  );
                                  dayColumnRendered = true;
                                }
                                const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                                row.push(
                                  <td
                                    key={`${day}-${timeIndex}-time`}
                                    className="border border-gray-300 p-1 text-xs bg-white text-zinc-900"
                                    style={{ height: "35px", width: "100px" }}
                                  >
                                    {timeSlot}
                                  </td>
                                );
                                yearLevels.forEach((level) => {
                                  const levelData = gridSlot.programs[program.id].yearLevels[level];
                                  if (levelData.span === 0) return;
                                  if (levelData.occupied && levelData.assignment) {
                                    const assignment = levelData.assignment;
                                    const subjectName = getSubjectName(assignment.subjectId);
                                    const teacherName = getTeacherName(assignment.teacherId);
                                    const room = getAssignmentRoom(assignment);
                                    const color = getTeacherColor(assignment.teacherId);
                                    const lightBg = getLightBackgroundColor(color);
                                    row.push(
                                      <td
                                        key={`${program.id}-${day}-${timeIndex}-${level}`}
                                        className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move' : ''
                                          }`}
                                        style={{
                                          maxWidth: "100px",
                                          height: `${35 * levelData.span}px`,
                                          verticalAlign: "middle",
                                          backgroundColor: lightBg,
                                          borderColor: color,
                                          boxShadow: `inset 0 0 0 2px ${color}`,
                                        }}
                                        rowSpan={levelData.span}
                                        {...(userRole !== 'view'
                                          ? {
                                            draggable: true,
                                            onDragStart: (e) => {
                                              e.dataTransfer.setData("text/plain", assignment.id);
                                              e.dataTransfer.effectAllowed = "move";
                                            },
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, level, program.id),
                                          }
                                          : {})}
                                      >
                                        <div className="flex items-center justify-start h-full px-3 py-2">
                                          <div className="relative group">
                                            <div
                                              className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                              style={{
                                                backgroundColor: color,
                                                boxShadow: `inset 0 0 0 2px ${color}`,
                                              }}
                                            ></div>
                                            <div
                                              className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                              style={{ zIndex: 1000 }}
                                            >
                                              <div className="text-left space-y-1">
                                                <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                  {subjectName}
                                                </div>
                                                <div className="text-blue-200">{teacherName}</div>
                                                <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                <div className="text-gray-300">Room: {room}</div>
                                                <div className="text-gray-300">Program: {program.name}</div>
                                                {userRole !== 'view' && (
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() =>
                                                        setEditingAssignment({
                                                          ...assignment,
                                                          startTime: assignment.timeSlot.split('-')[0].trim(),
                                                          duration: assignment.duration,
                                                          roomId: roomAssignments.find(
                                                            (ra) =>
                                                              ra.scheduleFileId === assignment.scheduleFileId &&
                                                              ra.subjectId === assignment.subjectId &&
                                                              ra.teacherId === assignment.teacherId &&
                                                              ra.classId === assignment.classId
                                                          )?.roomId || '',
                                                        })
                                                      }
                                                      className="text-blue-500 hover:text-blue-300 text-xs"
                                                      title="Edit"
                                                    >
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={() => handleDelete(assignment.id)}
                                                      className="text-red-500 hover:text-red-300 text-xs"
                                                      title="Remove"
                                                    >
                                                      <FiTrash2 />
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                            </div>
                                          </div>
                                          <div className="flex-1 text-left overflow-hidden">
                                            <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                              {subjectName}
                                            </div>
                                            <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  } else {
                                    const bgColor = isAvailable ? "bg-teal-50" : "";
                                    row.push(
                                      <td
                                        key={`${program.id}-${day}-${timeIndex}-${level}`}
                                        className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                        style={{ minWidth: "140px", height: "35px" }}
                                        {...(userRole !== 'view'
                                          ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, level, program.id),
                                          }
                                          : {})}
                                      ></td>
                                    );
                                  }
                                });
                                rows.push(
                                  <tr key={`${program.id}-${day}-${timeIndex}`}>
                                    {row}
                                  </tr>
                                );
                              });
                            });
                            return rows;
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                grids.map(({ program, grid, levels, isDayColumn }, progIndex) => (
                  <div key={progIndex}>
                    {!selectedProgramId && <h2 className="text-xl font-bold mb-4">{program.name}</h2>}
                    <div className="bg-white rounded-lg shadow-sm border overflow-x-auto overflow-y-auto isolate">
                      <div
                        ref={contentRef}
                        className="relative"
                        style={{
                          transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                          transformOrigin: 'top left',
                          cursor: zoomLevel > 1 ? 'grab' : 'default',
                        }}
                      >
                        <table className="w-full border-collapse text-sm">
                          <thead className="bg-gradient-to-r from-slate-800 to-slate-900 sticky top-0 z-10">
                            {isDayColumn ? (
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                                {days.map((day) => (
                                  <th key={day} className="border p-3 text-center text-zinc-900 font-semibold">{day}</th>
                                ))}
                              </tr>
                            ) : (
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "60px" }}>
                                  {fullScheduleActive ? "All Schedules" : ""}
                                </th>
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                                {levels.map((level) => (
                                  <th key={level} className="border p-3 text-center text-zinc-900 font-semibold">{level}</th>
                                ))}
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {isDayColumn ? (
                              timeSlots.map((timeSlot, timeIndex) => {
                                const gridSlot = grid[timeIndex];
                                return (
                                  <tr key={`time-${timeIndex}`}>
                                    <td
                                      className="border border-gray-300 p-1 text-xs bg-white text-zinc-900 font-semibold"
                                      style={{ height: "35px", width: "120px" }}
                                    >
                                      {timeSlot}
                                    </td>
                                    {days.map((day) => {
                                      const dayData = gridSlot[day];
                                      if (dayData.span === 0) return null;
                                      if (dayData.occupied && dayData.assignment) {
                                        const assignment = dayData.assignment;
                                        const subjectName = getSubjectName(assignment.subjectId);
                                        const teacherName = getTeacherName(assignment.teacherId);
                                        const room = getAssignmentRoom(assignment);
                                        const color = getTeacherColor(assignment.teacherId);
                                        const lightBg = getLightBackgroundColor(color);
                                        return (
                                          <td
                                            key={`${timeIndex}-${day}`}
                                            className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move hover:cursor-grabbing' : ''
                                              }`}
                                            style={{
                                              maxWidth: "140px",
                                              height: `${35 * dayData.span}px`,
                                              verticalAlign: "middle",
                                              backgroundColor: lightBg,
                                              borderColor: color,
                                              boxShadow: `inset 0 0 0 2px ${color}`,
                                            }}
                                            rowSpan={dayData.span}
                                            {...(userRole !== 'view'
                                              ? {
                                                draggable: true,
                                                onDragStart: (e) => {
                                                  e.dataTransfer.setData("text/plain", assignment.id);
                                                  e.dataTransfer.effectAllowed = "move";
                                                },
                                                onDragOver: (e) => e.preventDefault(),
                                                onDrop: (e) => handleDrop(e, day, timeIndex, selectedYearLevel, selectedProgramId),
                                              }
                                              : {})}
                                          >
                                            <div className="flex items-center justify-start h-full px-3 py-2">
                                              <div className="relative group">
                                                <div
                                                  className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                                  style={{
                                                    backgroundColor: color,
                                                    boxShadow: `inset 0 0 0 2px ${color}`,
                                                  }}
                                                ></div>
                                                <div
                                                  className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                                  style={{ zIndex: 1000 }}
                                                >
                                                  {editingAssignment && editingAssignment.id === assignment.id && userRole !== 'view' ? (
                                                    <div className="space-y-2">
                                                      <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                        {subjectName}
                                                      </div>
                                                      <div className="text-blue-200">{teacherName}</div>
                                                      <div>
                                                        <label className="block text-gray-300">Start Time</label>
                                                        <select
                                                          value={editingAssignment.startTime || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, startTime: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">Select start time</option>
                                                          {timeSlots.map((slot) => (
                                                            <option key={slot} value={slot.split('-')[0].trim()}>{slot}</option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="block text-gray-300">Duration</label>
                                                        <select
                                                          value={editingAssignment.duration || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, duration: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">Select duration</option>
                                                          <option value="60">1 hour</option>
                                                          <option value="120">2 hours</option>
                                                          <option value="180">3 hours</option>
                                                          <option value="240">4 hours</option>
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="block text-gray-300">Room</label>
                                                        <select
                                                          value={editingAssignment.roomId || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, roomId: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">No Room</option>
                                                          {rooms.map((room) => (
                                                            <option key={room.id} value={room.id}>{room.name}</option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() =>
                                                            handleSaveEdit(assignment.id, {
                                                              ...assignment,
                                                              startTime: editingAssignment.startTime,
                                                              duration: editingAssignment.duration,
                                                              roomId: editingAssignment.roomId,
                                                            })
                                                          }
                                                          className="px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                                                        >
                                                          Save
                                                        </button>
                                                        <button
                                                          onClick={() => setEditingAssignment(null)}
                                                          className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="text-left space-y-1">
                                                      <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                        {subjectName}
                                                      </div>
                                                      <div className="text-blue-200">{teacherName}</div>
                                                      <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                      <div className="text-gray-300">Room: {room}</div>
                                                      {userRole !== 'view' && (
                                                        <div className="flex gap-2">
                                                          <button
                                                            onClick={() =>
                                                              setEditingAssignment({
                                                                ...assignment,
                                                                startTime: assignment.timeSlot.split('-')[0].trim(),
                                                                duration: assignment.duration,
                                                                roomId: roomAssignments.find(
                                                                  (ra) =>
                                                                    ra.scheduleFileId === assignment.scheduleFileId &&
                                                                    ra.subjectId === assignment.subjectId &&
                                                                    ra.teacherId === assignment.teacherId &&
                                                                    ra.classId === assignment.classId
                                                                )?.roomId || '',
                                                              })
                                                            }
                                                            className="text-blue-500 hover:text-blue-300 text-xs"
                                                            title="Edit"
                                                          >
                                                            Edit
                                                          </button>
                                                          <button
                                                            onClick={() => handleDelete(assignment.id)}
                                                            className="text-red-500 hover:text-red-300 text-xs"
                                                            title="Remove"
                                                          >
                                                            <FiTrash2 />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                  <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                                </div>
                                              </div>
                                              <div className="flex-1 text-left overflow-hidden">
                                                <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                                  {subjectName}
                                                </div>
                                                <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      } else {
                                        const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                                        const bgColor = isAvailable ? "bg-teal-50" : "";
                                        return (
                                          <td
                                            key={`${timeIndex}-${day}`}
                                            className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                            style={{ minWidth: "140px", height: "35px" }}
                                            {...(userRole !== 'view'
                                              ? {
                                                onDragOver: (e) => e.preventDefault(),
                                                onDrop: (e) => handleDrop(e, day, timeIndex, selectedYearLevel, selectedProgramId),
                                              }
                                              : {})}
                                          ></td>
                                        );
                                      }
                                    })}
                                  </tr>
                                );
                              })
                            ) : (
                              days.map((day) => {
                                const rows = [];
                                let dayColumnRendered = false;
                                timeSlots.forEach((timeSlot, timeIndex) => {
                                  const gridSlot = grid[day][timeIndex];
                                  const row = [];
                                  if (!dayColumnRendered) {
                                    row.push(
                                      <td
                                        key={`${day}-day-column`}
                                        className="border p-1 font-bold text-sm"
                                        rowSpan={timeSlots.length}
                                        style={{
                                          verticalAlign: "middle",
                                          textAlign: "center",
                                          width: "60px",
                                          minWidth: "60px",
                                          maxWidth: "60px",
                                        }}
                                      >
                                        {day}
                                      </td>
                                    );
                                    dayColumnRendered = true;
                                  }
                                  const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                                  row.push(
                                    <td
                                      key={`${day}-${timeIndex}-time`}
                                      className="border border-gray-300 p-1 text-xs bg-white text-zinc-900"
                                      style={{ height: "35px", width: "100px" }}
                                    >
                                      {timeSlot}
                                    </td>
                                  );
                                  levels.forEach((level) => {
                                    const levelData = gridSlot.yearLevels[level];
                                    if (levelData.span === 0) return;
                                    if (levelData.occupied && levelData.assignment) {
                                      const assignment = levelData.assignment;
                                      const subjectName = getSubjectName(assignment.subjectId);
                                      const teacherName = getTeacherName(assignment.teacherId);
                                      const room = getAssignmentRoom(assignment);
                                      const color = getTeacherColor(assignment.teacherId);
                                      const lightBg = getLightBackgroundColor(color);
                                      row.push(
                                        <td
                                          key={`${day}-${timeIndex}-${level}`}
                                          className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move hover:cursor-grabbing' : ''
                                            }`}
                                          style={{
                                            maxWidth: "100px",
                                            height: `${35 * levelData.span}px`,
                                            verticalAlign: "middle",
                                            backgroundColor: lightBg,
                                            borderColor: color,
                                            boxShadow: `inset 0 0 0 2px ${color}`,
                                          }}
                                          rowSpan={levelData.span}
                                          {...(userRole !== 'view'
                                            ? {
                                              draggable: true,
                                              onDragStart: (e) => {
                                                e.dataTransfer.setData("text/plain", assignment.id);
                                                e.dataTransfer.effectAllowed = "move";
                                              },
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, level),
                                            }
                                            : {})}
                                        >
                                          <div className="flex items-center justify-start h-full px-3 py-2">
                                            <div className="relative group">
                                              <div
                                                className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                                style={{
                                                  backgroundColor: color,
                                                  boxShadow: `inset 0 0 0 2px ${color}`,
                                                }}
                                              ></div>
                                              <div
                                                className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                                style={{ zIndex: 1000 }}
                                              >
                                                <div className="text-left space-y-1">
                                                  <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                    {subjectName}
                                                  </div>
                                                  <div className="text-blue-200">{teacherName}</div>
                                                  <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                  <div className="text-gray-300">Room: {room}</div>
                                                  {userRole !== 'view' && (
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={() =>
                                                          setEditingAssignment({
                                                            ...assignment,
                                                            startTime: assignment.timeSlot.split('-')[0].trim(),
                                                            duration: assignment.duration,
                                                            roomId: roomAssignments.find(
                                                              (ra) =>
                                                                ra.scheduleFileId === assignment.scheduleFileId &&
                                                                ra.subjectId === assignment.subjectId &&
                                                                ra.teacherId === assignment.teacherId &&
                                                                ra.classId === assignment.classId
                                                            )?.roomId || '',
                                                          })
                                                        }
                                                        className="text-blue-500 hover:text-blue-300 text-xs"
                                                        title="Edit"
                                                      >
                                                        Edit
                                                      </button>
                                                      <button
                                                        onClick={() => handleDelete(assignment.id)}
                                                        className="text-red-500 hover:text-red-300 text-xs"
                                                        title="Remove"
                                                      >
                                                        <FiTrash2 />
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                              </div>
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                              <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                                {subjectName}
                                              </div>
                                              <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    } else {
                                      const bgColor = isAvailable ? "bg-teal-50" : "";
                                      row.push(
                                        <td
                                          key={`${day}-${timeIndex}-${level}`}
                                          className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                          style={{ minWidth: "140px", height: "35px" }}
                                          {...(userRole !== 'view'
                                            ? {
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, level),
                                            }
                                            : {})}
                                        ></td>
                                      );
                                    }
                                  });
                                  rows.push(
                                    <tr key={`${day}-${timeIndex}`}>
                                      {row}
                                    </tr>
                                  );
                                });
                                return rows;
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {!isFullScreen && (
        <div className={`p-4 bg-white flex flex-col lg:flex-row gap-4 ${userRole !== 'view' ? 'pr-96' : ''}`} style={{ zIndex: 10 }}>
          <div className="bg-white rounded-lg mb-6 flex-1">
            <div className="bg-white rounded-lg mb-6">
              {/* <h1 className="text-2xl font-bold mb-2">CET Class Schedule</h1> */}
              <div className="text-sm text-gray-600">
                {fullScheduleActive ? "All Schedules" : `${currentFile.semester} | S.Y. ${currentFile.academic_year}`}
              </div>
            </div>
            {fullScheduleActive ? (
              <div>
                <h2 className="text-xl font-bold mt-4 mb-4">All Programs Schedule</h2>
                <div
                  className="bg-white rounded-lg shadow-sm border overflow-x-auto overflow-y-auto isolate"
                  style={{
                    maxHeight: 'calc(100vh - 200px)',
                    zIndex: 10,
                  }}
                >
                  <div
                    ref={contentRef}
                    className="relative"
                    style={{
                      transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      cursor: zoomLevel > 1 ? 'grab' : 'default',
                    }}
                  >
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gradient-to-r from-slate-800 to-slate-900 sticky top-0 z-10">
                        <tr className="bg-gray-50">
                          <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "80px" }}>Program</th>
                          <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "60px" }}>Day</th>
                          <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                          {yearLevels.map((level) => (
                            <th key={level} className="border p-3 text-center text-zinc-900 font-semibold">{level}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {programs.map((program, progIndex) => {
                          const rows = [];
                          let programRowRendered = false;
                          days.forEach((day) => {
                            let dayColumnRendered = false;
                            timeSlots.forEach((timeSlot, timeIndex) => {
                              const gridSlot = mergedGrid[day][timeIndex];
                              const row = [];
                              if (!programRowRendered) {
                                const totalRows = days.length * timeSlots.length;
                                row.push(
                                  <td
                                    key={`${program.id}-program-column`}
                                    className="border p-1 font-bold text-sm bg-gray-100"
                                    rowSpan={totalRows}
                                    style={{
                                      verticalAlign: "middle",
                                      textAlign: "center",
                                      width: "80px",
                                      minWidth: "80px",
                                      maxWidth: "80px",
                                      writingMode: "vertical-rl",
                                      textOrientation: "mixed"
                                    }}
                                  >
                                    {program.name}
                                  </td>
                                );
                                programRowRendered = true;
                              }
                              if (!dayColumnRendered) {
                                row.push(
                                  <td
                                    key={`${day}-day-column`}
                                    className="border p-1 font-bold text-sm"
                                    rowSpan={timeSlots.length}
                                    style={{
                                      verticalAlign: "middle",
                                      textAlign: "center",
                                      width: "60px",
                                      minWidth: "60px",
                                      maxWidth: "60px",
                                    }}
                                  >
                                    {day}
                                  </td>
                                );
                                dayColumnRendered = true;
                              }
                              const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                              row.push(
                                <td
                                  key={`${day}-${timeIndex}-time`}
                                  className="border border-gray-300 p-1 text-xs bg-white text-zinc-900"
                                  style={{ height: "35px", width: "100px" }}
                                >
                                  {timeSlot}
                                </td>
                              );
                              yearLevels.forEach((level) => {
                                const levelData = gridSlot.programs[program.id].yearLevels[level];
                                if (levelData.span === 0) return;
                                if (levelData.occupied && levelData.assignment) {
                                  const assignment = levelData.assignment;
                                  const subjectName = getSubjectName(assignment.subjectId);
                                  const teacherName = getTeacherName(assignment.teacherId);
                                  const room = getAssignmentRoom(assignment);
                                  const color = getTeacherColor(assignment.teacherId);
                                  const lightBg = getLightBackgroundColor(color);
                                  row.push(
                                    <td
                                      key={`${program.id}-${day}-${timeIndex}-${level}`}
                                      className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move' : ''}`}
                                      style={{
                                        maxWidth: "100px",
                                        height: `${35 * levelData.span}px`,
                                        verticalAlign: "middle",
                                        backgroundColor: lightBg,
                                        borderColor: color,
                                        boxShadow: `inset 0 0 0 2px ${color}`,
                                      }}
                                      rowSpan={levelData.span}
                                      {...(userRole !== 'view' ? {
                                        draggable: true,
                                        onDragStart: (e) => {
                                          e.dataTransfer.setData("text/plain", assignment.id);
                                          e.dataTransfer.effectAllowed = "move";
                                        },
                                        onDragOver: (e) => e.preventDefault(),
                                        onDrop: (e) => handleDrop(e, day, timeIndex, level, program.id)
                                      } : {})}
                                    >
                                      <div className="flex items-center justify-start h-full px-3 py-2">
                                        <div className="relative group">
                                          <div
                                            className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                            style={{
                                              backgroundColor: color,
                                              boxShadow: `inset 0 0 0 2px ${color}`,
                                            }}
                                          ></div>
                                          <div
                                            className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                            style={{ zIndex: 1000 }}
                                          >
                                            <div className="text-left space-y-1">
                                              <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                {subjectName}
                                              </div>
                                              <div className="text-blue-200">{teacherName}</div>
                                              <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                              <div className="text-gray-300">Room: {room}</div>
                                              <div className="text-gray-300">Program: {program.name}</div>
                                              {userRole !== 'view' && (
                                                <div className="flex gap-2">
                                                  <button
                                                    onClick={() =>
                                                      setEditingAssignment({
                                                        ...assignment,
                                                        startTime: assignment.timeSlot.split('-')[0].trim(),
                                                        duration: assignment.duration,
                                                        roomId:
                                                          roomAssignments.find(
                                                            (ra) =>
                                                              ra.scheduleFileId === assignment.scheduleFileId &&
                                                              ra.subjectId === assignment.subjectId &&
                                                              ra.teacherId === assignment.teacherId &&
                                                              ra.classId === assignment.classId
                                                          )?.roomId || '',
                                                      })
                                                    }
                                                    className="text-blue-500 hover:text-blue-300 text-xs"
                                                    title="Edit"
                                                  >
                                                    Edit
                                                  </button>
                                                  <button
                                                    onClick={() => handleDelete(assignment.id)}
                                                    className="text-red-500 hover:text-red-300 text-xs"
                                                    title="Remove"
                                                  >
                                                    <FiTrash2 />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                            <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                          </div>
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                          <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                            {subjectName}
                                          </div>
                                          <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                } else {
                                  const bgColor = isAvailable ? "bg-teal-50" : "";
                                  row.push(
                                    <td
                                      key={`${program.id}-${day}-${timeIndex}-${level}`}
                                      className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                      style={{ minWidth: "140px", height: "35px" }}
                                      {...(userRole !== 'view' ? {
                                        onDragOver: (e) => e.preventDefault(),
                                        onDrop: (e) => handleDrop(e, day, timeIndex, level, program.id)
                                      } : {})}
                                    ></td>
                                  );
                                }
                              });
                              rows.push(
                                <tr key={`${program.id}-${day}-${timeIndex}`}>
                                  {row}
                                </tr>
                              );
                            });
                          });
                          return rows;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              grids.map((gridObj, progIndex) => {
                const { program, grid, levels, isDayColumn } = gridObj;
                return (
                  <div key={progIndex}>
                    {!selectedProgramId && <h2 className="text-xl font-bold mt-4 mb-4">{program.name}</h2>}
                    <div
                      className="bg-white rounded-lg shadow-sm border overflow-x-auto overflow-y-auto isolate"
                      style={{
                        maxHeight: 'calc(100vh - 200px)',
                        zIndex: 10,
                      }}
                    >
                      <div
                        ref={contentRef}
                        className="relative"
                        style={{
                          transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
                          transformOrigin: 'top left',
                          cursor: zoomLevel > 1 ? 'grab' : 'default',
                        }}
                      >
                        <table className="w-full border-collapse text-sm">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            {isDayColumn ? (
                              // Day-column layout: Days as columns, Time as rows
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                                {days.map((day) => (
                                  <th key={day} className="border p-3 text-center text-zinc-900 font-semibold">{day}</th>
                                ))}
                              </tr>
                            ) : (
                              // Original layout: Day as row, Year levels as columns
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "60px" }}>
                                  {fullScheduleActive ? "All Schedules" : ""}
                                </th>
                                <th className="border p-3 text-center text-zinc-900 font-semibold" style={{ width: "120px" }}>Time</th>
                                {levels.map((level) => (
                                  <th key={level} className="border p-3 text-center text-zinc-900 font-semibold">{level}</th>
                                ))}
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {isDayColumn ? (
                              // Day-column layout body
                              timeSlots.map((timeSlot, timeIndex) => {
                                const gridSlot = grid[timeIndex];
                                return (
                                  <tr key={`time-${timeIndex}`}>
                                    <td
                                      className="border border-gray-300 p-1 text-xs bg-white text-zinc-900 font-semibold"
                                      style={{ height: "35px", width: "120px" }}
                                    >
                                      {timeSlot}
                                    </td>
                                    {days.map((day) => {
                                      const dayData = gridSlot[day];
                                      if (dayData.span === 0) return null;
                                      if (dayData.occupied && dayData.assignment) {
                                        const assignment = dayData.assignment;
                                        const subjectName = getSubjectName(assignment.subjectId);
                                        const teacherName = getTeacherName(assignment.teacherId);
                                        const room = getAssignmentRoom(assignment);
                                        const color = getTeacherColor(assignment.teacherId);
                                        const lightBg = getLightBackgroundColor(color);
                                        return (
                                          <td
                                            key={`${timeIndex}-${day}`}
                                            className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move hover:cursor-grabbing' : ''}`}
                                            style={{
                                              maxWidth: "140px",
                                              height: `${35 * dayData.span}px`,
                                              verticalAlign: "middle",
                                              backgroundColor: lightBg,
                                              borderColor: color,
                                              boxShadow: `inset 0 0 0 2px ${color}`,
                                            }}
                                            rowSpan={dayData.span}
                                            {...(userRole !== 'view' ? {
                                              draggable: true,
                                              onDragStart: (e) => {
                                                e.dataTransfer.setData("text/plain", assignment.id);
                                                e.dataTransfer.effectAllowed = "move";
                                              },
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, selectedYearLevel, selectedProgramId)
                                            } : {})}
                                          >
                                            <div className="flex items-center justify-start h-full px-3 py-2">
                                              <div className="relative group">
                                                <div
                                                  className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                                  style={{
                                                    backgroundColor: color,
                                                    boxShadow: `inset 0 0 0 2px ${color}`,
                                                  }}
                                                ></div>
                                                <div
                                                  className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                                  style={{ zIndex: 1000 }}
                                                >
                                                  {editingAssignment && editingAssignment.id === assignment.id && userRole !== 'view' ? (
                                                    <div className="space-y-2">
                                                      <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                        {subjectName}
                                                      </div>
                                                      <div className="text-blue-200">{teacherName}</div>
                                                      <div>
                                                        <label className="block text-gray-300">Start Time</label>
                                                        <select
                                                          value={editingAssignment.startTime || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, startTime: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">Select start time</option>
                                                          {timeSlots.map((slot) => (
                                                            <option key={slot} value={slot.split('-')[0].trim()}>{slot}</option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="block text-gray-300">Duration</label>
                                                        <select
                                                          value={editingAssignment.duration || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, duration: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">Select duration</option>
                                                          <option value="60">1 hour</option>
                                                          <option value="120">2 hours</option>
                                                          <option value="180">3 hours</option>
                                                          <option value="240">4 hours</option>
                                                        </select>
                                                      </div>
                                                      <div>
                                                        <label className="block text-gray-300">Room</label>
                                                        <select
                                                          value={editingAssignment.roomId || ""}
                                                          onChange={(e) =>
                                                            setEditingAssignment({ ...editingAssignment, roomId: e.target.value })
                                                          }
                                                          className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                        >
                                                          <option value="">No Room</option>
                                                          {rooms.map((room) => (
                                                            <option key={room.id} value={room.id}>{room.name}</option>
                                                          ))}
                                                        </select>
                                                      </div>
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() =>
                                                            handleSaveEdit(assignment.id, {
                                                              ...assignment,
                                                              startTime: editingAssignment.startTime,
                                                              duration: editingAssignment.duration,
                                                              roomId: editingAssignment.roomId,
                                                            })
                                                          }
                                                          className="px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                                                        >
                                                          Save
                                                        </button>
                                                        <button
                                                          onClick={() => setEditingAssignment(null)}
                                                          className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div className="text-left space-y-1">
                                                      <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                        {subjectName}
                                                      </div>
                                                      <div className="text-blue-200">{teacherName}</div>
                                                      <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                      <div className="text-gray-300">Room: {room}</div>
                                                      {userRole !== 'view' && (
                                                        <div className="flex gap-2">
                                                          <button
                                                            onClick={() =>
                                                              setEditingAssignment({
                                                                ...assignment,
                                                                startTime: assignment.timeSlot.split('-')[0].trim(),
                                                                duration: assignment.duration,
                                                                roomId:
                                                                  roomAssignments.find(
                                                                    (ra) =>
                                                                      ra.scheduleFileId === assignment.scheduleFileId &&
                                                                      ra.subjectId === assignment.subjectId &&
                                                                      ra.teacherId === assignment.teacherId &&
                                                                      ra.classId === assignment.classId
                                                                  )?.roomId || '',
                                                              })
                                                            }
                                                            className="text-blue-500 hover:text-blue-300 text-xs"
                                                            title="Edit"
                                                          >
                                                            Edit
                                                          </button>
                                                          <button
                                                            onClick={() => handleDelete(assignment.id)}
                                                            className="text-red-500 hover:text-red-300 text-xs"
                                                            title="Remove"
                                                          >
                                                            <FiTrash2 />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  )}
                                                  <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                                </div>
                                              </div>
                                              <div className="flex-1 text-left overflow-hidden">
                                                <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                                  {subjectName}
                                                </div>
                                                <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      } else {
                                        const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                                        const bgColor = isAvailable ? "bg-teal-50" : "";
                                        return (
                                          <td
                                            key={`${timeIndex}-${day}`}
                                            className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                            style={{ minWidth: "140px", height: "35px" }}
                                            {...(userRole !== 'view' ? {
                                              onDragOver: (e) => e.preventDefault(),
                                              onDrop: (e) => handleDrop(e, day, timeIndex, selectedYearLevel, selectedProgramId)
                                            } : {})}
                                          ></td>
                                        );
                                      }
                                    })}
                                  </tr>
                                );
                              })
                            ) : (
                              // Original layout body - KEEP YOUR EXISTING CODE
                              days.map((day) => {
                                const rows = [];
                                let dayColumnRendered = false;
                                timeSlots.forEach((timeSlot, timeIndex) => {
                                  const gridSlot = grid[day][timeIndex];
                                  const row = [];
                                  if (!dayColumnRendered) {
                                    row.push(
                                      <td
                                        key={`${day}-day-column`}
                                        className="border p-1 font-bold text-sm"
                                        rowSpan={timeSlots.length}
                                        style={{
                                          verticalAlign: "middle",
                                          textAlign: "center",
                                          width: "60px",
                                          minWidth: "60px",
                                          maxWidth: "60px",
                                        }}
                                      >
                                        {day}
                                      </td>
                                    );
                                    dayColumnRendered = true;
                                  }
                                  const isAvailable = selectedTeacherId && availableSlots[day] && availableSlots[day][timeIndex];
                                  row.push(
                                    <td
                                      key={`${day}-${timeIndex}-time`}
                                      className="border border-gray-300 p-1 text-xs bg-white text-zinc-900"
                                      style={{ height: "35px", width: "100px" }}
                                    >
                                      {timeSlot}
                                    </td>
                                  );
                                  levels.forEach((level) => {
                                    const levelData = gridSlot.yearLevels[level];
                                    if (levelData.span === 0) return;
                                    if (levelData.occupied && levelData.assignment) {
                                      const assignment = levelData.assignment;
                                      const subjectName = getSubjectName(assignment.subjectId);
                                      const teacherName = getTeacherName(assignment.teacherId);
                                      const room = getAssignmentRoom(assignment);
                                      const color = getTeacherColor(assignment.teacherId);
                                      const lightBg = getLightBackgroundColor(color);
                                      row.push(
                                        <td
                                          key={`${day}-${timeIndex}-${level}`}
                                          className={`p-2 relative text-sm align-middle ${userRole !== 'view' ? 'cursor-move hover:cursor-grabbing' : ''
                                            }`}
                                          style={{
                                            maxWidth: "100px",
                                            height: `${35 * levelData.span}px`,
                                            verticalAlign: "middle",
                                            backgroundColor: lightBg,
                                            borderColor: color,
                                            boxShadow: `inset 0 0 0 2px ${color}`,
                                          }}
                                          rowSpan={levelData.span}
                                          {...(userRole !== 'view' ? {
                                            draggable: true,
                                            onDragStart: (e) => {
                                              e.dataTransfer.setData("text/plain", assignment.id);
                                              e.dataTransfer.effectAllowed = "move";
                                            },
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, level)
                                          } : {})}
                                        >
                                          <div className="flex items-center justify-start h-full px-3 py-2">
                                            <div className="relative group">
                                              <div
                                                className="w-5 h-5 rounded-lg mr-2.5 flex-shrink-0 cursor-pointer border-2 border-white shadow-sm"
                                                style={{
                                                  backgroundColor: color,
                                                  boxShadow: `inset 0 0 0 2px ${color}`,
                                                }}
                                              ></div>
                                              <div
                                                className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                                style={{ zIndex: 1000 }}
                                              >
                                                {editingAssignment && editingAssignment.id === assignment.id && userRole !== 'view' ? (
                                                  <div className="space-y-2">
                                                    <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                      {subjectName}
                                                    </div>
                                                    <div className="text-blue-200">{teacherName}</div>
                                                    <div>
                                                      <label className="block text-gray-300">Start Time</label>
                                                      <select
                                                        value={editingAssignment.startTime || ""}
                                                        onChange={(e) =>
                                                          setEditingAssignment({ ...editingAssignment, startTime: e.target.value })
                                                        }
                                                        className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                      >
                                                        <option value="">Select start time</option>
                                                        {timeSlots.map((slot) => (
                                                          <option key={slot} value={slot.split('-')[0].trim()}>{slot}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                    <div>
                                                      <label className="block text-gray-300">Duration</label>
                                                      <select
                                                        value={editingAssignment.duration || ""}
                                                        onChange={(e) =>
                                                          setEditingAssignment({ ...editingAssignment, duration: e.target.value })
                                                        }
                                                        className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                      >
                                                        <option value="">Select duration</option>
                                                        <option value="60">1 hour</option>
                                                        <option value="120">2 hours</option>
                                                        <option value="180">3 hours</option>
                                                        <option value="240">4 hours</option>
                                                      </select>
                                                    </div>
                                                    <div>
                                                      <label className="block text-gray-300">Room</label>
                                                      <select
                                                        value={editingAssignment.roomId || ""}
                                                        onChange={(e) =>
                                                          setEditingAssignment({ ...editingAssignment, roomId: e.target.value })
                                                        }
                                                        className="w-full p-1 border bg-gray-800 text-white rounded-md"
                                                      >
                                                        <option value="">No Room</option>
                                                        {rooms.map((room) => (
                                                          <option key={room.id} value={room.id}>{room.name}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                    <div className="flex gap-2">
                                                      <button
                                                        onClick={() =>
                                                          handleSaveEdit(assignment.id, {
                                                            ...assignment,
                                                            startTime: editingAssignment.startTime,
                                                            duration: editingAssignment.duration,
                                                            roomId: editingAssignment.roomId,
                                                          })
                                                        }
                                                        className="px-2 py-1 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                                                      >
                                                        Save
                                                      </button>
                                                      <button
                                                        onClick={() => setEditingAssignment(null)}
                                                        className="px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                      >
                                                        Cancel
                                                      </button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="text-left space-y-1">
                                                    <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                      {subjectName}
                                                    </div>
                                                    <div className="text-blue-200">{teacherName}</div>
                                                    <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                    <div className="text-gray-300">Room: {room}</div>
                                                    {userRole !== 'view' && (
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={() =>
                                                            setEditingAssignment({
                                                              ...assignment,
                                                              startTime: assignment.timeSlot.split('-')[0].trim(),
                                                              duration: assignment.duration,
                                                              roomId:
                                                                roomAssignments.find(
                                                                  (ra) =>
                                                                    ra.scheduleFileId === assignment.scheduleFileId &&
                                                                    ra.subjectId === assignment.subjectId &&
                                                                    ra.teacherId === assignment.teacherId &&
                                                                    ra.classId === assignment.classId
                                                                )?.roomId || '',
                                                            })
                                                          }
                                                          className="text-blue-500 hover:text-blue-300 text-xs"
                                                          title="Edit"
                                                        >
                                                          Edit
                                                        </button>
                                                        <button
                                                          onClick={() => handleDelete(assignment.id)}
                                                          className="text-red-500 hover:text-red-300 text-xs"
                                                          title="Remove"
                                                        >
                                                          <FiTrash2 />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                                <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                              </div>
                                            </div>
                                            <div className="flex-1 text-left overflow-hidden">
                                              <div className="text-sm font-bold leading-tight text-slate-900 truncate mb-0.5">
                                                {subjectName}
                                              </div>
                                              <div className="text-xs text-slate-600 leading-tight truncate font-medium">{teacherName}</div>
                                            </div>
                                          </div>
                                        </td>
                                      );
                                    } else {
                                      const bgColor = isAvailable ? "bg-teal-50" : "";
                                      row.push(
                                        <td
                                          key={`${day}-${timeIndex}-${level}`}
                                          className={`border p-1 relative text-sm text-center align-middle ${bgColor}`}
                                          style={{ minWidth: "140px", height: "35px" }}
                                          {...(userRole !== 'view' ? {
                                            onDragOver: (e) => e.preventDefault(),
                                            onDrop: (e) => handleDrop(e, day, timeIndex, level)
                                          } : {})}
                                        ></td>
                                      );
                                    }
                                  });
                                  rows.push(
                                    <tr key={`${day}-${timeIndex}`}>
                                      {row}
                                    </tr>
                                  );
                                });
                                return rows;
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {userRole !== 'view' && (
            <div
              className="w-80 bg-white rounded-lg shadow-lg border fixed right-4 top-36 bottom-4 flex flex-col"
              style={{ zIndex: 500 }}
            >
              <div className="bg-zinc-900 rounded-t-lg p-4 text-white">
                <h2 className="text-md font-semibold mb-4">Assignment List</h2>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by subject or teacher..."
                  className="w-full p-2 border bg-zinc-900 border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                />
                <div className="mt-2">
                  <select
                    value={filterOptions.teacherId}
                    onChange={(e) => {
                      const teacherId = e.target.value ? parseInt(e.target.value) : "";
                      setFilterOptions({ ...filterOptions, teacherId });
                      setSelectedTeacherId(teacherId || null);
                    }}
                    className="w-full p-2 border bg-zinc-900 border-gray-300 rounded-md"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.honorifics} {teacher.fullName}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={filterOptions.showWithSchedule}
                      onChange={(e) => setFilterOptions({ ...filterOptions, showWithSchedule: e.target.checked })}
                      className="h-4 w-4 text-teal-600"
                    />
                    Show with schedule
                  </label>
                  <label className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      checked={filterOptions.showWithoutSchedule}
                      onChange={(e) => setFilterOptions({ ...filterOptions, showWithoutSchedule: e.target.checked })}
                      className="h-4 w-4 text-teal-600"
                    />
                    Show without schedule
                  </label>
                </div>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto p-4 [scrollbar-width:thin] [scrollbar-color:#cfcfcf_transparent]">
                {filteredAssignments.map((assignment) => {
                  // Get class details for time and room assignments
                  const classData = assignment.classId ? classes.find((c) => c.id === assignment.classId) : null;
                  // Get subject details for subject assignments or fallback
                  const subjectData = subjects.find((s) => s.id === assignment.subjectId);
                  // Determine program and year level
                  const programName = classData
                    ? getProgramName(classData.programId)
                    : subjectData?.programId
                      ? getProgramName(subjectData.programId)
                      : "N/A";
                  const yearLevel = classData
                    ? classData.yearLevel
                    : subjectData?.yearLevel || "N/A";
                  // Check if the assignment has no teacher
                  const isNoTeacher = getTeacherName(assignment.teacherId) === "No Teacher";
                  const color = getTeacherColor(assignment.teacherId);
                  const lightBg = getLightBackgroundColor(color);
                  return (
                    <div
                      key={assignment.id}
                      {...(userRole !== 'view'
                        ? {
                          draggable: true,
                          onDragStart: (e) => e.dataTransfer.setData("text/plain", assignment.id),
                        }
                        : {
                          draggable: false,
                        })}
                      className={`p-3 rounded-lg border-2 shadow-sm hover:shadow-md transition-all duration-200 ${userRole !== 'view' ? 'cursor-move hover:border-gray-400' : ''}`}
                      style={{
                        backgroundColor: lightBg,
                        borderColor: isNoTeacher ? '#f0efeb' : color + '40'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-800 mb-1">
                            {getSubjectName(assignment.subjectId)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: color + '20', color: color }}>
                              {getTeacherName(assignment.teacherId)}
                            </span>
                          </div>
                        </div>
                        {!assignment.timeSlot && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            Unscheduled
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
                        {assignment.timeSlot && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">{assignment.day}</span>
                            <span>{assignment.timeSlot}</span>
                            <span className="text-gray-400">•</span>
                            <span>{getClassName(assignment.classId)}</span>
                          </div>
                        )}
                        {assignment.roomId && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{getRoomName(assignment.roomId)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>{programName}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-1">
                            <span>{yearLevel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredAssignments.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-gray-500 font-medium">No assignments found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {conflictModal.open && (
        <Modal
          title="Scheduling Conflicts"
          type="alert"
          message={
            <ul className="list-disc pl-5">
              {conflictModal.conflicts.map((conflict, index) => (
                <li key={index} className="text-red-600">{conflict}</li>
              ))}
            </ul>
          }
          onClose={() => setConflictModal({ open: false, conflicts: [] })}
        />
      )}
      {deleteModal.open && userRole !== 'view' && (
        <Modal
          title="Confirm Deletion"
          type="confirm"
          message="Are you sure you want to delete this assignment?"
          onClose={() => setDeleteModal({ open: false, assignmentId: null })}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}