import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Toolbar />
        <div className="flex-1 overflow-auto p-4 bg-white">{children}</div>
      </div>
    </div>
  );
}
