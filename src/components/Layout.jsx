import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

export default function Layout({ children }) {
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '/home';
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className={`flex-1 flex flex-col ${isHomePage ? 'overflow-hidden' : ''}`}>
        <Toolbar />
        <div className={`flex-1 p-0 bg-white ${isHomePage ? 'overflow-hidden' : 'overflow-auto'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}