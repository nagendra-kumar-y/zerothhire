import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiSettings } from 'react-icons/fi';

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiMenu size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">ZerothHire</h1>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <FiSettings size={24} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
