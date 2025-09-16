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
  const [collapsed, setCollapsed] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isSchedulingActive =
      location.pathname === "/manage" || location.pathname === "/assign";
    setSchedulingOpen(isSchedulingActive);
  }, [location.pathname]);

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
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-teal-500"></div>
        </div>
      )}
      <div
        className={`h-screen transition-all duration-300 ${
          collapsed ? "w-12" : "w-64"
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
            <span className="text-white font-semibold text-lg">Menu</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-gray-700/50 ml-auto"
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
                    onClick={toggleScheduling}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      isSchedulingActive
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
                          className={`block px-4 py-2 text-sm transition-colors duration-200 rounded-md mr-4 ${
                            location.pathname === sub.path
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
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 text-gray-300 hover:text-white hover:bg-gray-700/30 ${
                    isLoading ? "pointer-events-none" : ""
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
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
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
            className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
              location.pathname === "/login"
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