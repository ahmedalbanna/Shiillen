import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PackagePlus, ScanQrCode, User } from 'lucide-react';
import { useAuth } from '../App';

export default function Navigation() {
  const { profile } = useAuth();
  
  const isHubOrDriver = profile?.role === 'hub' || profile?.role === 'driver';

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-brand-primary/10 px-6 py-3 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`}
      >
        <Home size={24} />
        <span className="text-[10px] font-medium">الرئيسية</span>
      </NavLink>
      
      <NavLink 
        to="/send" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`}
      >
        <PackagePlus size={24} />
        <span className="text-[10px] font-medium">إرسال</span>
      </NavLink>
      
      {isHubOrDriver && (
        <NavLink 
          to="/scan" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`}
        >
          <ScanQrCode size={24} />
          <span className="text-[10px] font-medium">مسح</span>
        </NavLink>
      )}
      
      <NavLink 
        to="/profile" 
        className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`}
      >
        <User size={24} />
        <span className="text-[10px] font-medium">الملف</span>
      </NavLink>
    </nav>
  );
}
