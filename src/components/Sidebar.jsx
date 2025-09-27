import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiFile,
  FiHome,
  FiBook,
  FiHelpCircle,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiLogOut,
  FiMenu,
} from "react-icons/fi";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarRightCollapse,
} from "react-icons/tb";

export default function Sidebar() {
  // Initialize collapsed state from localStorage
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Save collapsed state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const isSchedulingActive =
      location.pathname === "/manage" || location.pathname === "/assign";
    setSchedulingOpen(isSchedulingActive);
  }, [location.pathname]);

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only trigger if Ctrl is pressed and not in an input field
      if (!event.ctrlKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case '1':
          event.preventDefault();
          handleNavigation('/file');
          break;
        case '2':
          event.preventDefault();
          handleNavigation('/home');
          break;
        case '3':
          event.preventDefault();
          handleNavigation('/manage');
          break;
        case '4':
          event.preventDefault();
          handleNavigation('/assign');
          break;
        case '5':
          event.preventDefault();
          toggleViewTools();
          break;
        case 'h':
          // Only handle Ctrl+H if it's not already handled by your existing help shortcut
          if (!event.shiftKey) {
            event.preventDefault();
            handleNavigation('/help');
          }
          break;
        case 'l':
          event.preventDefault();
          handleNavigation('/login');
          break;
        case 'b':
          // Ctrl+B to toggle sidebar
          event.preventDefault();
          setCollapsed(!collapsed);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, location.pathname]);

  const toggleViewTools = () => {
    window.dispatchEvent(new CustomEvent("toggleViewTools"));
  };

  const toggleScheduling = () => {
    if (!collapsed) {
      setSchedulingOpen((prev) => !prev);
    }
  };

  const handleNavigation = (path) => {
    if (path !== location.pathname) {
      setIsLoading(true);

      navigate(path);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const menuItems = [
    { name: "Files", icon: <FiFile />, path: "/file" },
    { name: "Schedule", icon: <FiHome />, path: "/home" },
    {
      name: "Scheduling Tool",
      icon: <FiBook />,
      isCollapsible: true,
      submenu: [
        { name: "Manage Data", path: "/manage" },
        { name: "Assigning", path: "/assign" },
      ],
    },
    { name: "View", icon: <FiEye />, isButton: true, onClick: toggleViewTools },
    { name: "Help", icon: <FiHelpCircle />, path: "/help" },
  ];

  const isSchedulingActive =
    location.pathname === "/manage" || location.pathname === "/assign";

  return (
    <>
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 z-[1001] backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-800 text-lg font-medium">Loading...</p>
          </div>
        </div>
      )}
      <div
        className={`h-screen transition-all duration-300 ease-out ${collapsed ? "w-16" : "w-72"
          } flex flex-col border-r shadow-sm ${isLoading ? "opacity-50 pointer-events-none" : ""
          }`}
        style={{
          backgroundColor: "#1a2332",
          borderColor: "#374151",
          position: "relative",
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#374151" }}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img
                  src="/imgs/icons8-calendar-100.png"
                  alt="calendar"
                  className="w-8 h-8"
                />
              </div>

              <span className="text-white font-semibold text-lg">Menu</span>
            </div>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 rounded-lg text-white hover:text-white hover:bg-gray-700/50 transition-all duration-200 active:scale-95"
                disabled={isLoading}
                title="Expand sidebar (Ctrl+B)"
              >
                <TbLayoutSidebarRightCollapse className="w-5 h-5" />
              </button>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg text-white hover:text-white hover:bg-gray-700/50 transition-all duration-200 active:scale-95"
              disabled={isLoading}
              title="Collapse sidebar (Ctrl+B)"
            >
              <TbLayoutSidebarLeftCollapse className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 p-3 gap-1">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.isCollapsible ? (
                <>
                  <div
                    onClick={collapsed ? () => handleNavigation("/manage") : toggleScheduling}
                    className={`
                      group w-full flex items-center px-4 py-3 text-sm font-medium 
                      transition-all duration-200 cursor-pointer rounded-xl
                      ${isSchedulingActive
                        ? "text-white bg-teal-500 shadow-sm"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                      } ${collapsed ? "justify-center" : "justify-between"}
                    `}
                  >
                    {collapsed ? (
                      <div className="flex items-center justify-center">
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-lg flex-shrink-0">{item.icon}</span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className={`transition-transform duration-200 ${schedulingOpen ? "rotate-180" : ""
                          }`}>
                          <FiChevronDown className="w-4 h-4" />
                        </span>
                      </>
                    )}
                  </div>
                  {!collapsed && schedulingOpen && (
                    <div className="mt-1 ml-4 pl-4 border-l-2" style={{ borderColor: "#374151" }}>
                      <div className="space-y-1">
                        {item.submenu.map((sub, subIndex) => (
                          <Link
                            key={subIndex}
                            to={sub.path}
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation(sub.path);
                            }}
                            className={`
                              block px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg
                              ${location.pathname === sub.path
                                ? "text-white bg-gray-700/60 shadow-sm"
                                : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                              } ${isLoading ? "pointer-events-none" : ""}
                            `}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : item.isButton ? (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-sm font-medium 
                      transition-all duration-200 rounded-xl
                      text-gray-300 hover:text-white hover:bg-gray-700/50 active:scale-95
                      ${isLoading ? "pointer-events-none" : ""}
                      ${collapsed ? "justify-center" : ""}
                    `}
                    disabled={isLoading}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </button>

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative group">
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(item.path);
                    }}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-sm font-medium 
                      transition-all duration-200 rounded-xl active:scale-95
                      ${location.pathname === item.path
                        ? "text-white bg-teal-500 shadow-sm"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                      } ${isLoading ? "pointer-events-none" : ""}
                      ${collapsed ? "justify-center" : ""}
                    `}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name}
                      <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="mt-auto p-3 border-t" style={{ borderColor: "#374151" }}>
          <div className="relative group">
            <Link
              to="/login"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation("/login");
              }}
              className={`
                flex items-center gap-3 px-4 py-3 text-sm font-medium 
                transition-all duration-200 rounded-xl active:scale-95
                ${location.pathname === "/login"
                  ? "text-white bg-teal-500 shadow-sm"
                  : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                } ${isLoading ? "pointer-events-none" : ""}
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? "Logout" : undefined}
            >
              <span className="text-lg flex-shrink-0">
                <FiLogOut />
              </span>
              {!collapsed && <span className="truncate">Logout</span>}
            </Link>

            {/* Tooltip for collapsed state */}
            {collapsed && (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Logout
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}