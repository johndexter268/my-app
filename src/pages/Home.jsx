/* eslint-disable no-unused-vars */
/* eslint-disable no-unreachable */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";
import Toolbar from '../components/Toolbar';
import Modal from "../components/Modal"
import AssignmentList from "../components/AssignmentList";

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScheduleActive, setFullScheduleActive] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const contentRef = useRef(null);
  const getYearLevel = (classId) => classes.find(c => c.id === classId)?.yearLevel || null;
  const getSubjectYearLevel = (subjectId) => subjects.find(s => s.id === subjectId)?.yearLevel || null;
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'view';
  const [isAssignmentListOpen, setIsAssignmentListOpen] = useState(false);
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
  // const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
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
  const getDayAssignments = (day, teacherId = null, programId = null) => {
    let filtered = timeAssignments.filter(a => a.day === day);
    if (teacherId) filtered = filtered.filter(a => a.teacherId === teacherId);
    if (programId) filtered = filtered.filter(a => getProgramId(a.classId) === programId);
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
  const createScheduleGrid = (programId = null, classId = null) => {
    const progClasses = classes.filter((c) => !programId || c.programId === programId);
    const targetClasses = classId ? progClasses.filter((c) => c.id === classId) : progClasses;

    if (targetClasses.length === 0) return null;

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

    return { grid, classes: targetClasses };
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
    let targetClass = null;
    if (programId && selectedClassId) {
      targetClass = classes.find((c) => c.id === selectedClassId);
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
    if (assignment.type === "time") {
      const assYearLevel = getClassName(assignment.classId);
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
      if (getClassName(assignment.classId) !== yearLevel) {
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
    // === FIXED CONFLICT DETECTION WITH YEAR LEVEL SUPPORT ===
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
      const existingYearLevel = getYearLevel(existing.classId);
      const newYearLevel = getYearLevel(updatedAssignment.classId);

      // 1. Teacher Conflict (same teacher, different subject)
      if (
        existing.teacherId === updatedAssignment.teacherId &&
        existing.subjectId !== updatedAssignment.subjectId
      ) {
        conflictSet.add(
          `Teacher ${getTeacherName(existing.teacherId)} is already teaching ${getSubjectName(existing.subjectId)} at this time.`
        );
      }

      // 2. Class Conflict (same class scheduled twice)
      if (existing.classId === updatedAssignment.classId) {
        conflictSet.add(`Class ${getClassName(existing.classId)} already has a class at this time.`);
      }

      // 3. Subject-Teacher Conflict (same subject, different teacher at same time/day)
      if (
        existing.subjectId === updatedAssignment.subjectId &&
        existing.teacherId !== updatedAssignment.teacherId &&
        existing.day === updatedAssignment.day
      ) {
        conflictSet.add(
          `Subject ${getSubjectName(existing.subjectId)} is already assigned to ${getTeacherName(existing.teacherId)} at this time.`
        );
      }

      // 4. Room Conflict — only if same room AND different year levels (unless merged)
      if (newRoomId) {
        const existingRoomId = getAssignmentRoom(existing) !== "N/A"
          ? roomAssignments.find(ra =>
            ra.scheduleFileId === existing.scheduleFileId &&
            ra.subjectId === existing.subjectId &&
            ra.teacherId === existing.teacherId &&
            ra.classId === existing.classId
          )?.roomId
          : null;

        if (existingRoomId === newRoomId) {
          const isMerged = timeAssignments.some(a =>
            a.subjectId === existing.subjectId &&
            a.teacherId === existing.teacherId &&
            a.day === day &&
            a.timeSlot === updatedAssignment.timeSlot &&
            a.classId !== existing.classId &&
            a.classId !== updatedAssignment.classId
          );

          // Allow room sharing only if classes are explicitly merged (same subject+teacher+time)
          if (!isMerged && existingYearLevel !== newYearLevel) {
            conflictSet.add(
              `Room ${getRoomName(newRoomId)} is already used by ${getClassName(existing.classId)} (${existingYearLevel}) at this time. ` +
              `Different year levels cannot share rooms unless merged.`
            );
          }
        }
      }

      // 5. Subject Year Level Mismatch
      const subjectYearLevel = getSubjectYearLevel(updatedAssignment.subjectId);
      if (subjectYearLevel && newYearLevel && subjectYearLevel !== newYearLevel) {
        conflictSet.add(
          `Subject "${getSubjectName(updatedAssignment.subjectId)}" is for ${subjectYearLevel}, ` +
          `but assigned to ${newYearLevel} class (${getClassName(updatedAssignment.classId)}).`
        );
      }
    }

    // 6. Room Capacity Check (supports merged classes)
    if (newRoomId) {
      const room = rooms.find(r => r.id === newRoomId);
      if (room) {
        const totalStudents = getTotalStudentsForMergedClasses(updatedAssignment, day, updatedAssignment.timeSlot);
        if (totalStudents > room.capacity) {
          conflictSet.add(
            `Room ${room.name} capacity (${room.capacity}) exceeded. ` +
            `Total students: ${totalStudents} (includes merged classes)`
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

  const grids = useDayColumnLayout
    ? [{
      program: programs.find(p => p.id === selectedProgramId),
      grid: createScheduleGrid(selectedProgramId, selectedClassId),
      classes: classes.filter(c => c.id === selectedClassId),
      isDayColumn: true,
    }]
    : programsToShow
      .map(program => {
        const gridData = createScheduleGrid(program.id);
        return gridData ? { program, ...gridData, classes: gridData.classes, isDayColumn: false } : null;
      })
      .filter(Boolean);

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
                        transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel})`,
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
            <div className="fixed bottom-0 bg-white rounded-t-lg shadow-sm p-2 border z-[1000]">
              <div className="text-sm font-semibold text-gray-700">
                {fullScheduleActive
                  ? "All Programs Schedule"
                  : `${currentFile?.semester || ""} | School Year: ${currentFile?.academic_year || ""}`}
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