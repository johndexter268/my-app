"use client"

import { useState, useEffect } from "react"
import { FiPlus, FiEdit, FiSearch, FiFilter } from "react-icons/fi"
import { MdOutlineSort } from "react-icons/md"
import { FaTrash } from "react-icons/fa"
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState("A-Z")

  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Merge functionality states
  const [isMergeMode, setIsMergeMode] = useState(false)
  const [selectedClassesToMerge, setSelectedClassesToMerge] = useState([])
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeFormData, setMergeFormData] = useState({
    name: "",
    programId: "",
    yearLevel: ""
  })

  // Filter states for each tab
  const [showSubjectFilter, setShowSubjectFilter] = useState(false)
  const [showRoomFilter, setShowRoomFilter] = useState(false)
  const [showClassFilter, setShowClassFilter] = useState(false)

  // Filter options for each tab
  const [subjectFilter, setSubjectFilter] = useState({
    semester: "",
    programId: "",
    yearLevel: "",
    code: ""
  })

  const [roomFilter, setRoomFilter] = useState({
    minCapacity: "",
    maxCapacity: ""
  })

  const [classFilter, setClassFilter] = useState({
    programId: "",
    yearLevel: ""
  })

  const presetColors = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#FACC15", // Yellow
    "#22C55E", // Green
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#14B8A6", // Teal
    "#6B7280", // Gray
    "#A855F7", // Violet
    "#F59E0B", // Amber
    "#10B981", // Emerald
    "#D946EF", // Fuchsia
    "#06B6D4", // Cyan
    "#F43F5E", // Rose
  ]

  const tabTypes = {
    Teachers: "Teacher",
    Subjects: "Subject",
    Rooms: "Room",
    Classes: "Class",
    Programs: "Program",
  }

  const currentType = tabTypes[activeTab]

  const customAlert = (message) => {
    setAlertMessage(message)
    setShowAlertModal(true)
  }

  const customConfirm = (message, callback) => {
    setConfirmMessage(message)
    setConfirmCallback(() => callback)
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

  // Merge functionality functions
  const toggleMergeMode = () => {
    setIsMergeMode(!isMergeMode)
    if (isMergeMode) {
      setSelectedClassesToMerge([])
    }
  }

  const handleClassSelectForMerge = (classId) => {
    setSelectedClassesToMerge(prev => {
      if (prev.includes(classId)) {
        return prev.filter(id => id !== classId)
      } else {
        return [...prev, classId]
      }
    })
  }

  const handleCreateMerge = () => {
    if (selectedClassesToMerge.length < 2) {
      customAlert("Please select at least 2 classes to merge.")
      return
    }

    const selectedClassesData = classes.filter(cls => selectedClassesToMerge.includes(cls.id))

    // Auto-fill merge form data
    const totalStudents = selectedClassesData.reduce((sum, cls) => sum + (cls.students || 0), 0)
    const programs = [...new Set(selectedClassesData.map(cls => cls.programId))]
    const yearLevels = [...new Set(selectedClassesData.map(cls => cls.yearLevel))]

    setMergeFormData({
      name: `Merged Class ${Date.now()}`,
      students: totalStudents,
      programId: programs.length === 1 ? programs[0] : "",
      yearLevel: yearLevels.length === 1 ? yearLevels[0] : ""
    })

    setShowMergeModal(true)
  }

  const handleSaveMerge = async () => {
    if (!mergeFormData.name || !mergeFormData.programId || !mergeFormData.yearLevel) {
      customAlert("Please fill in all required fields for the merged class.")
      return
    }

    setIsSaving(true)
    try {
      const selectedClassesData = classes.filter(cls => selectedClassesToMerge.includes(cls.id))
      const totalStudents = selectedClassesData.reduce((sum, cls) => sum + (cls.students || 0), 0)

      const mergeData = {
        ...mergeFormData,
        students: totalStudents,
        isMerged: true,
        mergedFrom: selectedClassesToMerge,
        originalClasses: selectedClassesData.map(cls => cls.name)
      }

      const result = await window.api.saveClass(mergeData)
      if (result.success) {
        const newMergedClass = {
          ...mergeData,
          id: result.id,
          isMerged: true,
          mergedFrom: selectedClassesToMerge,
          originalClasses: selectedClassesData.map(cls => cls.name)
        }

        setClasses(prev => [...prev, newMergedClass])
        customAlert("Merged class created successfully!")

        // Reset merge state
        setShowMergeModal(false)
        setIsMergeMode(false)
        setSelectedClassesToMerge([])
        setMergeFormData({
          name: "",
          programId: "",
          yearLevel: ""
        })

        const currentFile = await window.api.getCurrentFile()
        if (currentFile) {
          const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true }
          await window.api.setCurrentFile(updatedFile)
        }
      } else {
        customAlert(result.message || "Failed to create merged class.")
      }
    } catch (error) {
      console.error("Error creating merged class:", error)
      customAlert(`Error creating merged class: ${error.message || "Unknown error"}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdd = () => {
    setFormData({})
    setShowAddModal(true)
  }

  const selectItem = (item) => {
    // Don't allow editing merged classes
    if (activeTab === "Classes" && item.isMerged) {
      customAlert("Merged classes cannot be edited.")
      return
    }
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

          setSelectedItem((prev) => (prev?.id === id ? null : prev))

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

  const handleSave = async (isAdding = false) => {
    setIsSaving(true)
    try {
      if (activeTab === "Teachers" && (!formData.fullName || !formData.color)) {
        customAlert("Full name and color are required.")
        return
      }
      if (activeTab === "Subjects" && (!formData.name || !formData.code || !formData.units)) {
        customAlert("Name, code, and units are required.")
        return
      }
      if (activeTab === "Rooms" && (!formData.name || !formData.capacity)) {
        customAlert("Name and capacity are required.")
        return
      }
      if (
        activeTab === "Classes" &&
        (!formData.name || !formData.students || !formData.programId || !formData.yearLevel)
      ) {
        customAlert("All fields are required.")
        return
      }
      if (activeTab === "Programs" && (!formData.name || !formData.years)) {
        customAlert("Name and years are required.")
        return
      }

      let newItem
      if (activeTab === "Teachers") {
        const result = await window.api.saveTeacher(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (isAdding ? Date.now() : formData.id) }
          setTeachers((prev) => (isAdding ? [...prev, newItem] : prev.map((t) => (t.id === formData.id ? newItem : t))))
        } else {
          customAlert(result.message || "Failed to save teacher.")
          return
        }
      } else if (activeTab === "Subjects") {
        const result = await window.api.saveSubject(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (isAdding ? Date.now() : formData.id) }
          setSubjects((prev) => (isAdding ? [...prev, newItem] : prev.map((s) => (s.id === formData.id ? newItem : s))))
        } else {
          customAlert(result.message || "Failed to save subject.")
          return
        }
      } else if (activeTab === "Rooms") {
        const result = await window.api.saveRoom(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (isAdding ? Date.now() : formData.id) }
          setRooms((prev) => (isAdding ? [...prev, newItem] : prev.map((r) => (r.id === formData.id ? newItem : r))))
        } else {
          customAlert(result.message || "Failed to save room.")
          return
        }
      } else if (activeTab === "Classes") {
        const result = await window.api.saveClass(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (isAdding ? Date.now() : formData.id) }
          setClasses((prev) => (isAdding ? [...prev, newItem] : prev.map((c) => (c.id === formData.id ? newItem : c))))
        } else {
          customAlert(result.message || "Failed to save class.")
          return
        }
      } else if (activeTab === "Programs") {
        const result = await window.api.saveProgram(formData)
        if (result.success) {
          newItem = { ...formData, id: result.id || (isAdding ? Date.now() : formData.id) }
          setPrograms((prev) => (isAdding ? [...prev, newItem] : prev.map((p) => (p.id === formData.id ? newItem : p))))
        } else {
          customAlert(result.message || "Failed to save program.")
          return
        }
      }

      if (isAdding) {
        setShowAddModal(false)
        setFormData({})
      } else {
        setSelectedItem(newItem)
      }

      customAlert(`${currentType} saved successfully!`)
      const currentFile = await window.api.getCurrentFile()
      if (currentFile) {
        const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true }
        await window.api.setCurrentFile(updatedFile)
      }
    } catch (error) {
      console.error(`Error saving ${currentType.toLowerCase()}:`, error)
      if (activeTab === "Teachers" && error.message.includes("SQLITE_CONSTRAINT: UNIQUE constraint failed")) {
        customAlert("A teacher with this name or color already exists.")
      } else {
        customAlert(`Error saving ${currentType.toLowerCase()}: ${error.message || "Unknown error"}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const filterAndSortData = (data, nameKey) => {
    let filteredData = data

    // Text search
    if (searchQuery) {
      filteredData = data.filter((item) => item[nameKey]?.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Apply tab-specific filters
    if (activeTab === "Subjects") {
      if (subjectFilter.semester) {
        filteredData = filteredData.filter(item => item.semester === subjectFilter.semester)
      }
      if (subjectFilter.programId) {
        filteredData = filteredData.filter(item => String(item.programId) === String(subjectFilter.programId))
      }
      if (subjectFilter.yearLevel) {
        filteredData = filteredData.filter(item => item.yearLevel === subjectFilter.yearLevel)
      }
      if (subjectFilter.code) {
        filteredData = filteredData.filter(item => item.code?.toLowerCase().includes(subjectFilter.code.toLowerCase()))
      }
    }

    if (activeTab === "Rooms") {
      if (roomFilter.minCapacity) {
        filteredData = filteredData.filter(item => item.capacity >= parseInt(roomFilter.minCapacity))
      }
      if (roomFilter.maxCapacity) {
        filteredData = filteredData.filter(item => item.capacity <= parseInt(roomFilter.maxCapacity))
      }
    }

    if (activeTab === "Classes") {
      if (classFilter.programId) {
        filteredData = filteredData.filter(item => String(item.programId) === String(classFilter.programId))
      }
      if (classFilter.yearLevel) {
        filteredData = filteredData.filter(item => item.yearLevel === classFilter.yearLevel)
      }
    }

    // Sort
    return filteredData.sort((a, b) => {
      const nameA = a[nameKey]?.toLowerCase() || ""
      const nameB = b[nameKey]?.toLowerCase() || ""
      return sortOrder === "A-Z" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA)
    })
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "A-Z" ? "Z-A" : "A-Z"))
  }

  const tabs = ["Teachers", "Subjects", "Rooms", "Classes", "Programs"]

  const renderFormContent = () => {
    return (
      <>
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
                <option value="Mrs.">Engr.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Color</label>
              <div className="grid grid-cols-5 gap-x-4 gap-y-2 mb-2 pl-6">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${formData.color === color ? "border-teal-500 scale-110" : "border-gray-300"
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
                  className="w-12 h-8"
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
                <option value="5th Year">5th Year</option>
                <option value="6th Year">6th Year</option>
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
                <option value="5th Year">5th Year</option>
                <option value="6th Year">6th Year</option>
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
      </>
    )
  }

  if (isLoading) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4 h-[calc(100vh-20px)] overflow-hidden bg-[#f8f8f8]">
      <div className="-mx-4 -mt-4 px-4 py-3 bg-white shadow-sm">
        <div className="flex items-center border-l-4 pl-4" style={{ borderColor: "#c682fc" }}>
          <h1 className="text-xl font-semibold text-gray-800">Data Management</h1>
        </div>
      </div>
      <div className="-mx-4 px-4 bg-white border-b border-gray-200 mb-6">
        <nav className="flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSearchQuery("")
                setSortOrder("A-Z")
                setIsMergeMode(false)
                setSelectedClassesToMerge([])
                setShowSubjectFilter(false)
                setShowRoomFilter(false)
                setShowClassFilter(false)
              }}
              className={`pb-2 px-1 text-sm font-medium transition-colors
                ${activeTab === tab ? "text-[#031844] border-b-2 border-[#031844]" : "text-gray-500 hover:text-gray-700"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <button
        onClick={handleAdd}
        disabled={isSaving || isDeleting}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-zinc-900 hover:bg-[#e5e5e5] transition-colors mb-4 ${isSaving || isDeleting ? "opacity-50 cursor-not-allowed" : ""
          }`}
      >
        <FiPlus /> Add New
      </button>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-[calc(100vh-18rem)]">
        <div className="bg-white rounded-lg p-6 flex flex-col overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cfcfcf_transparent] h-[calc(100vh-12rem)]">
          {/* Teachers Tab */}
          {activeTab === "Teachers" && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{activeTab} List</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search teachers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 w-64"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${sortOrder === "A-Z" ? "Z-A" : "A-Z"}`}
                >
                  <MdOutlineSort className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === "Subjects" && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{activeTab} List</h2>
              <div className="flex items-center gap-4">
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 w-64"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <button
                    onClick={() => setShowSubjectFilter(!showSubjectFilter)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Filter subjects"
                  >
                    <FiFilter className="w-5 h-5 text-[#031844]" />
                  </button>
                  {showSubjectFilter && (
                    <div className="absolute right-0 top-12 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                          <select
                            value={subjectFilter.semester}
                            onChange={(e) => setSubjectFilter(prev => ({ ...prev, semester: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">All Semesters</option>
                            <option value="1st Semester">1st Semester</option>
                            <option value="2nd Semester">2nd Semester</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course/Program</label>
                          <select
                            value={subjectFilter.programId}
                            onChange={(e) => setSubjectFilter(prev => ({ ...prev, programId: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">All Programs</option>
                            {programs.map((program) => (
                              <option key={program.id} value={program.id}>
                                {program.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                          <select
                            value={subjectFilter.yearLevel}
                            onChange={(e) => setSubjectFilter(prev => ({ ...prev, yearLevel: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">All Year Levels</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                            <option value="6th Year">6th Year</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                          <input
                            type="text"
                            value={subjectFilter.code}
                            onChange={(e) => setSubjectFilter(prev => ({ ...prev, code: e.target.value }))}
                            placeholder="Enter code..."
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        <button
                          onClick={() => setShowSubjectFilter(false)}
                          className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${sortOrder === "A-Z" ? "Z-A" : "A-Z"}`}
                >
                  <MdOutlineSort className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Rooms Tab */}
          {activeTab === "Rooms" && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{activeTab} List</h2>
              <div className="flex items-center gap-4">
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 w-64"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <button
                    onClick={() => setShowRoomFilter(!showRoomFilter)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Filter rooms"
                  >
                    <FiFilter className="w-5 h-5 text-[#031844]" />
                  </button>
                  {showRoomFilter && (
                    <div className="absolute right-0 top-12 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Min Capacity</label>
                          <input
                            type="number"
                            value={roomFilter.minCapacity}
                            onChange={(e) => setRoomFilter(prev => ({ ...prev, minCapacity: e.target.value }))}
                            placeholder="Minimum capacity"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                          <input
                            type="number"
                            value={roomFilter.maxCapacity}
                            onChange={(e) => setRoomFilter(prev => ({ ...prev, maxCapacity: e.target.value }))}
                            placeholder="Maximum capacity"
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>

                        <button
                          onClick={() => setShowRoomFilter(false)}
                          className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${sortOrder === "A-Z" ? "Z-A" : "A-Z"}`}
                >
                  <MdOutlineSort className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Classes Tab */}
          {activeTab === "Classes" && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{activeTab} List</h2>
              <div className="flex items-center gap-4">
                <div className="relative flex gap-2">
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 w-64"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <button
                    onClick={() => setShowClassFilter(!showClassFilter)}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Filter classes"
                  >
                    <FiFilter className="w-5 h-5 text-[#031844]" />
                  </button>
                  {showClassFilter && (
                    <div className="absolute right-0 top-12 mt-2 w-64 bg-white border rounded-lg shadow-lg p-4 z-10">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Course/Program</label>
                          <select
                            value={classFilter.programId}
                            onChange={(e) => setClassFilter(prev => ({ ...prev, programId: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">All Programs</option>
                            {programs.map((program) => (
                              <option key={program.id} value={program.id}>
                                {program.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                          <select
                            value={classFilter.yearLevel}
                            onChange={(e) => setClassFilter(prev => ({ ...prev, yearLevel: e.target.value }))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">All Year Levels</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                            <option value="6th Year">6th Year</option>
                          </select>
                        </div>

                        <button
                          onClick={() => setShowClassFilter(false)}
                          className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${sortOrder === "A-Z" ? "Z-A" : "A-Z"}`}
                >
                  <MdOutlineSort className="w-5 h-5" />
                </button>

                {/* Merge buttons */}
                <button
                  onClick={toggleMergeMode}
                  className={`px-4 py-2 rounded-md transition-colors ${isMergeMode
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  {isMergeMode ? "Cancel Merge" : "Merge"}
                </button>

                {isMergeMode && (
                  <button
                    onClick={handleCreateMerge}
                    disabled={selectedClassesToMerge.length < 2}
                    className={`px-4 py-2 rounded-md transition-colors ${selectedClassesToMerge.length >= 2
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    Create ({selectedClassesToMerge.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Programs Tab */}
          {activeTab === "Programs" && (
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{activeTab} List</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 w-64"
                  />
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  onClick={toggleSortOrder}
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                  title={`Sort ${sortOrder === "A-Z" ? "Z-A" : "A-Z"}`}
                >
                  <MdOutlineSort className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {activeTab === "Teachers" && (
              <table className="w-full border-collapse">
                <thead className="bg-[#4c4c4c] rounded-lg sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase rounded-tl-md rounded-bl-md">
                      Color
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Name</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase rounded-tr-md  rounded-br-md">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterAndSortData(teachers, "fullName").map((teacher, index) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(teacher)}
                    >
                      <td className="py-4 whitespace-nowrap text-sm text-gray-800 flex gap-10">
                        {index + 1}.
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: teacher.color }}></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teacher.honorifics} {teacher.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Teacher", teacher.id)
                          }}
                          disabled={isDeleting}
                          className={`text-zinc-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Subjects" && (
              <table className="w-full border-collapse">
                <thead className="bg-[#4c4c4c] rounded-md sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase rounded-tl-md rounded-bl-md">
                      Subject Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Units</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Year</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase rounded-tr-md rounded-br-md">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterAndSortData(subjects, "name").map((subject, index) => (
                    <tr
                      key={subject.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(subject)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-6 text-gray-800">
                        {index + 1}. <div>{subject.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.units}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.yearLevel}</td>
                      <td className="px-6 py-4 text-sm text-center text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Subject", subject.id)
                          }}
                          disabled={isDeleting}
                          className={`text-zinc-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Rooms" && (
              <table className="w-full border-collapse">
                <thead className="bg-[#4c4c4c] rounded-md sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase rounded-tl-md rounded-bl-md">
                      Room Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Capacity</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase rounded-tr-md rounded-br-md">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterAndSortData(rooms, "name").map((room, index) => (
                    <tr key={room.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => selectItem(room)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-6 text-gray-800">
                        {index + 1}. <div>{room.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Room", room.id)
                          }}
                          disabled={isDeleting}
                          className={`text-zinc-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Classes" && (
              <table className="w-full border-collapse">
                <thead className="bg-[#4c4c4c] rounded-md sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase rounded-tl-md rounded-bl-md">
                      {isMergeMode && "Select"}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">
                      Class Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">No. of Students</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase rounded-tr-md rounded-br-md">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterAndSortData(classes, "name").map((cls, index) => (
                    <tr
                      key={cls.id}
                      className={`hover:bg-gray-50 cursor-pointer ${cls.isMerged ? 'bg-blue-50' : ''}`}
                      onClick={() => !isMergeMode && selectItem(cls)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {isMergeMode ? (
                          <input
                            type="checkbox"
                            checked={selectedClassesToMerge.includes(cls.id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleClassSelectForMerge(cls.id)
                            }}
                            className="h-4 w-4 text-teal-600"
                          />
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-6 text-gray-800">
                        {!isMergeMode && <div>{cls.name}</div>}
                        {isMergeMode && (
                          <div className="flex items-center gap-2">
                            <div>{cls.name}</div>
                            {cls.isMerged && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Merged
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{cls.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Class", cls.id)
                          }}
                          disabled={isDeleting}
                          className={`text-zinc-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "Programs" && (
              <table className="w-full border-collapse">
                <thead className="bg-[#4c4c4c] rounded-md sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase rounded-tl-md rounded-bl-md">
                      Program Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Years</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase rounded-tr-md rounded-br-md">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterAndSortData(programs, "name").map((program, index) => (
                    <tr
                      key={program.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => selectItem(program)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-6 text-gray-800">
                        {index + 1}. <div>{program.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{program.years}</td>
                      <td className="px-6 py-4 whitespace-normal text-center text-sm text-gray-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete("Program", program.id)
                          }}
                          disabled={isDeleting}
                          className={`text-zinc-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 flex flex-col h-[calc(100vh-12rem)]">
          {selectedItem ? (
            <>
              <div className="flex justify-between items-center mb-4 bg-[#4c4c4c] text-white text-sm px-4 py-2 rounded-md">
                <h3 className="text-sm font-semibold">{currentType} Info</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setFormData({})
                      setSelectedItem(null)
                    }}
                    className="px-4 py-1 text-white bg-[#4c4c4c] border rounded-md hover:bg-gray-600 transition-colors"
                    disabled={isSaving || isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(false)}
                    disabled={isSaving || isDeleting || (activeTab === "Classes" && selectedItem.isMerged)}
                    className={`px-4 py-1 text-[#4c4c4c] bg-white border border-[#4c4c4c] rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === "Classes" && selectedItem.isMerged ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : ''
                      }`}
                  >
                    {isSaving ? "Saving..." : (activeTab === "Classes" && selectedItem.isMerged) ? "Cannot Edit Merged" : "Save"}
                  </button>
                </div>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#cfcfcf_transparent]">
                {renderFormContent()}
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

      {showAddModal && (
        <div className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto z-[100000]">
            <h2 className="text-lg font-semibold mb-4">Add New {currentType}</h2>
            <div className="space-y-4 mb-6">{renderFormContent()}</div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setFormData({})
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="px-4 py-2 text-white bg-[#4c4c4c] rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[99999] bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto z-[100000]">
            <h2 className="text-lg font-semibold mb-4">Create Merged Class</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Merged Class Name</label>
                <input
                  type="text"
                  value={mergeFormData.name}
                  onChange={(e) => setMergeFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter merged class name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Program</label>
                <select
                  value={mergeFormData.programId}
                  onChange={(e) => setMergeFormData(prev => ({ ...prev, programId: e.target.value }))}
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
                  value={mergeFormData.yearLevel}
                  onChange={(e) => setMergeFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                  <option value="6th Year">6th Year</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 mb-2">Summary</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>Total Students:</strong> {
                      classes
                        .filter(cls => selectedClassesToMerge.includes(cls.id))
                        .reduce((sum, cls) => sum + (cls.students || 0), 0)
                    }
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>Classes to merge:</strong> {
                      classes
                        .filter(cls => selectedClassesToMerge.includes(cls.id))
                        .map(cls => cls.name)
                        .join(", ")
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMerge}
                disabled={isSaving}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Creating..." : "Create Merged Class"}
              </button>
            </div>
          </div>
        </div>
      )}

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