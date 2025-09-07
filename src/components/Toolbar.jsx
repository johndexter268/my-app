import { FiPlus, FiSave, FiEdit, FiDownload, FiPrinter } from "react-icons/fi";

export default function Toolbar() {
  const buttons = [
    { name: "New", icon: <FiPlus /> },
    { name: "Save", icon: <FiSave /> },
    { name: "Save As", icon: <FiEdit /> },
    { name: "Export", icon: <FiDownload /> },
    { name: "Print", icon: <FiPrinter /> },
  ];

  return (
    <div 
      className="flex items-center px-4 py-3 border-b"
      style={{ 
        backgroundColor: '#f8fafc',
        borderColor: '#e5e7eb',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div className="flex items-center space-x-1">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 text-gray-700 hover:text-gray-900 hover:bg-white/80"
            style={{
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.backgroundColor = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'transparent';
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <span className="text-base">{btn.icon}</span>
            <span className="hidden sm:inline">{btn.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}