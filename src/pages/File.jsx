import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArchive, FiTrash2, FiFolder, FiFile, FiSearch, FiGrid, FiList, FiRefreshCw } from "react-icons/fi";

export default function File() {
  const [scheduleFiles, setScheduleFiles] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'user';

  useEffect(() => {
    const fetchScheduleFiles = async () => {
      if (isOperating) return;

      try {
        setIsOperating(true);
        const files = await window.api.getAllScheduleFiles();
        setScheduleFiles(files);
      } catch (error) {
        console.error("Error fetching schedule files:", error);
        alert("Error loading schedule files: " + (error.message || "Unknown error"));
      } finally {
        setIsOperating(false);
      }
    };

    fetchScheduleFiles();
  }, []);

  const handleSelectFile = async (file) => {
    if (isOperating) return;

    try {
      setIsOperating(true);
      await window.api.setCurrentFile(file);

      const fileSelectedEvent = new CustomEvent('fileSelected', {
        detail: file
      });
      window.dispatchEvent(fileSelectedEvent);

      navigate(userRole === 'user' ? "/home" : "/assign");
    } catch (error) {
      console.error("Error selecting file:", error);
      alert("Error opening file: " + (error.message || "Unknown error"));
    } finally {
      setIsOperating(false);
    }
  };

  const handleArchive = async (id) => {
    if (window.confirm("Are you sure you want to archive this file?")) {
      if (isOperating) return;

      try {
        setIsOperating(true);
        const result = await window.api.archiveScheduleFile(id);
        if (result.success) {
          setScheduleFiles((prev) =>
            prev.map((file) =>
              file.id === id ? { ...file, status: "archived" } : file
            )
          );
        } else {
          alert(result.message || "Failed to archive file.");
        }
      } catch (error) {
        console.error("Error archiving file:", error);
        alert("Error archiving file: " + (error.message || "Unknown error"));
      } finally {
        setIsOperating(false);
      }
    }
  };

  const handleUnarchive = async (id) => {
    if (window.confirm("Are you sure you want to unarchive this file?")) {
      if (isOperating) return;

      try {
        setIsOperating(true);
        const result = await window.api.unarchiveScheduleFile(id);
        if (result.success) {
          setScheduleFiles((prev) =>
            prev.map((file) =>
              file.id === id ? { ...file, status: "active" } : file
            )
          );
        } else {
          alert(result.message || "Failed to unarchive file.");
        }
      } catch (error) {
        console.error("Error unarchiving file:", error);
        alert("Error unarchiving file: " + (error.message || "Unknown error"));
      } finally {
        setIsOperating(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      if (isOperating) return;

      try {
        setIsOperating(true);
        const result = await window.api.deleteScheduleFile(id);
        if (result.success) {
          setScheduleFiles((prev) => prev.filter((file) => file.id !== id));
        } else {
          alert(result.message || "Failed to delete file.");
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        alert("Error deleting file: " + (error.message || "Unknown error"));
      } finally {
        setIsOperating(false);
      }
    }
  };

  const activeFiles = scheduleFiles.filter((file) =>
    file.status !== "archived" &&
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const archivedFiles = scheduleFiles.filter((file) =>
    file.status === "archived" &&
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateCalendarGrid = (fileId) => {
    const days = Array.from({ length: 35 }, (_, i) => i + 1);
    const colors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'];

    const seed = typeof fileId === 'string' ? fileId.charCodeAt(0) : fileId;

    return days.map((day, index) => {
      const hasEvent = (seed + index) % 4 === 0;
      const colorIndex = (seed + index) % colors.length;
      const dayNumber = ((seed + index) % 31) + 1;

      return {
        day: dayNumber,
        hasEvent,
        color: hasEvent ? colors[colorIndex] : null
      };
    });
  };

  const CalendarPreview = ({ fileId }) => {
    const calendarData = generateCalendarGrid(fileId);

    return (
      <div className="w-full h-36 bg-gray-800 rounded-t-lg p-3 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center mb-2 z-10">
          <div className="text-white text-xs font-medium opacity-80">Schedule</div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 h-full relative z-10">
          {calendarData.slice(0, 21).map((item, index) => (
            <div
              key={index}
              className={`aspect-square rounded-sm flex items-center justify-center text-xs font-medium relative ${item.hasEvent
                  ? `${item.color} text-white shadow-sm`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } transition-colors`}
            >
              {item.day}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gray-900/80 rounded-t-lg pointer-events-none z-20"></div>
      </div>
    );
  };

  const FileCard = ({ file, isArchived = false }) => (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 ${!isArchived && !isOperating ? 'cursor-pointer hover:border-teal-300 hover:scale-105' : ''
        } ${isOperating ? 'opacity-50' : ''}`}
      onClick={() => !isArchived && !isOperating && handleSelectFile(file)}
    >
      <CalendarPreview fileId={file.id} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="bg-teal-50 p-2 rounded-lg flex-shrink-0">
            <FiFile className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            {isArchived ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnarchive(file.id);
                }}
                className={`p-1.5 rounded-md transition-colors ${userRole === 'user' || isOperating
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                }`}
                title="Unarchive"
                disabled={userRole === 'user' || isOperating}
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(file.id);
                }}
                className={`p-1.5 rounded-md transition-colors ${userRole === 'user' || isOperating
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                }`}
                title="Archive"
                disabled={userRole === 'user' || isOperating}
              >
                <FiArchive className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id);
              }}
              className={`p-1.5 rounded-md transition-colors ${userRole === 'user' || isOperating
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Delete"
              disabled={userRole === 'user' || isOperating}
            >
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 break-words leading-tight">
            {file.name}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                {file.academic_year}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {file.semester}
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
              Updated {new Date(file.updatedAt || new Date()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const ListView = ({ files, isArchived = false }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Academic Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Semester
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {files.map((file, index) => (
              <tr
                key={file.id}
                className={`hover:bg-gray-50 transition-colors ${!isArchived && !isOperating ? 'cursor-pointer' : ''
                  } ${isOperating ? 'opacity-50' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}
                onClick={() => !isArchived && !isOperating && handleSelectFile(file)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="bg-teal-50 p-2 rounded-lg mr-3">
                      <FiFile className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.academic_year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {file.semester}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(file.updatedAt || new Date()).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {isArchived ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(file.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${userRole === 'user' || isOperating
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title="Unarchive"
                        disabled={userRole === 'user' || isOperating}
                      >
                        <FiRefreshCw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(file.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${userRole === 'user' || isOperating
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                        }`}
                        title="Archive"
                        disabled={userRole === 'user' || isOperating}
                      >
                        <FiArchive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${userRole === 'user' || isOperating
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Delete"
                      disabled={userRole === 'user' || isOperating}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-60 bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-teal-100 p-2 rounded-lg">
              <FiFolder className="w-6 h-6 text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Files</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${showArchived
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                disabled={isOperating}
              >
                {showArchived ? "Show Active Files" : "Show Archived Files"}
              </button>
              <div className="flex bg-white border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                    ? 'bg-blue-100 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="Grid View"
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                    ? 'bg-blue-100 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                  title="List View"
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
        </div>
        {showArchived ? (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FiArchive className="w-5 h-5 mr-2 text-gray-600" />
                Archived Files ({archivedFiles.length})
              </h2>
            </div>
            {archivedFiles.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FiArchive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No archived files found</p>
                <p className="text-gray-400 text-sm mt-1">Files you archive will appear here</p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {archivedFiles.map((file) => (
                      <FileCard key={file.id} file={file} isArchived={true} />
                    ))}
                  </div>
                ) : (
                  <ListView files={archivedFiles} isArchived={true} />
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FiFile className="w-5 h-5 mr-2 text-gray-600" />
                Files ({activeFiles.length})
              </h2>
            </div>
            {activeFiles.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <FiFile className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm ? 'No files match your search' : 'No active files found'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm ? 'Try adjusting your search terms' : 'Create a new schedule file to get started'}
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activeFiles.map((file) => (
                      <FileCard key={file.id} file={file} />
                    ))}
                  </div>
                ) : (
                  <ListView files={activeFiles} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}