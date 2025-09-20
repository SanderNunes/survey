import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown } from 'lucide-react';
import logo from "@/assets/logo-white.png";
import { useAuth } from '@/hooks/useAuth';
import { useSharePoint } from '@/hooks/useSharePoint';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function MainLayout() {
  const { userProfile, logout } = useAuth();
  const { role } = useSharePoint();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!userProfile && !role) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-gray-50 animate-fadeIn">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Simple Header */}
      <header className="bg-primary shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/home" title="Africell Angola" className="flex-shrink-0">
              <img
                src={logo}
                width={150}
                height={40}
                alt="Logotipo Africell"
                className="h-10 w-auto"
              />
            </Link>

            {/* Optional: Simple user indicator */}
            {userProfile && (
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm">
                  {userProfile.displayName || 'User'}
                </span>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-primary text-sm font-medium">
                    {(userProfile.displayName || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
