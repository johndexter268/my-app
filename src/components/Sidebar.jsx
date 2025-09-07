import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FiFile, FiHome, FiBook, FiHelpCircle, FiChevronLeft, FiChevronRight, FiEye, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse  } from "react-icons/tb";
export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const location = useLocation();

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
    { name: "View", icon: <FiEye />, path: "/view" },
    { name: "Help", icon: <FiHelpCircle />, path: "/help" },
  ];

  const isSchedulingActive = location.pathname.startsWith('/scheduling');

  return (
    <div 
      className={`h-screen transition-all duration-300 ${collapsed ? "w-12" : "w-64"} flex flex-col border-r`}
      style={{ 
        backgroundColor: '#1a2332',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        borderColor: '#374151'
      }}
    >
      {/* Header with collapse toggle */}
      <div className="flex justify-between items-center p-3.5 border-b" style={{ borderColor: '#374151' }}>
        {!collapsed && (
          <span className="text-white font-semibold text-lg">Menu</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-gray-700/50 ml-auto"
        >
          {collapsed ? <TbLayoutSidebarRightCollapse size={20} /> : <TbLayoutSidebarLeftCollapse size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 pt-2">
        {menuItems.map((item, index) => (
          <div key={index}>
            {/* Main menu item */}
            {item.isCollapsible ? (
              <button
                onClick={() => !collapsed && setSchedulingOpen(!schedulingOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  isSchedulingActive
                    ? "text-white font-semibold" 
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
                style={{
                  backgroundColor: isSchedulingActive ? '#10b981' : 'transparent',
                }}
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
              </button>
            ) : (
              <Link
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.path 
                    ? "text-white font-semibold" 
                    : "text-gray-300 hover:text-white hover:bg-gray-700/30"
                }`}
                style={{
                  backgroundColor: location.pathname === item.path ? '#10b981' : 'transparent',
                }}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.name}</span>}
              </Link>
            )}

            {/* Submenu */}
            {!collapsed && item.submenu && schedulingOpen && (
              <div className="ml-8 py-1">
                {item.submenu.map((sub, subIndex) => (
                  <Link
                    key={subIndex}
                    to={sub.path}
                    className={`block px-4 py-2 text-sm transition-colors duration-200 rounded-md mr-4 ${
                      location.pathname === sub.path 
                        ? "text-white font-medium bg-gray-700/60" 
                        : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                    }`}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}