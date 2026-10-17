import React from 'react';
import { 
  Home, 
  Users, 
  FileText, 
  Settings
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

export type NavTab = 'home' | 'customers' | 'due_list' | 'settings';

interface BottomNavProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  onQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onQuickAdd
}) => {
  const { stats } = useLedger();

  const navItems = [
    {
      id: 'home' as NavTab,
      label: 'Home',
      icon: Home,
    },
    {
      id: 'customers' as NavTab,
      label: 'Customers',
      icon: Users,
      badge: stats.totalCustomers > 0 ? stats.totalCustomers : undefined,
    },
    {
      id: 'due_list' as NavTab,
      label: 'Due List',
      icon: FileText,
      badge: stats.customersWithDue > 0 ? stats.customersWithDue : undefined,
      badgeColor: 'bg-rose-500',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full pointer-events-none">
      {/* Centered mobile-width container */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 pb-2.5 pt-1">
        
        {/* Glossy Dark Emerald Container with Even 4-Column Distribution */}
        <nav className="pointer-events-auto relative grid grid-cols-4 gap-1 items-center px-2 py-1.5 rounded-2xl sm:rounded-3xl bg-[#04150e]/95 backdrop-blur-2xl border border-[rgba(255,255,255,0.15)] shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onChangeTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 w-full rounded-2xl transition-all duration-200 select-none min-h-[46px] ${
                  isActive
                    ? 'bg-gradient-to-b from-[#0a3825] to-[#052115] text-[#00e676] border border-emerald-400/50 shadow-[0_0_15px_rgba(0,230,118,0.3)]'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                }`}
              >
                <div className="relative">
                  <Icon 
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#00e676]' : 'text-slate-400'
                    }`} 
                  />
                  {item.badge && (
                    <span 
                      className={`absolute -top-1.5 -right-3 px-1 min-w-[14px] h-3.5 rounded-full text-[9px] font-black text-black flex items-center justify-center leading-none ${
                        item.badgeColor || 'bg-[#00e676]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                <span 
                  className={`text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>

                {/* Rounded active green indicator dot underneath */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] shadow-[0_0_6px_#00e676] mt-0.5" />
                )}
              </button>
            );
          })}

        </nav>
      </div>
    </div>
  );
};
