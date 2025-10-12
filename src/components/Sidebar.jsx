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
  const userRole = localStorage.getItem('userRole') || 'user';

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
      if (!event.ctrlKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case '1':
          event.preventDefault();
          if (userRole === 'admin' || userRole === 'user') {
            handleNavigation('/file');
          }
          break;
        case '2':
          event.preventDefault();
          if (userRole === 'admin' || userRole === 'user') {
            handleNavigation('/home');
          }
          break;
        case '3':
          event.preventDefault();
          if (userRole === 'admin') {
            handleNavigation('/manage');
          }
          break;
        case '4':
          event.preventDefault();
          if (userRole === 'admin') {
            handleNavigation('/assign');
          }
          break;
        case '5':
          event.preventDefault();
          if (userRole === 'admin' || userRole === 'user') {
            toggleViewTools();
          }
          break;
        case 'h':
          if (!event.shiftKey) {
            event.preventDefault();
            if (userRole === 'admin' || userRole === 'user') {
              handleNavigation('/help');
            }
          }
          break;
        case 'l':
          event.preventDefault();
          handleLogout();
          break;
        case 'b':
          event.preventDefault();
          setCollapsed(!collapsed);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, location.pathname, userRole]);

  const toggleViewTools = () => {
    window.dispatchEvent(new CustomEvent("toggleViewTools"));
  };

  const toggleScheduling = () => {
    if (!collapsed && userRole === 'admin') {
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

  const handleLogout = () => {
    setIsLoading(true);
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('sidebarCollapsed');
    navigate('/login');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const menuItems = [
    { name: "Files", icon: <FiFile />, path: "/file", roles: ['admin', 'user'] },
    { name: "Home", icon: <FiHome />, path: "/home", roles: ['admin', 'user'] },
    {
      name: "Scheduling Tool",
      icon: <FiBook />,
      isCollapsible: true,
      roles: ['admin'],
      submenu: [
        { name: "Manage Data", path: "/manage", roles: ['admin'] },
        { name: "Assigning", path: "/assign", roles: ['admin'] },
      ],
    },
    { name: "View", icon: <FiEye />, isButton: true, onClick: toggleViewTools, roles: ['admin', 'user'] },
    { name: "Help", icon: <FiHelpCircle />, path: "/help", roles: ['admin', 'user'] },
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
          } flex flex-col border-r shadow-sm ${isLoading ? "opacity-50 poInter-events-none" : ""
          }`}
        style={{
          backgroundColor: "#1a2332",
          borderColor: "#374151",
          position: "relative",
          zIndex: 1000,
        }}
      >
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#374151" }}>
          {!collapsed && (
            <div className="flex items-center gap-3">
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

        <nav className="flex flex-col flex-1 p-3 gap-1">
          {menuItems
            .filter((item) => item.roles.includes(userRole))
            .map((item, index) => (
              <div key={index}>
                {item.isCollapsible ? (
                  <>
                    <div
                      onClick={collapsed ? () => handleNavigation("/manage") : toggleScheduling}
                      className={`
                      group w-full flex items-center px-4 py-3 text-sm font-medium 
                      transition-all duration-200 cursor-poInter rounded-xl
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
                          {item.submenu
                            .filter((sub) => sub.roles.includes(userRole))
                            .map((sub, subIndex) => (
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
                                  } ${isLoading ? "poInter-events-none" : ""}
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
                      ${isLoading ? "poInter-events-none" : ""}
                      ${collapsed ? "justify-center" : ""}
                    `}
                      disabled={isLoading}
                      title={collapsed ? item.name : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </button>
                    {collapsed && (
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity poInter-events-none whitespace-nowrap z-50">
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
                        } ${isLoading ? "poInter-events-none" : ""}
                      ${collapsed ? "justify-center" : ""}
                    `}
                      title={collapsed ? item.name : undefined}
                    >
                      <span className="text-lg flex-shrink-0">{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                    {collapsed && (
                      <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity poInter-events-none whitespace-nowrap z-50">
                        {item.name}
                        <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
        </nav>

        <div className="mt-auto p-3 border-t" style={{ borderColor: "#374151" }}>
          <div className="relative group">
            <button
              onClick={handleLogout}
              className={`
                flex items-center gap-3 px-4 py-3 text-sm font-medium 
                transition-all duration-200 rounded-xl active:scale-95
                text-gray-300 hover:text-white hover:bg-gray-700/50
                ${isLoading ? "poInter-events-none" : ""}
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? "Logout" : undefined}
            >
              <span className="text-lg flex-shrink-0">
                <FiLogOut />
              </span>
              {!collapsed && <span className="truncate">Logout</span>}
            </button>
            {collapsed && (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity poInter-events-none whitespace-nowrap z-50">
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