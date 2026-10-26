import React from 'react';
import { 
  UserPlus, 
  ShoppingBag, 
  FileText, 
  BarChart3, 
  Settings, 
  MessageCircle,
  Sparkles
} from 'lucide-react';

interface QuickActionsGridProps {
  onAddCustomer: () => void;
  onNewSale: () => void;
  onDueList: () => void;
  onReports: () => void;
  onSettings: () => void;
  onHelpSupport: () => void;
}

const QuickActionsGridComponent: React.FC<QuickActionsGridProps> = ({
  onAddCustomer,
  onNewSale,
  onDueList,
  onReports,
  onSettings,
  onHelpSupport
}) => {
  const actions = [
    {
      id: 'add_customer',
      label: 'Add Customer',
      labelBn: 'নতুন কাস্টমার',
      icon: UserPlus,
      color: '#00e676',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(0,230,118,0.25)]',
      cardGradient: 'from-[#082e1d]/90 via-[#062417]/85 to-[#03150e]/95',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
      iconColor: 'text-[#00e676]',
      onClick: onAddCustomer,
    },
    {
      id: 'new_sale',
      label: 'Sale',
      labelBn: 'বিক্রি / বাকি',
      icon: ShoppingBag,
      color: '#00e5ff',
      badgeBg: 'bg-cyan-500/15',
      badgeBorder: 'border-cyan-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(0,229,255,0.25)]',
      cardGradient: 'from-[#052b36]/90 via-[#042028]/85 to-[#021319]/95',
      borderColor: 'border-cyan-500/30 hover:border-cyan-400/60',
      iconColor: 'text-[#00e5ff]',
      onClick: onNewSale,
    },
    {
      id: 'due_list',
      label: 'Due List',
      labelBn: 'বাকি তালিকা',
      icon: FileText,
      color: '#c084fc',
      badgeBg: 'bg-purple-500/15',
      badgeBorder: 'border-purple-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(192,132,252,0.25)]',
      cardGradient: 'from-[#27103a]/90 via-[#1c0c2a]/85 to-[#100718]/95',
      borderColor: 'border-purple-500/30 hover:border-purple-400/60',
      iconColor: 'text-[#c084fc]',
      onClick: onDueList,
    },
    {
      id: 'reports',
      label: 'Reports',
      labelBn: 'হিসাব রিপোর্ট',
      icon: BarChart3,
      color: '#fbbf24',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(251,191,36,0.25)]',
      cardGradient: 'from-[#332208]/90 via-[#241805]/85 to-[#140e03]/95',
      borderColor: 'border-amber-500/30 hover:border-amber-400/60',
      iconColor: 'text-[#fbbf24]',
      onClick: onReports,
    },
    {
      id: 'settings',
      label: 'Settings',
      labelBn: 'সেটিংস',
      icon: Settings,
      color: '#2dd4bf',
      badgeBg: 'bg-teal-500/15',
      badgeBorder: 'border-teal-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(45,212,191,0.25)]',
      cardGradient: 'from-[#072d29]/90 via-[#05211e]/85 to-[#021312]/95',
      borderColor: 'border-teal-500/30 hover:border-teal-400/60',
      iconColor: 'text-[#2dd4bf]',
      onClick: onSettings,
    },
    {
      id: 'help_support',
      label: 'Help & Support',
      labelBn: 'সহায়তা / চ্যাট',
      icon: MessageCircle,
      color: '#25d366',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeGlow: 'shadow-[0_0_16px_rgba(37,211,102,0.25)]',
      cardGradient: 'from-[#082e1d]/90 via-[#062417]/85 to-[#03150e]/95',
      borderColor: 'border-emerald-500/30 hover:border-emerald-400/60',
      iconColor: 'text-[#25d366]',
      onClick: onHelpSupport,
    },
  ];

  return (
    <section className="w-full space-y-3" aria-label="Quick Actions">
      {/* Section Header with Subtle Accent & Info Pill */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676] animate-pulse" />
          <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
            Quick Actions
          </h2>
          <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 hidden xs:inline-block">
            দ্রুত সেবা
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400/90 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Shortcuts</span>
        </div>
      </div>

      {/* Grid of Quick Action Shortcuts - Spacious, High-Contrast & Touch-Friendly */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3.5 w-full box-border">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              onClick={act.onClick}
              type="button"
              className={`group relative flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-gradient-to-b ${act.cardGradient} border ${act.borderColor} hover:scale-[1.03] active:scale-[0.96] transition-all duration-200 shadow-lg shadow-black/40 select-none min-h-[112px] sm:min-h-[122px] box-border min-w-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
            >
              {/* Top/Center: Elevated Icon Container with Vibrancy and Glow */}
              <div 
                className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl ${act.badgeBg} border ${act.badgeBorder} flex items-center justify-center ${act.iconColor} ${act.badgeGlow} group-hover:scale-110 group-hover:shadow-[0_0_20px_currentColor] transition-all duration-200 flex-shrink-0 mb-2 sm:mb-2.5 backdrop-blur-sm`}
              >
                <Icon className="w-6 h-6 sm:w-6.5 sm:h-6.5 stroke-[2.2]" />
              </div>

              {/* Primary Label - High Legibility & Crisp Weight */}
              <span className="text-xs sm:text-[13px] font-bold text-white tracking-tight leading-tight block w-full px-0.5 text-center truncate group-hover:text-emerald-200 transition-colors">
                {act.label}
              </span>

              {/* Subtitle / Bengali Label - Clear Separation & Soft Sub-tone */}
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 group-hover:text-slate-300 block w-full px-0.5 text-center mt-1 leading-none truncate">
                {act.labelBn}
              </span>

              {/* Bottom Subtle Glowing Line on Hover */}
              <div 
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: act.color }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export const QuickActionsGrid = React.memo(QuickActionsGridComponent);
