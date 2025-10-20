"use client"

// pages/ManageData.jsx
import { useState, useEffect } from "react"
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi"
import Modal from "../components/Modal"

export default function ManageData() {
  const [activeTab, setActiveTab] = useState("Teachers")
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [rooms, setRooms] = useState([])
  const [classes, setClasses] = useState([])
  const [programs, setPrograms] = useState([])
  const [formData, setFormData] = useState({})
  const [selectedItem, setSelectedItem] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [modalType, setModalType] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // New states for custom alert/confirm
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Predefined colors for teachers
  const presetColors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#FACC15', // Yellow
    '#22C55E', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6B7280', // Gray
    '#A855F7', // Violet
  ]

  const tabTypes = {
    Teachers: "Teacher",
    Subjects: "Subject",
    Rooms: "Room",
    Classes: "Class",
    Programs: "Program"
  }

  const currentType = tabTypes[activeTab]

  // Helper to show custom alert
  const customAlert = (message) => {
    setAlertMessage(message)
    setShowAlertModal(true)
  }

  // Helper to show custom confirm
  const customConfirm = (message, callback) => {
    setConfirmMessage(message)
    setConfirmCallback(() => callback) // Wrap in function to call later
    setShowConfirmModal(true)
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [teachersData, subjectsData, roomsData, classesData, programsData] = await Promise.all([
          window.api.getTeachers(),
          window.api.getSubjects(),
          window.api.getRooms(),
          window.api.getClasses(),
          window.api.getPrograms(),
        ])
        setTeachers(teachersData)
        setSubjects(subjectsData)
        setRooms(roomsData)
        setClasses(classesData)
        setPrograms(programsData)
      } catch (error) {
        console.error("Error fetching data:", error)
        customAlert("Error loading data: " + (error.message || "Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAdd = () => {
    setIsAdding(true)
    setModalType(`Add ${currentType}s`)
    setFormData({})
    setSelectedItem(null)
  }

  const selectItem = (item) => {
    setIsAdding(false)
    setModalType(`Edit ${currentType}`)
    setFormData({ ...item })
    setSelectedItem(item)
  }

  const handleDelete = async (type, id) => {
    customConfirm(`Are you sure you want to delete this ${type.toLowerCase()}?`, async () => {
      setIsDeleting(true)
      try {
        const result = await window.api[`delete${type}`](id)
        if (result.success) {
          if (type === "Teacher") setTeachers((prev) => prev.filter((t) => t.id !== id))
          else if (type === "Subject") setSubjects((prev) => prev.filter((s) => s.id !== id))
          else if (type === "Room") setRooms((prev) => prev.filter((r) => r.id !== id))
          else if (type === "Class") setClasses((prev) => prev.filter((c) => c.id !== id))
          else if (type === "Program") setPrograms((prev) => prev.filter((p) => p.id !== id))
          
          // Clear selection if deleted item was selected
          setSelectedItem((prev) => prev?.id === id ? null : prev)
          setIsAdding(false)
          
          customAlert(`${type} deleted successfully!`)
          const currentFile = await window.api.getCurrentFile()
          if (currentFile) {
            const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true }
            await window.api.setCurrentFile(updatedFile)
          }
        } else {
          customAlert(result.message || `Failed to delete ${type.toLowerCase()}.`)
        }
      } catch (error) {
        console.error(`Error deleting ${type.toLowerCase()}:`, error)
        customAlert(`Error deleting ${type.toLowerCase()}: ${error.message || "Unknown error"}`)
      } finally {
        setIsDeleting(false)
      }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (modalType.includes("Teacher") && (!formData.fullName || !formData.color)) {
        customAlert("Full name and color are required.")
        return
      }
      if (modalType.includes("Subject") && (!formData.name || !formData.code || !formData.units)) {
        customAlert("Name, code, and units are required.")
        return
      }
      if (modalType.includes("Room") && (!formData.name || !formData.capacity)) {
        customAlert("Name and capacity are required.")
        return
      }
      if (
        modalType.includes("Class") &&
        (!formData.name || !formData.students || !formData.programId || !formData.yearLevel)
      ) {
        customAlert("All fields are required.")
        return
      }
      if (modalType.includes("Program") && (!formData.name || !formData.years)) {
        customAlert("Name and years are required.")
        return
      }

      let newItem
      if (modalType.includes("Teacher")) {
        const result = await window.api.saveTeacher(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) }
          setTeachers((prev) =>
            modalType.includes("Add") ? [...prev, newItem] : prev.map((t) => (t.id === formData.id ? newItem : t)),
          )
        } else {
          customAlert(result.message || "Failed to save teacher.")
          return
        }
      } else if (modalType.includes("Subject")) {
        const result = await window.api.saveSubject(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) }
          setSubjects((prev) =>
            modalType.includes("Add") ? [...prev, newItem] : prev.map((s) => (s.id === formData.id ? newItem : s)),
          )
        } else {
          customAlert(result.message || "Failed to save subject.")
          return
        }
      } else if (modalType.includes("Room")) {
        const result = await window.api.saveRoom(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) }
          setRooms((prev) =>
            modalType.includes("Add") ? [...prev, newItem] : prev.map((r) => (r.id === formData.id ? newItem : r)),
          )
        } else {
          customAlert(result.message || "Failed to save room.")
          return
        }
      } else if (modalType.includes("Class")) {
        const result = await window.api.saveClass(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) }
          setClasses((prev) =>
            modalType.includes("Add") ? [...prev, newItem] : prev.map((c) => (c.id === formData.id ? newItem : c)),
          )
        } else {
          customAlert(result.message || "Failed to save class.")
          return
        }
      } else if (modalType.includes("Program")) {
        const result = await window.api.saveProgram(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) }
          setPrograms((prev) =>
            modalType.includes("Add") ? [...prev, newItem] : prev.map((p) => (p.id === formData.id ? newItem : p)),
          )
        } else {
          customAlert(result.message || "Failed to save program.")
          return
        }
      }

      // Update selected item for edits
      if (!modalType.includes("Add")) {
        setSelectedItem(newItem)
      } else {
        setSelectedItem(newItem)
      }

      setIsAdding(false)
      customAlert(`${currentType} saved successfully!`)
      const currentFile = await window.api.getCurrentFile()
      if (currentFile) {
        const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true }
        await window.api.setCurrentFile(updatedFile)
      }
    } catch (error) {
      console.error(`Error saving ${modalType.toLowerCase()}:`, error)
      if (modalType.includes("Teacher") && error.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed")) {
        customAlert("A teacher with this name or color already exists.")
      } else {
        customAlert(`Error saving ${currentType.toLowerCase()}: ${error.message || "Unknown error"}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = ["Teachers", "Subjects", "Rooms", "Classes", "Programs"]

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4">
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium transition-colors
          ${activeTab === tab ? "text-teal-600 border-b-2 border-teal-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{activeTab} List</h2>
            <button
              onClick={handleAdd}
              disabled={isSaving || isDeleting}
              className={`flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 ${
                isSaving || isDeleting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FiPlus /> Add New
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            {activeTab === "Teachers" && (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr 
                      key={teacher.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(teacher)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: teacher.color }}></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teacher.honorifics} {teacher.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Teacher", teacher.id)
                          }}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${
                            isDeleting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Subjects" && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjects.map((subject) => (
                    <tr 
                      key={subject.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(subject)}
                    >
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.units}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.yearLevel}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Subject", subject.id)
                          }}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${
                            isDeleting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Rooms" && (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Room Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => (
                    <tr 
                      key={room.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(room)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Room", room.id)
                          }}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${
                            isDeleting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Classes" && (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Class Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      No. of Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classes.map((cls) => (
                    <tr 
                      key={cls.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(cls)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{cls.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{cls.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Class", cls.id)
                          }}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${
                            isDeleting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Programs" && (
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase">Program Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase">Years</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programs.map((program) => (
                    <tr 
                      key={program.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(program)}
                    >
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{program.name}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{program.years}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Program", program.id)
                          }}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${
                            isDeleting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          {selectedItem || isAdding ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  {isAdding ? "Add New" : "Edit"} {currentType}
                </h3>
                {!isAdding && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(currentType, selectedItem.id)
                    }}
                    disabled={isDeleting}
                    className={`text-red-500 hover:text-red-700 p-1 rounded ${
                      isDeleting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {activeTab === "Teachers" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        value={formData.fullName || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Honorifics</label>
                      <select
                        value={formData.honorifics || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, honorifics: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select honorific</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Prof.">Prof.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Choose Color</label>
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              formData.color === color ? 'border-teal-500 scale-110' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setFormData((prev) => ({ ...prev, color }))}
                            title={`Select ${color}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Custom Color:</label>
                        <input
                          type="color"
                          value={formData.color || "#000000"}
                          onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                          className="w-12 h-12"
                        />
                      </div>
                    </div>
                  </>
                )}
                {activeTab === "Subjects" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter subject name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subject Code</label>
                      <input
                        type="text"
                        value={formData.code || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter subject code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Units</label>
                      <input
                        type="number"
                        value={formData.units || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, units: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter units"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Semester</label>
                      <select
                        value={formData.semester || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, semester: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select semester</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Course/Program</label>
                      <select
                        value={formData.programId || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, programId: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year Level</label>
                      <select
                        value={formData.yearLevel || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, yearLevel: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select year level</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </>
                )}
                {activeTab === "Rooms" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Room/Lab Name</label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter room name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Capacity</label>
                      <input
                        type="number"
                        value={formData.capacity || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, capacity: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter capacity"
                      />
                    </div>
                  </>
                )}
                {activeTab === "Classes" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Class Name</label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter class name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">No. of Students</label>
                      <input
                        type="number"
                        value={formData.students || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, students: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter number of students"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Program</label>
                      <select
                        value={formData.programId || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, programId: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select program</option>
                        {programs.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Year Level</label>
                      <select
                        value={formData.yearLevel || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, yearLevel: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select year level</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </>
                )}
                {activeTab === "Programs" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Program Name</label>
                      <input
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter program name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Years Offered</label>
                      <input
                        type="number"
                        value={formData.years || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, years: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                        placeholder="Enter years offered"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setFormData({})
                    setSelectedItem(null)
                    setIsAdding(false)
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  disabled={isSaving || isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isDeleting}
                  className={`px-4 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isAdding 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  {isSaving ? "Saving..." : (isAdding ? "Create" : "Save")}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FiEdit className="w-12 h-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No {currentType.toLowerCase()} selected</h3>
              <p className="text-center mb-4">
                Select a {currentType.toLowerCase()} from the list to edit its information.
              </p>
            </div>
          )}
        </div>
      </div>

      {showAlertModal && (
        <Modal title="Alert" type="alert" message={alertMessage} onClose={() => setShowAlertModal(false)} />
      )}
      {showConfirmModal && (
        <Modal
          title="Confirm"
          type="confirm"
          message={confirmMessage}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => {
            if (confirmCallback) confirmCallback()
            setShowConfirmModal(false)
          }}
          isSaving={isDeleting}
        />
      )}
    </div>
  )
}