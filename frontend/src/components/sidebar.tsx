import { Link } from "react-router-dom";
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col fixed left-0 top-0">
      <div className="p-4 text-xl font-bold border-b border-gray-700">
        Navigation
      </div>
      <nav className="flex-1 p-4 space-y-3">
        <Link to="/" className="block hover:text-blue-400">Workflows</Link>
        <Link to="/history" className="block hover:text-blue-400">My History</Link>
        <Link to="/executions" className="block hover:text-blue-400">Executions</Link>
        <Link to="/oauth" className="block hover:text-blue-400">OAuth</Link>
      </nav>
      
      {/* User section */}
      <div className="border-t border-gray-700 p-4">
        {user && (
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name || user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={logout}
          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
