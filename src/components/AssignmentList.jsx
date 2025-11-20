// src/components/AssignmentList.jsx
import { FiClock, FiHome } from "react-icons/fi";

export default function AssignmentList({
  filteredAssignments,
  searchTerm,
  setSearchTerm,
  filterOptions,
  setFilterOptions,
  setSelectedTeacherId,
  teachers,
  classes,
  subjects,
  getSubjectName,
  getTeacherName,
  getTeacherColor,
  getLightBackgroundColor,
  getClassName,
  getRoomName,
  getProgramName,
  userRole,
}) {
  const isNoTeacher = (teacherId) => getTeacherName(teacherId) === "No Teacher";

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg border fixed right-4 top-36 bottom-4 flex flex-col" style={{ zIndex: 500 }}>
      <div className="bg-zinc-900 rounded-t-lg p-4 text-white">
        <h2 className="text-md font-semibold mb-4">Assignment List</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by subject or teacher..."
          className="w-full p-2 border bg-zinc-900 border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 text-white placeholder-gray-400"
        />
        <div className="mt-2 space-y-2">
          <select
            value={filterOptions.teacherId}
            onChange={(e) => {
              const teacherId = e.target.value ? parseInt(e.target.value) : "";
              setFilterOptions({ ...filterOptions, teacherId });
              setSelectedTeacherId(teacherId || null);
            }}
            className="w-full p-2 border bg-zinc-900 border-gray-300 rounded-md text-white"
          >
            <option value="">All Teachers</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.honorifics} {teacher.fullName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterOptions.showWithSchedule}
              onChange={(e) => setFilterOptions({ ...filterOptions, showWithSchedule: e.target.checked })}
              className="h-4 w-4 text-teal-600 rounded"
            />
            Show with schedule
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filterOptions.showWithoutSchedule}
              onChange={(e) => setFilterOptions({ ...filterOptions, showWithoutSchedule: e.target.checked })}
              className="h-4 w-4 text-teal-600 rounded"
            />
            Show without schedule
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
        {filteredAssignments.map((assignment) => {
          const classData = assignment.classId ? classes.find((c) => c.id === assignment.classId) : null;
          const subjectData = subjects.find((s) => s.id === assignment.subjectId);
          const programName = classData
            ? getProgramName(classData.programId)
            : subjectData?.programId
              ? getProgramName(subjectData.programId)
              : "N/A";
          const classDisplay = assignment.classId ? getClassName(assignment.classId) : "No Class";

          const color = getTeacherColor(assignment.teacherId);
          const lightBg = getLightBackgroundColor(color);

          return (
            <div
              key={assignment.id}
              draggable={userRole !== "view"}
              onDragStart={(e) => userRole !== "view" && e.dataTransfer.setData("text/plain", assignment.id)}
              className={`p-3 rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${userRole !== "view" ? "cursor-move hover:border-gray-400" : ""
                }`}
              style={{
                backgroundColor: lightBg,
                borderColor: isNoTeacher ? '#f0efeb' : color + '40'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">
                    {getSubjectName(assignment.subjectId)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: color + "20", color }}
                    >
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

              <div className="space-y-1 mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                {assignment.timeSlot && (
                  <div className="flex items-center gap-2">
                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{assignment.day}</span>
                    <span>{assignment.timeSlot}</span>
                    <span className="text-gray-400">•</span>
                    <span>{classDisplay}</span>
                  </div>
                )}
                {assignment.roomId && (
                  <div className="flex items-center gap-2">
                    <FiHome className="w-3.5 h-3.5 text-gray-400" />
                    <span>{getRoomName(assignment.roomId)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{programName}</span>
                  <span className="text-gray-300">|</span>
                  <span>{classDisplay}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="font-medium">No assignments found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}