/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEdit, FiTrash2, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Modal from "../components/Modal";

export default function Assigning() {
  const [currentFile, setCurrentFile] = useState(null);
  const [activeTab, setActiveTab] = useState("Subject Assign");
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    sortAZ: false,
    showWithTeachers: true,
    showWithoutTeachers: true,
    programId: "",
    yearLevel: "",
  });
  const [expandedPrograms, setExpandedPrograms] = useState({});
  const [expandedYears, setExpandedYears] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalData, setDeleteModalData] = useState({ assignment: null, type: "", mergedAssignments: [] });
  const [selectedClassesToDelete, setSelectedClassesToDelete] = useState([]);

  const navigate = useNavigate();
  const handleFileSelected = (e) => {
    setCurrentFile(e.detail);
  };

  useEffect(() => {
    window.addEventListener('fileSelected', handleFileSelected);
    return () => window.removeEventListener('fileSelected', handleFileSelected);
  }, []);

  useEffect(() => {
    if (currentFile?.id) {
      setIsLoading(true);
      window.api.getAssignments(currentFile.id)
        .then((assignmentsData) => {
          setAssignments(assignmentsData || []);
        })
        .catch((error) => {
          console.error("Error loading assignments:", error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [currentFile]);

  useEffect(() => {
    const checkCurrentFile = async () => {
      setIsLoading(true);
      try {
        const fileResponse = await window.api.getCurrentFile();
        if (!fileResponse.files || fileResponse.files.length === 0) {
          alert("No active file selected. Please select a file first.");
          navigate("/file");
        } else {
          setCurrentFile(fileResponse.files[0]);
          const [teachersData, subjectsData, roomsData, classesData, programsData, assignmentsData] = await Promise.all([
            window.api.getTeachers(),
            window.api.getSubjects(),
            window.api.getRooms(),
            window.api.getClasses(),
            window.api.getPrograms(),
            window.api.getAssignments(fileResponse.files[0].id),
          ]);
          setTeachers(teachersData || []);
          setSubjects(subjectsData || []);
          setRooms(roomsData || []);
          setClasses(classesData || []);
          setPrograms(programsData || []);
          setAssignments(assignmentsData || []);
        }
      } catch (error) {
        console.error("Error checking current file:", error);
        alert("Error loading data: " + error.message);
      } finally {
        setIsLoading(false);
      }
    };
    checkCurrentFile();
  }, [navigate]);

  const handleAssign = (type) => {
    setModalType(type);
    setFormData({ teacherId: selectedTeacherId || "", classId: selectedClassId || "" });
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (assignment, type) => {
    setModalType(type);
    if (type === "Time & Date Assign") {
      const mergedAssignments = assignments.filter(
        (a) =>
          a.type === "time" &&
          a.subjectId === assignment.subjectId &&
          a.teacherId === assignment.teacherId &&
          a.day === assignment.day &&
          a.timeSlot === assignment.timeSlot
      );
      const classIds = mergedAssignments.map((a) => a.classId);
      const classNames = classIds
        .map((id) => classes.find((c) => c.id === id)?.name || "Unknown")
        .join(", ");
      const startTime = assignment.timeSlot.split('-')[0].trim();
      setFormData({ ...assignment, timeSlot: startTime, classIds, classNames });
    } else {
      setFormData(assignment);
    }
    setEditingId(assignment.id);
    setShowModal(true);
  };

  const handleDelete = (assignment, type) => {
    if (type === "Time & Date Assign") {
      const mergedAssignments = assignments.filter(
        (a) =>
          a.type === "time" &&
          a.subjectId === assignment.subjectId &&
          a.teacherId === assignment.teacherId &&
          a.day === assignment.day &&
          a.timeSlot === assignment.timeSlot
      );
      setDeleteModalData({ assignment, type, mergedAssignments });
      setSelectedClassesToDelete(mergedAssignments.map((a) => a.classId));
      setShowDeleteModal(true);
    } else {
      if (window.confirm(`Are you sure you want to delete this ${type.toLowerCase()} assignment?`)) {
        setIsDeleting(true);
        window.api.deleteAssignment(assignment.id)
          .then((result) => {
            if (result.success) {
              setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
              alert(`${type} assignment deleted successfully!`);
              const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
              window.api.setCurrentFile(updatedFile)
                .then(() => setCurrentFile(updatedFile));
            } else {
              alert(result.message);
            }
          })
          .catch((error) => {
            console.error(`Error deleting ${type.toLowerCase()} assignment:`, error);
            alert(`Error deleting ${type.toLowerCase()} assignment: ${error.message}`);
          })
          .finally(() => setIsDeleting(false));
      }
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { mergedAssignments, type } = deleteModalData;
      const assignmentsToDelete = selectedClassesToDelete.length === mergedAssignments.length
        ? mergedAssignments
        : mergedAssignments.filter((a) => selectedClassesToDelete.includes(a.classId));

      for (const assignment of assignmentsToDelete) {
        const result = await window.api.deleteAssignment(assignment.id);
        if (!result.success) {
          alert(`Error deleting assignment for class ${classes.find((c) => c.id === assignment.classId)?.name || "Unknown"}: ${result.message}`);
          setIsDeleting(false);
          return;
        }
      }

      setAssignments((prev) => prev.filter((a) => !assignmentsToDelete.some((m) => m.id === a.id)));
      alert(`Selected ${type} assignment(s) deleted successfully!`);
      const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
      await window.api.setCurrentFile(updatedFile);
      setCurrentFile(updatedFile);
    } catch (error) {
      console.error(`Error deleting ${deleteModalData.type.toLowerCase()} assignments:`, error);
      alert(`Error deleting ${deleteModalData.type.toLowerCase()} assignments: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setSelectedClassesToDelete([]);
      setDeleteModalData({ assignment: null, type: "", mergedAssignments: [] });
    }
  };

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

  const getTimeSlotRange = (startTime, duration) => {
    const startMinutes = parseTime(startTime);
    if (startMinutes === null) return "";
    const endMinutes = startMinutes + parseInt(duration);
    const endTime = formatTime(endMinutes);
    return `${startTime}-${endTime}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!formData.subjectId) {
        alert("Please select a subject.");
        return;
      }
      if (modalType === "Subject Assign" && !formData.teacherId) {
        alert("Please select a teacher.");
        return;
      }
      if (modalType === "Time & Date Assign" && (!formData.teacherId || !formData.classId || !formData.day || !formData.timeSlot || !formData.duration)) {
        alert("Please fill in all fields, including teacher.");
        return;
      }
      if (modalType === "Room Assign" && (!formData.teacherId || !formData.roomId || !formData.classId)) {
        alert("Please select a teacher, room, and class.");
        return;
      }

      const assignmentData = { ...formData, scheduleFileId: currentFile.id };
      if (modalType === "Time & Date Assign") {
        assignmentData.timeSlot = getTimeSlotRange(formData.timeSlot, formData.duration);
        if (!assignmentData.timeSlot) {
          alert("Invalid time slot or duration.");
          return;
        }

        // Validation for merged classes: Check if other classes for the same subject, teacher, and day have the same start time and duration
        const existingAssignments = assignments.filter(
          (a) =>
            a.type === "time" &&
            a.subjectId === assignmentData.subjectId &&
            a.teacherId === assignmentData.teacherId &&
            a.day === assignmentData.day &&
            a.classId !== assignmentData.classId &&
            (!editingId || a.id !== editingId)
        );

        if (existingAssignments.length > 0) {
          const referenceAssignment = existingAssignments[0];
          if (
            referenceAssignment.timeSlot.split('-')[0].trim() !== formData.timeSlot ||
            referenceAssignment.duration !== parseInt(formData.duration)
          ) {
            alert(
              "Cannot save: Merged classes must have the same start time and duration for the same subject, teacher, and day."
            );
            return;
          }
        }

        // Check for conflicts
        const startSlot = timeSlots.findIndex((slot) => slot.split('-')[0].trim() === formData.timeSlot);
        const span = Math.round(parseInt(formData.duration) / 30);
        const dayAssignments = assignments.filter(
          (a) => a.type === "time" && a.day === assignmentData.day && (!editingId || a.id !== editingId)
        );

        const conflicts = new Set();
        for (let i = startSlot; i < startSlot + span; i++) {
          dayAssignments.forEach((ass) => {
            const assStart = timeSlots.findIndex((slot) => slot.split('-')[0].trim() === ass.timeSlot.split('-')[0].trim());
            const assSpan = Math.round(ass.duration / 30);
            if (assStart <= i && assStart + assSpan > i) {
              if (ass.teacherId === assignmentData.teacherId && ass.subjectId !== assignmentData.subjectId) {
                conflicts.add(
                  `Teacher ${teachers.find((t) => t.id === ass.teacherId)?.fullName || "Unknown"} is already assigned to ${subjects.find((s) => s.id === ass.subjectId)?.name || "Unknown"
                  } at this time.`
                );
              }
              if (ass.classId === assignmentData.classId) {
                conflicts.add(
                  `Class ${classes.find((c) => c.id === ass.classId)?.name || "Unknown"} is already scheduled at this time.`
                );
              }
            }
          });
        }

        if (conflicts.size > 0) {
          alert([...conflicts].join("\n"));
          return;
        }
      }

      let updatedAssignment;

      if (editingId) {
        assignmentData.id = editingId;
        let result;
        if (modalType === "Subject Assign") {
          result = await window.api.updateTeacherSubjectAssignment(assignmentData);
          if (result.success) {
            updatedAssignment = { ...assignmentData, id: editingId, type: "subject" };
          }
        } else if (modalType === "Time & Date Assign") {
          result = await window.api.updateTimeSlotAssignment(assignmentData);
          if (result.success) {
            updatedAssignment = { ...assignmentData, id: editingId, type: "time" };
          }
        } else if (modalType === "Room Assign") {
          result = await window.api.updateRoomAssignment(assignmentData);
          if (result.success) {
            updatedAssignment = { ...assignmentData, id: editingId, type: "room" };
          }
        }
        if (!result.success) {
          alert(result.message);
          return;
        }
        setAssignments((prev) =>
          prev.map((a) => (a.id === editingId ? updatedAssignment : a))
        );
        alert(`${modalType} updated successfully!`);
      } else {
        let result;
        let newAssignment;
        if (modalType === "Subject Assign") {
          result = await window.api.assignTeacherToSubject(assignmentData);
          if (result.success) {
            newAssignment = { ...assignmentData, id: result.id, type: "subject" };
          }
        } else if (modalType === "Time & Date Assign") {
          result = await window.api.assignTimeSlot(assignmentData);
          if (result.success) {
            newAssignment = { ...assignmentData, id: result.id, type: "time" };
          }
        } else if (modalType === "Room Assign") {
          result = await window.api.assignRoom(assignmentData);
          if (result.success) {
            newAssignment = { ...assignmentData, id: result.id, type: "room" };
          }
        }
        if (!result.success) {
          alert(result.message);
          return;
        }
        setAssignments((prev) => [...prev, newAssignment]);
        alert(`${modalType} saved successfully!`);
      }

      setShowModal(false);
      setFormData({});
      setEditingId(null);
      const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
      await window.api.setCurrentFile(updatedFile);
      setCurrentFile(updatedFile);
    } catch (error) {
      console.error(`Error saving ${modalType.toLowerCase()}:`, error);
      alert(`Error saving ${modalType.toLowerCase()}: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getTeacherSubjectCount = (teacherId) => {
    if (!assignments || !Array.isArray(assignments)) return 0;
    return assignments.filter((a) => a.type === "subject" && a.teacherId === teacherId).length;
  };

  const getFilteredSubjects = () => {
    let filteredSubjects = [...subjects];
    if (subjectSearch) {
      filteredSubjects = filteredSubjects.filter((subject) =>
        subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
      );
    }
    if (!filterOptions.showWithTeachers) {
      filteredSubjects = filteredSubjects.filter(
        (subject) => !assignments.some((a) => a.type === "subject" && a.subjectId === subject.id)
      );
    }
    if (!filterOptions.showWithoutTeachers) {
      filteredSubjects = filteredSubjects.filter(
        (subject) => assignments.some((a) => a.type === "subject" && a.subjectId === subject.id)
      );
    }
    if (filterOptions.programId) {
      filteredSubjects = filteredSubjects.filter(
        (subject) => subject.programId === parseInt(filterOptions.programId)
      );
    }
    if (filterOptions.yearLevel) {
      filteredSubjects = filteredSubjects.filter(
        (subject) => subject.yearLevel === filterOptions.yearLevel
      );
    }
    if (filterOptions.sortAZ) {
      filteredSubjects.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filteredSubjects;
  };

  const toggleProgram = (programId) => {
    setExpandedPrograms((prev) => ({
      ...prev,
      [programId]: !prev[programId],
    }));
  };

  const toggleYear = (programId, year) => {
    setExpandedYears((prev) => ({
      ...prev,
      [`${programId}-${year}`]: !prev[`${programId}-${year}`],
    }));
  };

  const timeSlots = [
    '7:00 AM-7:30 AM', '7:30 AM-8:00 AM', '8:00 AM-8:30 AM', '8:30 AM-9:00 AM',
    '9:00 AM-9:30 AM', '9:30 AM-10:00 AM', '10:00 AM-10:30 AM', '10:30 AM-11:00 AM',
    '11:00 AM-11:30 AM', '11:30 AM-12:00 PM', '12:00 PM-12:30 PM', '12:30 PM-1:00 PM',
    '1:00 PM-1:30 PM', '1:30 PM-2:00 PM', '2:00 PM-2:30 PM', '2:30 PM-3:00 PM',
    '3:00 PM-3:30 PM', '3:30 PM-4:00 PM', '4:00 PM-4:30 PM', '4:30 PM-5:00 PM',
    '5:00 PM-5:30 PM', '5:30 PM-6:00 PM', '6:00 PM-6:30 PM', '6:30 PM-7:00 PM',
    '7:00 PM-7:30 PM', '7:30 PM-8:00 PM', '8:00 PM-8:30 PM', '8:30 PM-9:00 PM',
    '9:00 PM-9:30 PM', '9:30 PM-10:00 PM'
  ];

  const startTimeArray = [
    "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
    "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getDayAssignments = (selectedTeacherId) => {
    const timeAssignments = assignments.filter(
      a => a.type === "time" && a.teacherId === selectedTeacherId
    );

    const groupedAssignments = {};
    timeAssignments.forEach(a => {
      const key = `${a.subjectId}-${a.teacherId}-${a.day}-${a.timeSlot}`;
      if (!groupedAssignments[key]) {
        groupedAssignments[key] = {
          subjectId: a.subjectId,
          teacherId: a.teacherId,
          day: a.day,
          timeSlot: a.timeSlot,
          duration: a.duration,
          classIds: [a.classId],
          ids: [a.id]
        };
      } else {
        groupedAssignments[key].classIds.push(a.classId);
        groupedAssignments[key].ids.push(a.id);
      }
    });

    const dayAssignments = {};
    days.forEach(day => {
      dayAssignments[day] = Object.values(groupedAssignments)
        .filter(a => a.day === day)
        .map(a => {
          const startTime = a.timeSlot.split('-')[0].trim();
          const slotIndex = timeSlots.findIndex(slot => slot.split('-')[0].trim() === startTime);
          const classNames = a.classIds
            .map(classId => classes.find(c => c.id === classId)?.name || "Unknown")
            .join(", ");
          return {
            start: slotIndex,
            span: Math.round(a.duration / 30),
            assignment: {
              id: a.ids[0],
              subjectId: a.subjectId,
              teacherId: a.teacherId,
              classId: a.classIds[0],
              day: a.day,
              timeSlot: a.timeSlot,
              duration: a.duration,
              classNames,
              classIds: a.classIds,
              ids: a.ids
            }
          };
        })
        .filter(a => a.start !== -1)
        .sort((a, b) => a.start - b.start);
    });
    return dayAssignments;
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!currentFile) {
    return <div className="p-4">No file selected.</div>;
  }

  const tabs = ["Subject Assign", "Time & Date Assign", "Room Assign"];

  return (
    <div className="p-4">
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium transition-colors
          ${activeTab === tab
                  ? "text-teal-600 border-b-2 border-teal-600"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "Subject Assign" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Teachers</h2>
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`p-2 rounded-md cursor-pointer flex items-center justify-between ${selectedTeacherId === teacher.id ? "bg-teal-100" : "hover:bg-gray-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: teacher.color }}
                    ></div>
                    <span>
                      {teacher.honorifics} {teacher.fullName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {getTeacherSubjectCount(teacher.id)} subjects
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">
              Assigned Subjects {selectedTeacherId && `for ${teachers.find((t) => t.id === selectedTeacherId)?.fullName}`}
            </h2>
            <div className="space-y-2">
              {selectedTeacherId ? (
                assignments
                  .filter((a) => a.type === "subject" && a.teacherId === selectedTeacherId)
                  .map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md"
                    >
                      <span>{subjects.find((s) => s.id === assignment.subjectId)?.name || "Unknown"}</span>
                      <button
                        onClick={() => handleDelete(assignment.id, "Subject")}
                        disabled={isDeleting}
                        className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))
              ) : (
                <p className="text-gray-500">Select a teacher to view assigned subjects</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Subjects</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
              />
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300"
                >
                  <FiFilter /> Filter
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filterOptions.sortAZ}
                          onChange={() =>
                            setFilterOptions((prev) => ({ ...prev, sortAZ: !prev.sortAZ }))
                          }
                          className="h-4 w-4 text-teal-600"
                        />
                        Sort A-Z
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filterOptions.showWithTeachers}
                          onChange={() =>
                            setFilterOptions((prev) => ({
                              ...prev,
                              showWithTeachers: !prev.showWithTeachers,
                            }))
                          }
                          className="h-4 w-4 text-teal-600"
                        />
                        Show subjects with teachers
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filterOptions.showWithoutTeachers}
                          onChange={() =>
                            setFilterOptions((prev) => ({
                              ...prev,
                              showWithoutTeachers: !prev.showWithoutTeachers,
                            }))
                          }
                          className="h-4 w-4 text-teal-600"
                        />
                        Show subjects without teachers
                      </label>
                      <select
                        value={filterOptions.programId}
                        onChange={(e) =>
                          setFilterOptions((prev) => ({ ...prev, programId: e.target.value }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">All Programs</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filterOptions.yearLevel}
                        onChange={(e) =>
                          setFilterOptions((prev) => ({ ...prev, yearLevel: e.target.value }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">All Year Levels</option>
                        {["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowFilterDropdown(false)}
                        className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredSubjects().map((subject) => (
                <div
                  key={subject.id}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md"
                >
                  <span>{subject.name}</span>
                  <button
                    onClick={() => {
                      setModalType("Subject Assign");
                      setFormData({ subjectId: subject.id, teacherId: selectedTeacherId || "" });
                      setShowModal(true);
                    }}
                    className="text-teal-600 hover:text-teal-700"
                  >
                    <FiPlus />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Time & Date Assign" && (
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Teachers</h2>
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`p-2 rounded-md cursor-pointer flex items-center justify-between ${selectedTeacherId === teacher.id ? "bg-teal-100" : "hover:bg-gray-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: teacher.color }}
                    ></div>
                    <span>
                      {teacher.honorifics} {teacher.fullName}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {getTeacherSubjectCount(teacher.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">
              Schedule {selectedTeacherId && `for ${teachers.find((t) => t.id === selectedTeacherId)?.fullName}`}
            </h2>
            <button
              onClick={() => handleAssign("Time & Date Assign")}
              disabled={isSaving || !selectedTeacherId}
              className={`mt-4 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 mb-5 ${(isSaving || !selectedTeacherId) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <FiPlus /> Add Schedule
            </button>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              {selectedTeacherId ? (
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      {days.map(day => <th key={day} className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">{day}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map((slot, rowIndex) => (
                      <tr key={slot} className="px-6 py-3 text-left text-xs font-medium text-gray-700 tracking-wider">
                        <td className="border p-2">{slot}</td>
                        {days.map(day => {
                          const dayAss = getDayAssignments(selectedTeacherId)[day] || [];
                          for (let ass of dayAss) {
                            if (ass.start === rowIndex) {
                              const subject = subjects.find(s => s.id === ass.assignment.subjectId)?.name || "Unknown";
                              const teacher = teachers.find(t => t.id === ass.assignment.teacherId);
                              const bgColor = teacher?.color || "#e0f7fa";
                              return (
                                <td
                                  key={day}
                                  rowSpan={ass.span}
                                  className="border p-2 align-top whitespace-normal break-words text-sm leading-snug"
                                  style={{ backgroundColor: bgColor, wordBreak: "break-word" }}
                                >
                                  <div className="p-2 flex flex-col h-full">
                                    <span className="text-sm text-gray-200 break-words">
                                      {subject} ({ass.assignment.classNames})
                                    </span>
                                    <span className="text-sm text-gray-200">{ass.assignment.timeSlot}</span>
                                    <div className="flex gap-1 mt-2">
                                      <button
                                        onClick={() => handleEdit(ass.assignment, "Time & Date Assign")}
                                        className="text-blue-500 hover:text-blue-700"
                                      >
                                        <FiEdit />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(ass.assignment, "Time")}
                                        disabled={isDeleting}
                                        className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                                      >
                                        <FiTrash2 />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              );
                            } else if (ass.start < rowIndex && ass.start + ass.span > rowIndex) {
                              return null;
                            }
                          }
                          return <td key={day} className="border p-2"></td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500 p-2">Select a teacher to view schedule</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Room Assign" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Programs & Classes</h2>
            <div className="space-y-2">
              {programs.map((program) => (
                <div key={program.id}>
                  <div
                    className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                    onClick={() => toggleProgram(program.id)}
                  >
                    <span>{program.name}</span>
                    {expandedPrograms[program.id] ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                  {expandedPrograms[program.id] && (
                    <div className="ml-4 space-y-2">
                      {(() => {
                        const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
                        return Array.from({ length: program.years }, (_, i) => `${ordinals[i]} Year`).map((year) => (
                          <div key={year}>
                            <div
                              className="flex justify-between items-center p-2 cursor-pointer hover:bg-gray-100 rounded-md"
                              onClick={() => toggleYear(program.id, year)}
                            >
                              <span>{year}</span>
                              {expandedYears[`${program.id}-${year}`] ? <FiChevronUp /> : <FiChevronDown />}
                            </div>

                            {expandedYears[`${program.id}-${year}`] && (
                              <div className="ml-4 space-y-2">
                                {classes
                                  .filter((c) => c.programId === program.id && c.yearLevel === year)
                                  .map((cls) => (
                                    <div
                                      key={cls.id}
                                      onClick={() => setSelectedClassId(cls.id)}
                                      className={`p-2 rounded-md cursor-pointer ${selectedClassId === cls.id ? "bg-teal-100" : "hover:bg-gray-100"
                                        }`}
                                    >
                                      {cls.name}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Class Room Assignments</h2>
            {selectedClassId ? (
              <>
                <div className="mb-6 pb-4 border-b">
                  <h3 className="text-md font-medium text-gray-900">
                    {classes.find((c) => c.id === selectedClassId)?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {classes.find((c) => c.id === selectedClassId)?.students || 0} Students
                  </p>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {assignments
                    .filter((a) => a.type === "room" && a.classId === selectedClassId)
                    .map((assignment) => {
                      const timeAssignment = assignments.find(
                        (t) => t.type === "time" && t.subjectId === assignment.subjectId && t.classId === assignment.classId && t.teacherId === assignment.teacherId
                      );
                      const subjectAssignment = assignments.find(
                        (s) => s.type === "subject" && s.subjectId === assignment.subjectId && s.teacherId === assignment.teacherId
                      );
                      const teacher = teachers.find((t) => t.id === assignment.teacherId)?.fullName || "No teacher";
                      const room = rooms.find((r) => r.id === assignment.roomId)?.name || "No room";
                      const schedule = timeAssignment
                        ? { time: timeAssignment.timeSlot, day: timeAssignment.day }
                        : null;
                      return (
                        <div
                          key={assignment.id}
                          className="p-4 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-2">
                                {subjects.find((s) => s.id === assignment.subjectId)?.name || "Unknown"}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>{teacher}</span>
                                <span className="text-gray-300">•</span>
                                <span>{room}</span>
                                {schedule && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>{schedule.day}</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{schedule.time}</span>
                                  </>
                                )}
                                {!schedule && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-amber-600">No schedule</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDelete(assignment.id, "Room")}
                              disabled={isDeleting}
                              className={`ml-3 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              aria-label="Delete assignment"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Select a class to view room assignments</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Rooms</h2>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md"
                >
                  <span>{room.name}</span>
                  <button
                    onClick={() => {
                      setModalType("Room Assign");
                      setFormData({ roomId: room.id, classId: selectedClassId || "", teacherId: selectedTeacherId || "" });
                      setShowModal(true);
                    }}
                    className="text-teal-600 hover:text-teal-700"
                  >
                    <FiPlus />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? `Edit ${modalType}` : modalType}
          onClose={() => {
            setShowModal(false);
            setFormData({});
            setEditingId(null);
          }}
          onSave={handleSave}
          isSaving={isSaving}
        >
          {modalType === "Subject Assign" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Teacher</label>
                <select
                  value={formData.teacherId || selectedTeacherId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.honorifics} {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Subject</label>
                <select
                  value={formData.subjectId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {modalType === "Time & Date Assign" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Teacher</label>
                <select
                  value={formData.teacherId || selectedTeacherId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.honorifics} {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Subject</label>
                <select
                  value={formData.subjectId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Class</label>
                {editingId && formData.classIds && formData.classIds.length > 1 ? (
                  <select
                    value={formData.classId || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select class to edit</option>
                    {formData.classIds.map((classId) => (
                      <option key={classId} value={classId}>
                        {classes.find((c) => c.id === classId)?.name || "Unknown"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formData.classId || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Day</label>
                <select
                  value={formData.day || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select day</option>
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <select
                  value={formData.timeSlot || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, timeSlot: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
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
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select
                  value={formData.duration || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select duration</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                  <option value="210">3.5 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
            </>
          )}
          {modalType === "Room Assign" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Teacher</label>
                <select
                  value={formData.teacherId || selectedTeacherId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.honorifics} {teacher.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Subject</label>
                <select
                  value={formData.subjectId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subjectId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Room</label>
                <select
                  value={formData.roomId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, roomId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Class</label>
                <select
                  value={formData.classId || selectedClassId || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </Modal>
      )}

      {showDeleteModal && (
        <Modal
          title={`Delete ${deleteModalData.type} Assignment`}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedClassesToDelete([]);
            setDeleteModalData({ assignment: null, type: "", mergedAssignments: [] });
          }}
          onSave={handleDeleteConfirm}
          isSaving={isDeleting}
          saveButtonText="Delete Selected"
        >
          <div>
            <p className="text-sm text-gray-700 mb-4">
              Select the class(es) to delete for "{subjects.find((s) => s.id === deleteModalData.assignment.subjectId)?.name || "Unknown"}" on {deleteModalData.assignment.day} at {deleteModalData.assignment.timeSlot}:
            </p>
            <div className="space-y-2">
              {deleteModalData.mergedAssignments.map((assignment) => (
                <label key={assignment.classId} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedClassesToDelete.includes(assignment.classId)}
                    onChange={(e) => {
                      setSelectedClassesToDelete((prev) =>
                        e.target.checked
                          ? [...prev, assignment.classId]
                          : prev.filter((id) => id !== assignment.classId)
                      );
                    }}
                    className="h-4 w-4 text-teal-600"
                  />
                  <span>{classes.find((c) => c.id === assignment.classId)?.name || "Unknown"}</span>
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}