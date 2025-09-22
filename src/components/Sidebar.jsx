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
  FiLogOut, // Added logout icon
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
    { name: "File", icon: <FiFile />, path: "/file" },
    { name: "Home", icon: <FiHome />, path: "/home" },
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
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[1001] pointer-events-none"
          style={{ backdropFilter: "blur(3px)" }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-500"></div>
            <p className="text-white text-lg font-medium">Loading, please wait...</p>
          </div>
        </div>
      )}
      <div
        className={`h-screen transition-all duration-300 ${collapsed ? "w-12" : "w-64"
          } flex flex-col border-r ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
        style={{
          backgroundColor: "#1a2332",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          borderColor: "#374151",
          position: "relative",
          zIndex: 1000,
        }}
      >
        <div
          className="flex justify-between items-center p-2 border-b"
          style={{ borderColor: "#374151" }}
        >
          {!collapsed && (
            <span className="text-white font-bold text-lg">Menu</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg transition-colors text-white font-bold hover:text-white hover:bg-gray-700/50 ml-auto"
            disabled={isLoading}
          >
            {collapsed ? (
              <TbLayoutSidebarRightCollapse size={20} />
            ) : (
              <TbLayoutSidebarLeftCollapse size={20} />
            )}
          </button>
        </div>

        <nav className="flex flex-col flex-1 pt-2">
          {menuItems.map((item, index) => (
            <div key={index}>
              {item.isCollapsible ? (
                <>
                  <div
                    onClick={collapsed ? () => handleNavigation("/manage") : toggleScheduling}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer ${isSchedulingActive
                        ? "text-white font-semibold bg-teal-500"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                      }`}
                  >
                    <div className="flex items-center">
                      <span className="text-lg">{item.icon}</span>
                      {!collapsed && <span className="ml-3">{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <span className="text-sm">
                        {schedulingOpen ? <FiChevronUp /> : <FiChevronDown />}
                      </span>
                    )}
                  </div>
                  {!collapsed && schedulingOpen && (
                    <div className="ml-8 py-1">
                      {item.submenu.map((sub, subIndex) => (
                        <Link
                          key={subIndex}
                          to={sub.path}
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavigation(sub.path);
                          }}
                          className={`block px-4 py-2 text-sm transition-colors duration-200 rounded-md mr-4 ${location.pathname === sub.path
                              ? "text-white font-medium bg-gray-700/60"
                              : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                            } ${isLoading ? "pointer-events-none" : ""}`}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : item.isButton ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 text-gray-300 hover:text-white hover:bg-gray-700/30 ${isLoading ? "pointer-events-none" : ""
                    }`}
                  disabled={isLoading}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </button>
              ) : (
                <Link
                  to={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation(item.path);
                  }}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${location.pathname === item.path
                      ? "text-white font-semibold bg-teal-500"
                      : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                    } ${isLoading ? "pointer-events-none" : ""}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className="ml-3">{item.name}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto border-t" style={{ borderColor: "#374151" }}>
          <Link
            to="/login"
            onClick={(e) => {
              e.preventDefault();
              handleNavigation("/login");
            }}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${location.pathname === "/login"
                ? "text-white font-semibold bg-teal-500"
                : "text-gray-300 hover:text-white hover:bg-gray-700/30"
              } ${isLoading ? "pointer-events-none" : ""}`}
          >
            <span className="text-sm"><FiLogOut /></span>
            {!collapsed && <span className="ml-3">Logout</span>}
          </Link>
        </div>
      </div>
    </>
  );
}