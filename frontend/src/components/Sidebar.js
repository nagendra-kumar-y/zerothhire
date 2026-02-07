import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiBriefcase,
  FiUsers,
  FiMail,
  FiGrid,
  FiSettings
} from 'react-icons/fi';

const Sidebar = ({ isOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: FiHome },
    { label: 'Jobs', path: '/jobs', icon: FiBriefcase },
    { label: 'Candidates', path: '/candidates', icon: FiUsers },
    { label: 'Email Templates', path: '/email-templates', icon: FiMail },
    { label: 'Companies', path: '/companies', icon: FiGrid },
    { label: 'Settings', path: '/settings', icon: FiSettings }
  ];

  if (!isOpen) return null;

  return (
    <aside className="w-64 bg-gray-900 text-white shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">ZerothHire</h2>
        <p className="text-xs text-gray-400">Founding Engineer Recruitment</p>
      </div>

      <nav className="p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
