/* eslint-disable no-unused-vars */
/* eslint-disable no-unreachable */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import { FaSpinner } from "react-icons/fa";

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
  const [filterOptions, setFilterOptions] = useState({
    teacherId: "",
    showWithSchedule: true,
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
      setSelectedYearLevel(null);
    };

    const handleYearLevelSchedule = (event) => {
      setSelectedYearLevel(event.detail.yearLevel || null);
      setSelectedProgramId(null);
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
    setAssignments(listAssignments);
  }, [timeAssignments, roomAssignments, subjectAssignments]);

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
    '7:00 AM-8:00 AM', '8:00 AM-9:00 AM', '9:00 AM-10:00 AM', '10:00 AM-11:00 AM', '11:00 AM-12:00 PM',
    '12:00 PM-1:00 PM', '1:00 PM-2:00 PM', '2:00 PM-3:00 PM', '3:00 PM-4:00 PM', '4:00 PM-5:00 PM',
    '5:00 PM-6:00 PM', '6:00 PM-7:00 PM'
  ];

  const startTimeArray = [
    "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
    "5:00 PM", "6:00 PM"
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  const getTeacherColor = (teacherId) => {
    return teachers.find((t) => t.id === teacherId)?.color || "#000000";
  };

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
        const startTime = a.timeSlot.split('-')[0].trim();
        const slotIndex = timeSlots.findIndex((slot) => slot.startsWith(startTime));
        return {
          start: slotIndex,
          span: Math.round(a.duration / 60),
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
    return teacher ? (teacher.honorifics ? `${teacher.honorifics} ${teacher.fullName}` : teacher.fullName) : "Unknown";
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
      return total + (classData?.students || 0);
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
          grid[day][start].yearLevels[assYearLevel] = {
            occupied: true,
            assignment: assignment,
            span: span,
          };

          for (let i = 1; i < span; i++) {
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

      // Fill in assignments
      const dayAssignments = getDayAssignments(day, selectedTeacherId);
      dayAssignments.forEach(({ start, span, assignment }) => {
        const programId = getProgramId(assignment.classId);
        const assYearLevel = getYearLevel(assignment.classId);

        if (programId && assYearLevel && mergedGrid[day][start]) {
          mergedGrid[day][start].programs[programId].yearLevels[assYearLevel] = {
            occupied: true,
            assignment: assignment,
            span: span,
          };

          for (let i = 1; i < span; i++) {
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
    const startIndex = startTimeArray.indexOf(startTime);
    if (startIndex === -1) return "";
    const hours = Math.round(parseInt(duration) / 60);
    const endIndex = startIndex + hours;
    if (endIndex > startTimeArray.length) return "";
    const endTime = startTimeArray[endIndex] || startTimeArray[startTimeArray.length - 1];
    return `${startTime}-${endTime}`;
  };

  const handleDrop = async (event, day, timeIndex, yearLevel, programId = null) => {
    event.preventDefault();
    const assignmentId = event.dataTransfer.getData("text/plain");
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    let updatedAssignment;
    let newRoomId;

    if (assignment.type === "time") {
      updatedAssignment = {
        ...assignment,
        day,
        timeSlot: timeSlots[timeIndex],
      };
      newRoomId = getAssignmentRoom(assignment) !== "N/A" ? roomAssignments.find(
        (ra) =>
          ra.scheduleFileId === assignment.scheduleFileId &&
          ra.subjectId === assignment.subjectId &&
          ra.teacherId === assignment.teacherId &&
          ra.classId === assignment.classId
      )?.roomId : null;
    } else if (assignment.type === "room") {
      if (getYearLevel(assignment.classId) !== yearLevel) {
        alert("Class year level does not match the drop column.");
        return;
      }
      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        day,
        timeSlot: timeSlots[timeIndex],
        duration: 180,
        type: "time",
        scheduleFileId: currentFile.id,
      };
      newRoomId = assignment.roomId;
    } else if (assignment.type === "subject") {
      const subject = subjects.find((s) => s.id === assignment.subjectId);
      if (subject && subject.yearLevel !== yearLevel) {
        alert("Subject year level does not match the drop column.");
        return;
      }
      const targetClassId = programId
        ? classes.find((c) => c.yearLevel === yearLevel && c.programId === programId)?.id
        : classes.find((c) => c.yearLevel === yearLevel)?.id;

      updatedAssignment = {
        id: crypto.randomUUID(),
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        classId: targetClassId || "",
        day,
        timeSlot: timeSlots[timeIndex],
        duration: 180,
        type: "time",
        scheduleFileId: currentFile.id,
      };
      newRoomId = null;
    }

    const dayAssignments = getDayAssignments(day, null);
    const conflictSet = new Set();
    const startSlot = timeSlots.findIndex((slot) => slot.startsWith(updatedAssignment.timeSlot.split('-')[0].trim()));
    const span = Math.round(updatedAssignment.duration / 60);

    // Check for conflicts
    for (let i = startSlot; i < startSlot + span; i++) {
      dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
        if (start <= i && start + assSpan > i) {
          // Allow teacher to be assigned if subject, day, and time slot match (indicating merged class)
          if (
            ass.teacherId === updatedAssignment.teacherId &&
            !(ass.subjectId === updatedAssignment.subjectId &&
              ass.day === updatedAssignment.day &&
              ass.timeSlot === updatedAssignment.timeSlot)
          ) {
            conflictSet.add("Teacher already assigned at this time to a different subject.");
          }
          if (ass.classId === updatedAssignment.classId) {
            conflictSet.add("Class already scheduled at this time.");
          }
        }
      });
    }

    // Check for room sharing and capacity
    if (newRoomId) {
      const matchingAssignments = timeAssignments.filter(
        (a) =>
          a.subjectId === updatedAssignment.subjectId &&
          a.teacherId === updatedAssignment.teacherId &&
          a.day === day &&
          a.timeSlot === updatedAssignment.timeSlot &&
          a.id !== updatedAssignment.id
      );

      const room = rooms.find((r) => r.id === newRoomId);
      if (room) {
        const totalStudents = getTotalStudentsForMergedClasses(updatedAssignment, day, updatedAssignment.timeSlot);
        if (totalStudents > room.capacity) {
          conflictSet.add(`Room ${room.name} capacity (${room.capacity}) exceeded. Total students: ${totalStudents}`);
        }
      }

      // Check for room conflicts
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
              newRoomId === assRoomId &&
              !(
                ass.subjectId === updatedAssignment.subjectId &&
                ass.teacherId === updatedAssignment.teacherId &&
                ass.day === updatedAssignment.day &&
                ass.timeSlot === updatedAssignment.timeSlot
              )
            ) {
              conflictSet.add("Room already occupied by a different class.");
            }
          }
        });
      }
    }

    if (conflictSet.size > 0) {
      alert(`Cannot drop here:\n${[...conflictSet].join("\n")}`);
      return;
    }

    try {
      const result = await window.api.assignTimeSlot(updatedAssignment);
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

        const data = await window.api.getAssignments(currentFile.id);
        setTimeAssignments(data.filter((a) => a.type === "time") || []);
        setRoomAssignments(data.filter((a) => a.type === "room") || []);
        setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error saving assignment:", error);
      alert("Error saving assignment: " + error.message);
    }
  };

  const handleSaveEdit = async (assignmentId, updatedData) => {
    const newTimeSlot = getTimeSlotRange(updatedData.startTime, updatedData.duration);
    if (!newTimeSlot) {
      alert("Invalid start time or duration.");
      return;
    }

    const newData = {
      ...updatedData,
      timeSlot: newTimeSlot,
      duration: updatedData.duration,
    };

    const dayAssignments = getDayAssignments(newData.day, null).filter((ass) => ass.assignment.id !== assignmentId);
    const conflicts = [];
    const startSlot = timeSlots.findIndex((slot) => slot.startsWith(newData.timeSlot.split('-')[0].trim()));
    const span = Math.round(newData.duration / 60);
    const newRoomId = updatedData.roomId || (
      roomAssignments.find(
        (ra) =>
          ra.scheduleFileId === newData.scheduleFileId &&
          ra.subjectId === newData.subjectId &&
          ra.teacherId === newData.teacherId &&
          ra.classId === newData.classId
      )?.roomId || null
    );

    // Check for conflicts
    for (let i = startSlot; i < startSlot + span; i++) {
      dayAssignments.forEach(({ start, span: assSpan, assignment: ass }) => {
        if (start <= i && start + assSpan > i) {
          // Allow teacher to be assigned if subject, day, and time slot match (indicating merged class)
          if (
            ass.teacherId === newData.teacherId &&
            !(ass.subjectId === newData.subjectId &&
              ass.day === newData.day &&
              ass.timeSlot === newData.timeSlot)
          ) {
            conflicts.push("Teacher already assigned at this time to a different subject.");
          }
          if (ass.classId === newData.classId) {
            conflicts.push("Class already scheduled at this time.");
          }
        }
      });
    }

    // Check for room sharing and capacity
    if (newRoomId) {
      const matchingAssignments = timeAssignments.filter(
        (a) =>
          a.subjectId === newData.subjectId &&
          a.teacherId === newData.teacherId &&
          a.day === newData.day &&
          a.timeSlot === newData.timeSlot &&
          a.id !== assignmentId
      );

      const room = rooms.find((r) => r.id === newRoomId);
      if (room) {
        const totalStudents = getTotalStudentsForMergedClasses(newData, newData.day, newData.timeSlot);
        if (totalStudents > room.capacity) {
          conflicts.push(`Room ${room.name} capacity (${room.capacity}) exceeded. Total students: ${totalStudents}`);
        }
      }

      // Check for room conflicts
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
              newRoomId === assRoomId &&
              !(
                ass.subjectId === newData.subjectId &&
                ass.teacherId === newData.teacherId &&
                ass.day === newData.day &&
                ass.timeSlot === newData.timeSlot
              )
            ) {
              conflicts.push("Room already occupied by a different class.");
            }
          }
        });
      }
    }

    if (conflicts.length > 0) {
      alert(`Cannot save:\n${conflicts.join("\n")}`);
      return;
    }

    try {
      const timeResult = await window.api.updateTimeSlotAssignment(newData);
      if (!timeResult.success) {
        alert(timeResult.message);
        return;
      }

      const existingRoomAssignment = roomAssignments.find(
        (ra) =>
          ra.scheduleFileId === newData.scheduleFileId &&
          ra.subjectId === newData.subjectId &&
          ra.teacherId === newData.teacherId &&
          ra.classId === newData.classId
      );

      if (newRoomId) {
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
            alert(roomResult.message);
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
            alert(roomResult.message);
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
      alert("Assignment updated successfully!");
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("Error updating assignment: " + error.message);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      const timeAssignment = timeAssignments.find((a) => a.id === assignmentId);
      if (!timeAssignment) {
        alert("Assignment not found.");
        return;
      }

      const timeResult = await window.api.deleteAssignment(assignmentId);
      if (!timeResult.success) {
        alert(timeResult.message);
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
          alert(roomResult.message);
          return;
        }
      }

      const data = await window.api.getAssignments(currentFile.id);
      setTimeAssignments(data.filter((a) => a.type === "time") || []);
      setRoomAssignments(data.filter((a) => a.type === "room") || []);
      setSubjectAssignments(data.filter((a) => a.type === "subject") || []);
      alert("Assignment deleted successfully!");
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Error deleting assignment: " + error.message);
    }
  };

  const filteredAssignments = assignments.filter((assignment) => {
    const subjectName = getSubjectName(assignment.subjectId).toLowerCase();
    const teacherName = getTeacherName(assignment.teacherId).toLowerCase();
    const matchesSearch = subjectName.includes(searchTerm.toLowerCase()) || teacherName.includes(searchTerm.toLowerCase());
    const hasSchedule = !!assignment.timeSlot;
    const matchesTeacher = !filterOptions.teacherId || assignment.teacherId === filterOptions.teacherId;
    const matchesWithSchedule = filterOptions.showWithSchedule && hasSchedule;
    const matchesWithoutSchedule = filterOptions.showWithoutSchedule && !hasSchedule;
    return matchesSearch && matchesTeacher && (matchesWithSchedule || matchesWithoutSchedule);
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

  const grids = programsToShow
    .map((program) => {
      const gridData = createScheduleGrid(program.id, selectedYearLevel);
      return gridData ? { program, ...gridData } : null;
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
                <h1 className="text-2xl font-bold">CET Class Schedule</h1>
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

            {/* Full screen content */}
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
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-md" style={{ width: "80px" }}>
                              Program
                            </th>
                            <th className="border p-2 text-center" style={{ width: "60px" }}>
                              Day
                            </th>
                            <th className="border p-2 text-center" style={{ width: "120px" }}>Time</th>
                            {yearLevels.map((level) => (
                              <th key={level} className="border p-2 text-center">
                                {level}
                              </th>
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
                                    className="border border-darknavy p-1 text-xs bg-darknavy text-white"
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

                                    row.push(
                                      <td
                                        key={`${program.id}-${day}-${timeIndex}-${level}`}
                                        className={`p-2 relative text-sm align-middle bg-transparent`}
                                        style={{
                                          maxWidth: "100px",
                                          height: `${35 * levelData.span}px`,
                                          verticalAlign: "middle",
                                        }}
                                        rowSpan={levelData.span}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, day, timeIndex, level, program.id)}
                                      >
                                        <div className="flex items-center justify-start h-full px-1">
                                          <div className="relative group">
                                            <div
                                              className="w-4 h-4 rounded-full mr-2 flex-shrink-0 cursor-pointer border border-gray-300"
                                              style={{
                                                backgroundColor: getTeacherColor(assignment.teacherId),
                                              }}
                                            ></div>
                                            <div
                                              className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                              style={{ zIndex: 20 }}
                                            >
                                              <div className="text-left space-y-1">
                                                <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                  {subjectName}
                                                </div>
                                                <div className="text-blue-200">{teacherName}</div>
                                                <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                                <div className="text-gray-300">Room: {room}</div>
                                                <div className="text-gray-300">Program: {program.name}</div>
                                              </div>
                                              <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                            </div>
                                          </div>
                                          <div className="flex-1 text-left overflow-hidden">
                                            <div className="text-xs font-semibold leading-tight text-gray-800 truncate">
                                              {subjectName}
                                            </div>
                                            <div className="text-xs text-gray-600 leading-tight truncate">{teacherName}</div>
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
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, day, timeIndex, level, program.id)}
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
                grids.map(({ program, grid, levels }, progIndex) => (
                  <div key={progIndex}>
                    {!selectedProgramId && <h2 className="text-xl font-bold mb-4">{program.name}</h2>}
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
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr className="bg-gray-50">
                              <th className="border p-2 text-md" style={{ width: "60px" }}>
                                {fullScheduleActive ? "All Schedules" : currentFile.name}
                              </th>
                              <th className="border p-2 text-center" style={{ width: "120px" }}>Time</th>
                              {levels.map((level) => (
                                <th key={level} className="border p-2 text-center">
                                  {level}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {days.map((day) => {
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
                                    className="border border-darknavy p-1 text-xs bg-darknavy text-white"
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

                                    row.push(
                                      <td
                                        key={`${day}-${timeIndex}-${level}`}
                                        className={`p-2 relative text-sm align-middle bg-transparent`}
                                        style={{
                                          maxWidth: "100px",
                                          height: `${35 * levelData.span}px`,
                                          verticalAlign: "middle",
                                        }}
                                        rowSpan={levelData.span}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, day, timeIndex, level)}
                                      >
                                        <div className="flex items-center justify-start h-full px-1">
                                          <div className="relative group">
                                            <div
                                              className="w-4 h-4 rounded-full mr-2 flex-shrink-0 cursor-pointer border border-gray-300"
                                              style={{
                                                backgroundColor: getTeacherColor(assignment.teacherId),
                                              }}
                                            ></div>
                                            <div
                                              className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                              style={{ zIndex: 20 }}
                                            >
                                              {editingAssignment && editingAssignment.id === assignment.id ? (
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
                                                      {startTimeArray.map((slot) => (
                                                        <option key={slot} value={slot}>
                                                          {slot}
                                                        </option>
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
                                                        <option key={room.id} value={room.id}>
                                                          {room.name}
                                                        </option>
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
                                                </div>
                                              )}
                                              <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                            </div>
                                          </div>
                                          <div className="flex-1 text-left overflow-hidden">
                                            <div className="text-xs font-semibold leading-tight text-gray-800 truncate">
                                              {subjectName}
                                            </div>
                                            <div className="text-xs text-gray-600 leading-tight truncate">{teacherName}</div>
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
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, day, timeIndex, level)}
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
                            })}
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
        <div className="p-4 flex flex-col lg:flex-row gap-4" style={{ zIndex: 10 }}>
          <div className="bg-white rounded-lg mb-6 flex-1">
            <div className="bg-white rounded-lg mb-6">
              <h1 className="text-2xl font-bold mb-2">CET Class Schedule</h1>
              <div className="text-sm text-gray-600">
                {fullScheduleActive ? "All Schedules" : `${currentFile.semester} | S.Y. ${currentFile.academic_year}`}
              </div>
            </div>

            {fullScheduleActive ? (
              <div>
                <h2 className="text-xl font-bold mt-4 mb-4">All Programs Schedule</h2>
                <div
                  className="bg-white rounded-lg shadow-sm border overflow-y-scroll"
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
                        <tr className="bg-gray-50">
                          <th className="border p-2 text-md" style={{ width: "80px" }}>
                            Program
                          </th>
                          <th className="border p-2 text-center" style={{ width: "60px" }}>
                            Day
                          </th>
                          <th className="border p-2 text-center" style={{ width: "120px" }}>Time</th>
                          {yearLevels.map((level) => (
                            <th key={level} className="border p-2 text-center">
                              {level}
                            </th>
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
                                  className="border border-darknavy p-1 text-xs bg-darknavy text-white"
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

                                  row.push(
                                    <td
                                      key={`${program.id}-${day}-${timeIndex}-${level}`}
                                      className={`p-2 relative text-sm align-middle bg-transparent`}
                                      style={{
                                        maxWidth: "100px",
                                        height: `${35 * levelData.span}px`,
                                        verticalAlign: "middle",
                                      }}
                                      rowSpan={levelData.span}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => handleDrop(e, day, timeIndex, level, program.id)}
                                    >
                                      <div className="flex items-center justify-start h-full px-1">
                                        <div className="relative group">
                                          <div
                                            className="w-4 h-4 rounded-full mr-2 flex-shrink-0 cursor-pointer border border-gray-300"
                                            style={{
                                              backgroundColor: getTeacherColor(assignment.teacherId),
                                            }}
                                          ></div>
                                          <div
                                            className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                            style={{ zIndex: 20 }}
                                          >
                                            <div className="text-left space-y-1">
                                              <div className="font-bold text-white border-b border-gray-700 pb-1">
                                                {subjectName}
                                              </div>
                                              <div className="text-blue-200">{teacherName}</div>
                                              <div className="text-gray-300">{assignment.timeSlot} - {day}</div>
                                              <div className="text-gray-300">Room: {room}</div>
                                              <div className="text-gray-300">Program: {program.name}</div>
                                            </div>
                                            <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                          </div>
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                          <div className="text-xs font-semibold leading-tight text-gray-800 truncate">
                                            {subjectName}
                                          </div>
                                          <div className="text-xs text-gray-600 leading-tight truncate">{teacherName}</div>
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
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => handleDrop(e, day, timeIndex, level, program.id)}
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
              grids.map(({ program, grid, levels }, progIndex) => (
                <div key={progIndex}>
                  {!selectedProgramId && <h2 className="text-xl font-bold mt-4 mb-4">{program.name}</h2>}
                  <div
                    className="bg-white rounded-lg shadow-sm border overflow-y-scroll"
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
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-md" style={{ width: "60px" }}>
                              {fullScheduleActive ? "All Schedules" : currentFile.name}
                            </th>
                            <th className="border p-2 text-center" style={{ width: "120px" }}>Time</th>
                            {levels.map((level) => (
                              <th key={level} className="border p-2 text-center">
                                {level}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((day) => {
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
                                  className="border border-darknavy p-1 text-xs bg-darknavy text-white"
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

                                  row.push(
                                    <td
                                      key={`${day}-${timeIndex}-${level}`}
                                      className={`p-2 relative text-sm align-middle bg-transparent`}
                                      style={{
                                        maxWidth: "100px",
                                        height: `${35 * levelData.span}px`,
                                        verticalAlign: "middle",
                                      }}
                                      rowSpan={levelData.span}
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => handleDrop(e, day, timeIndex, level)}
                                    >
                                      <div className="flex items-center justify-start h-full px-1">
                                        <div className="relative group">
                                          <div
                                            className="w-4 h-4 rounded-full mr-2 flex-shrink-0 cursor-pointer border border-gray-300"
                                            style={{
                                              backgroundColor: getTeacherColor(assignment.teacherId),
                                            }}
                                          ></div>
                                          <div
                                            className="absolute left-0 top-6 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 min-w-52 border border-gray-700"
                                            style={{ zIndex: 20 }}
                                          >
                                            {editingAssignment && editingAssignment.id === assignment.id ? (
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
                                                    {startTimeArray.map((slot) => (
                                                      <option key={slot} value={slot}>
                                                        {slot}
                                                      </option>
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
                                                      <option key={room.id} value={room.id}>
                                                        {room.name}
                                                      </option>
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
                                              </div>
                                            )}
                                            <div className="absolute -top-2 left-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                                          </div>
                                        </div>
                                        <div className="flex-1 text-left overflow-hidden">
                                          <div className="text-xs font-semibold leading-tight text-gray-800 truncate">
                                            {subjectName}
                                          </div>
                                          <div className="text-xs text-gray-600 leading-tight truncate">{teacherName}</div>
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
                                      onDragOver={(e) => e.preventDefault()}
                                      onDrop={(e) => handleDrop(e, day, timeIndex, level)}
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="w-80 bg-white rounded-lg shadow-sm border" style={{ zIndex: 10 }}>
            <div className="bg-darknavy rounded-t-lg p-4 text-white">
              <h2 className="text-md font-semibold mb-4">Assignment List</h2>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by subject or teacher..."
                className="w-full p-2 border bg-darknavy border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              />
              <div className="mt-2">
                <select
                  value={filterOptions.teacherId}
                  onChange={(e) => {
                    const teacherId = e.target.value ? parseInt(e.target.value) : "";
                    setFilterOptions({ ...filterOptions, teacherId });
                    setSelectedTeacherId(teacherId || null);
                  }}
                  className="w-full p-2 border bg-darknavy border-gray-300 rounded-md"
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
            <div className="space-y-2 min-h-96 overflow-y-auto p-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", assignment.id)}
                  className="p-2 bg-gray-50 rounded-md cursor-move border border-gray-200 hover:bg-gray-100"
                >
                  <div className="text-sm font-medium">{getSubjectName(assignment.subjectId)}</div>
                  <div className="text-xs text-gray-600">{getTeacherName(assignment.teacherId)}</div>
                  {assignment.timeSlot && (
                    <div className="text-xs text-gray-500">
                      {assignment.day} {assignment.timeSlot} ({getClassName(assignment.classId)})
                    </div>
                  )}
                  {assignment.roomId && (
                    <div className="text-xs text-gray-500">Room: {getRoomName(assignment.roomId)}</div>
                  )}
                  {!assignment.timeSlot && (
                    <div className="text-xs text-orange-500">Unscheduled</div>
                  )}
                </div>
              ))}
              {filteredAssignments.length === 0 && (
                <div className="text-sm text-gray-500 italic">No assignments found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}