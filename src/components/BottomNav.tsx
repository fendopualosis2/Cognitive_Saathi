import React from 'react';
import {
  Home,
  Sparkles,
  CalendarCheck,
  Image as ImageIcon,
  User,
  Settings,
  Bell,
  BarChart3,
  ListTodo,
  Gamepad2,
} from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  role: UserRole;
  patientTab: string;
  caregiverTab: string;
  onSelectPatientTab: (tab: any) => void;
  onSelectCaregiverTab: (tab: any) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  patientTab,
  caregiverTab,
  onSelectPatientTab,
  onSelectCaregiverTab,
}) => {
  if (role === 'PATIENT') {
    const patientNavItems = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'activities', label: 'Games', icon: Sparkles },
      { id: 'my_day', label: 'My Day', icon: CalendarCheck },
      { id: 'memories', label: 'Memories', icon: ImageIcon },
      { id: 'me', label: 'Profile', icon: User },
      { id: 'settings', label: 'Comfort', icon: Settings },
    ];

    return (
      <nav
        id="patient-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-30 bg-[#FAF8F5]/95 backdrop-blur border-t border-stone-200 px-2 py-1.5 transition-colors"
      >
        <div className="max-w-xl mx-auto flex items-center justify-around gap-1">
          {patientNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = patientTab === item.id;
            return (
              <button
                key={item.id}
                id={`patient-nav-btn-${item.id}`}
                onClick={() => onSelectPatientTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[54px] ${
                  isActive
                    ? 'text-teal-900 font-bold bg-teal-100/80 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-teal-850 scale-105' : 'text-stone-500'}`} />
                <span className="text-[11px] leading-tight tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  const caregiverNavItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'routine', label: 'Routines', icon: ListTodo },
    { id: 'reminders', label: 'Meds', icon: Bell },
    { id: 'reports', label: 'Clinical AI', icon: BarChart3 },
    { id: 'me', label: 'Circle', icon: User },
  ];

  return (
    <nav
      id="caregiver-bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#FAF8F5]/95 backdrop-blur border-t border-stone-200 px-2 py-1.5 transition-colors"
    >
      <div className="max-w-xl mx-auto flex items-center justify-around gap-1">
        {caregiverNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = caregiverTab === item.id;
          return (
            <button
              key={item.id}
              id={`caregiver-nav-btn-${item.id}`}
              onClick={() => onSelectCaregiverTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[54px] ${
                isActive
                  ? 'text-teal-900 font-bold bg-teal-100/80 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-teal-850 scale-105' : 'text-stone-500'}`} />
              <span className="text-[11px] leading-tight tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
