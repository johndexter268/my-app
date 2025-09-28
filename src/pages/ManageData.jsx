// pages/ManageData.jsx
import { useState, useEffect } from "react";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import Modal from "../components/Modal";

export default function ManageData() {
  const [activeTab, setActiveTab] = useState("Teachers");
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New states for custom alert/confirm
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmCallback, setConfirmCallback] = useState(null);

  // Helper to show custom alert
  const customAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  // Helper to show custom confirm
  const customConfirm = (message, callback) => {
    setConfirmMessage(message);
    setConfirmCallback(() => callback); // Wrap in function to call later
    setShowConfirmModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [teachersData, subjectsData, roomsData, classesData, programsData] = await Promise.all([
          window.api.getTeachers(),
          window.api.getSubjects(),
          window.api.getRooms(),
          window.api.getClasses(),
          window.api.getPrograms(),
        ]);
        setTeachers(teachersData);
        setSubjects(subjectsData);
        setRooms(roomsData);
        setClasses(classesData);
        setPrograms(programsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        customAlert("Error loading data: " + (error.message || "Unknown error"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAdd = (type) => {
    setModalType(`Add ${type}s`);
    setFormData({});
    setShowModal(true);
  };

  const handleEdit = (type, item) => {
    setModalType(`Edit ${type}`);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (type, id) => {
    customConfirm(`Are you sure you want to delete this ${type.toLowerCase()}?`, async () => {
      setIsDeleting(true);
      try {
        const result = await window.api[`delete${type}`](id);
        if (result.success) {
          if (type === "Teacher") setTeachers((prev) => prev.filter((t) => t.id !== id));
          else if (type === "Subject") setSubjects((prev) => prev.filter((s) => s.id !== id));
          else if (type === "Room") setRooms((prev) => prev.filter((r) => r.id !== id));
          else if (type === "Class") setClasses((prev) => prev.filter((c) => c.id !== id));
          else if (type === "Program") setPrograms((prev) => prev.filter((p) => p.id !== id));
          customAlert(`${type} deleted successfully!`);
          const currentFile = await window.api.getCurrentFile();
          if (currentFile) {
            const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
            await window.api.setCurrentFile(updatedFile);
          }
        } else {
          customAlert(result.message || `Failed to delete ${type.toLowerCase()}.`);
        }
      } catch (error) {
        console.error(`Error deleting ${type.toLowerCase()}:`, error);
        customAlert(`Error deleting ${type.toLowerCase()}: ${error.message || "Unknown error"}`);
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (modalType.includes("Teacher") && (!formData.fullName || !formData.color)) {
        customAlert("Full name and color are required.");
        return;
      }
      if (modalType.includes("Subject") && (!formData.name || !formData.code || !formData.units)) {
        customAlert("Name, code, and units are required.");
        return;
      }
      if (modalType.includes("Room") && (!formData.name || !formData.capacity)) {
        customAlert("Name and capacity are required.");
        return;
      }
      if (modalType.includes("Class") && (!formData.name || !formData.students || !formData.programId || !formData.yearLevel)) {
        customAlert("All fields are required.");
        return;
      }
      if (modalType.includes("Program") && (!formData.name || !formData.years)) {
        customAlert("Name and years are required.");
        return;
      }

      let newItem;
      if (modalType.includes("Teacher")) {
        const result = await window.api.saveTeacher(formData);
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) };
          setTeachers((prev) =>
            modalType.includes("Add")
              ? [...prev, newItem]
              : prev.map((t) => (t.id === formData.id ? newItem : t))
          );
        } else {
          customAlert(result.message || "Failed to save teacher.");
          return;
        }
      } else if (modalType.includes("Subject")) {
        const result = await window.api.saveSubject(formData);
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) };
          setSubjects((prev) =>
            modalType.includes("Add")
              ? [...prev, newItem]
              : prev.map((s) => (s.id === formData.id ? newItem : s))
          );
        } else {
          customAlert(result.message || "Failed to save subject.");
          return;
        }
      } else if (modalType.includes("Room")) {
        const result = await window.api.saveRoom(formData);
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) };
          setRooms((prev) =>
            modalType.includes("Add")
              ? [...prev, newItem]
              : prev.map((r) => (r.id === formData.id ? newItem : r))
          );
        } else {
          customAlert(result.message || "Failed to save room.");
          return;
        }
      } else if (modalType.includes("Class")) {
        const result = await window.api.saveClass(formData);
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) };
          setClasses((prev) =>
            modalType.includes("Add")
              ? [...prev, newItem]
              : prev.map((c) => (c.id === formData.id ? newItem : c))
          );
        } else {
          customAlert(result.message || "Failed to save class.");
          return;
        }
      } else if (modalType.includes("Program")) {
        const result = await window.api.saveProgram(formData);
        if (result.success) {
          newItem = { ...formData, id: result.id || (modalType.includes("Add") ? Date.now() : formData.id) };
          setPrograms((prev) =>
            modalType.includes("Add")
              ? [...prev, newItem]
              : prev.map((p) => (p.id === formData.id ? newItem : p))
          );
        } else {
          customAlert(result.message || "Failed to save program.");
          return;
        }
      }
      setShowModal(false);
      setFormData({});
      customAlert(`${modalType.split(" ")[1]} saved successfully!`);
      const currentFile = await window.api.getCurrentFile();
      if (currentFile) {
        const updatedFile = { ...currentFile, updatedAt: new Date().toISOString(), hasUnsavedChanges: true };
        await window.api.setCurrentFile(updatedFile);
      }
    } catch (error) {
      console.error(`Error saving ${modalType.toLowerCase()}:`, error);
      customAlert(`Error saving ${modalType.toLowerCase()}: ${error.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = ["Teachers", "Subjects", "Rooms", "Classes", "Programs"];

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
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


      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{activeTab} List</h2>
            <button
              onClick={() => handleAdd(activeTab.slice(0, -1))}
              disabled={isSaving || isDeleting}
              className={`flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 ${isSaving || isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: teacher.color }}
                        ></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {teacher.honorifics} {teacher.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={() => handleEdit("Teacher", teacher)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDelete("Teacher", teacher.id)}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
                    <tr key={subject.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.units}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">{subject.yearLevel}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        <button
                          onClick={() => handleEdit("Subject", subject)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDelete("Subject", subject.id)}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Room Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{room.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={() => handleEdit("Room", room)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDelete("Room", room.id)}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Class Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">No. of Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{cls.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{cls.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        <button
                          onClick={() => handleEdit("Class", cls)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDelete("Class", cls.id)}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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
                    <tr key={program.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{program.name}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">{program.years}</td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-800">
                        <button
                          onClick={() => handleEdit("Program", program)}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDelete("Program", program.id)}
                          disabled={isDeleting}
                          className={`text-red-500 hover:text-red-700 ${isDeleting ? "opacity-50 cursor-not-allowed" : ""
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

        {/* Note: As suggested, you might want to remove this sidebar if it's not needed, but I've left it as-is for completeness. */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Edit {activeTab.slice(0, -1)}</h3>
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
                  <label className="block text-sm font-medium text-gray-700">Choose Color</label>
                  <input
                    type="color"
                    value={formData.color || "#000000"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-12"
                  />
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
        </div>
      </div>

      {showModal && (
        <Modal
          title={modalType}
          onClose={() => {
            setShowModal(false);
            setFormData({});
          }}
          onSave={handleSave}
          isSaving={isSaving}
        >
          {modalType.includes("Teacher") && (
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
                <label className="block text-sm font-medium text-gray-700">Choose Color</label>
                <input
                  type="color"
                  value={formData.color || "#000000"}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-12"
                />
              </div>
            </>
          )}
          {modalType.includes("Subject") && (
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
          {modalType.includes("Room") && (
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
          {modalType.includes("Class") && (
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
          {modalType.includes("Program") && (
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
        </Modal>
      )}

      {showAlertModal && (
        <Modal
          title="Alert"
          type="alert"
          message={alertMessage}
          onClose={() => setShowAlertModal(false)}
        />
      )}
      {showConfirmModal && (
        <Modal
          title="Confirm"
          type="confirm"
          message={confirmMessage}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={() => {
            if (confirmCallback) confirmCallback();
            setShowConfirmModal(false);
          }}
          isSaving={isDeleting}
        />
      )}
    </div>
  );
}