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
      const startTime = timeSlots.find(slot => slot === assignment.timeSlot)?.split('-')[0].trim() || "";
      setFormData({ ...assignment, timeSlot: startTime });
    } else {
      setFormData(assignment);
    }
    setEditingId(assignment.id);
    setShowModal(true);
  };

  const handleDelete = async (assignmentId, type) => {
    if (window.confirm(`Are you sure you want to delete this ${type.toLowerCase()} assignment?`)) {
      setIsDeleting(true);
      try {
        const result = await window.api.deleteAssignment(assignmentId);
        if (result.success) {
          setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
          alert(`${type} assignment deleted successfully!`);
          const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
          await window.api.setCurrentFile(updatedFile);
          setCurrentFile(updatedFile);
        } else {
          alert(result.message);
        }
      } catch (error) {
        console.error(`Error deleting ${type.toLowerCase()} assignment:`, error);
        alert(`Error deleting ${type.toLowerCase()} assignment: ${error.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
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

  const getDayAssignments = (selectedTeacherId) => {
    const timeAssignments = assignments.filter(
      a => a.type === "time" && a.teacherId === selectedTeacherId
    );

    const dayAssignments = {};
    days.forEach(day => {
      dayAssignments[day] = timeAssignments
        .filter(a => a.day === day)
        .map(a => {
          // Extract just the start time from the range string
          const startTime = a.timeSlot.split('-')[0].trim();  // e.g. "7:00 AM"
          // Find the index of the start time in timeSlots array's entries' start times
          const slotIndex = timeSlots.findIndex(slot => slot.startsWith(startTime));
          return {
            start: slotIndex,
            span: Math.round(a.duration / 60), // Convert minutes to hours for rowSpan
            assignment: a
          };
        })
        .filter(a => a.start !== -1) // Remove assignments with invalid start slot
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
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === tab ? "bg-teal-100 text-teal-600 border-t-2 border-teal-600" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {tab}
          </button>
        ))}
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
                    {getTeacherSubjectCount(teacher.id)} subjects
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
            {selectedTeacherId ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Time</th>
                    {days.map(day => <th key={day} className="border p-2 text-left">{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, rowIndex) => (
                    <tr key={slot}>
                      <td className="border p-2">{slot}</td>
                      {days.map(day => {
                        const dayAss = getDayAssignments(selectedTeacherId)[day] || [];
                        for (let ass of dayAss) {
                          if (ass.start === rowIndex) {
                            const subject = subjects.find(s => s.id === ass.assignment.subjectId)?.name || "Unknown";
                            const cls = classes.find(c => c.id === ass.assignment.classId)?.name || "Unknown";
                            const teacher = teachers.find(t => t.id === ass.assignment.teacherId);
                            const bgColor = teacher?.color || "#e0f7fa";
                            return (
                              <td
                                key={day}
                                rowSpan={ass.span}
                                className="border p-2 align-top"
                                style={{ backgroundColor: bgColor }}
                              >
                                <div className="p-2 flex flex-col h-full">
                                  <span className="text-sm text-gray-200">{subject} ({cls})</span>
                                  <span className="text-sm text-gray-200">{ass.assignment.timeSlot}</span>
                                  <div className="flex gap-1 mt-2">
                                    <button
                                      onClick={() => handleEdit(ass.assignment, "Time & Date Assign")}
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      <FiEdit />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(ass.assignment.id, "Time")}
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
              <p className="text-gray-500">Select a teacher to view schedule</p>
            )}
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
                <div className="mb-4">
                  <h3 className="text-md font-medium">
                    {classes.find((c) => c.id === selectedClassId)?.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    No. of Students: {classes.find((c) => c.id === selectedClassId)?.students || 0}
                  </p>
                </div>
                <div className="space-y-2">
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
                        ? `${timeAssignment.timeSlot} | ${timeAssignment.day}`
                        : "No schedule";
                      return (
                        <div
                          key={assignment.id}
                          className="p-2 hover:bg-gray-50 rounded-md border-b"
                        >
                          <div className="flex justify-between">
                            <span>{subjects.find((s) => s.id === assignment.subjectId)?.name || "Unknown"} | {schedule} | {room}</span>
                            <button
                              onClick={() => handleDelete(assignment.id, "Room")}
                              disabled={isDeleting}
                              className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          <p className="text-sm text-gray-600">
                            {teacher}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <p className="text-gray-500">Select a class to view room assignments</p>
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
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
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
    </div>
  );
}
