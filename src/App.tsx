/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { CustomerList } from './components/CustomerList';
import { BottomNav, NavTab } from './components/BottomNav';
import { LedgerDetailModal } from './components/LedgerDetailModal';
import { AddDueModal } from './components/AddDueModal';
import { QuickPayModal } from './components/QuickPayModal';
import { CustomerModal } from './components/CustomerModal';
import { AdjustBalanceModal } from './components/AdjustBalanceModal';
import { AuthModal } from './components/AuthModal';
import { ExportModal } from './components/ExportModal';
import { AboutModal } from './components/AboutModal';
import { PharmacyProfileModal } from './components/PharmacyProfileModal';
import { PharmacyInfoCard } from './components/PharmacyInfoCard';
import { SettingsMenuModal } from './components/SettingsMenuModal';
import { WhatsAppReminderModal } from './components/WhatsAppReminderModal';
import { NewSaleModal } from './components/NewSaleModal';
import { LoginScreen } from './components/LoginScreen';
import { SplashScreen } from './components/SplashScreen';
import { Customer } from './types/ledger';
import { CloudOff, LogIn, Pill } from 'lucide-react';
import { PWAInstallBanner } from './components/PWAInstallBanner';

function Dashboard() {
  const { user, isDemoMode } = useAuth();
  const { t } = useLanguage();
  const { selectedCustomer, setSelectedCustomer, customers, stats, userStoreProfile } = useLedger();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [listFilter, setListFilter] = useState<'all' | 'hasDue' | 'cleared' | 'highDue'>('all');

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [newSaleModalTab, setNewSaleModalTab] = useState<'sales' | 'expenses'>('sales');
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [dueModalCustomer, setDueModalCustomer] = useState<Customer | null>(null);
  const [payModalCustomer, setPayModalCustomer] = useState<Customer | null>(null);
  const [adjustModalCustomer, setAdjustModalCustomer] = useState<Customer | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCustomerId, setExportCustomerId] = useState<string | undefined>(undefined);

  // Handlers wrapped in useCallback for stable prop references
  const handleOpenAddCustomer = useCallback(() => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  }, []);

  const handleOpenEditCustomer = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setIsCustomerModalOpen(true);
  }, []);

  const handleOpenLedger = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
  }, [setSelectedCustomer]);

  const handleQuickPay = useCallback((customer: Customer) => {
    setPayModalCustomer(customer);
  }, []);

  const handleQuickDue = useCallback((customer: Customer) => {
    setDueModalCustomer(customer);
  }, []);

  const [exportReportType, setExportReportType] = useState<'sales_expense_report' | 'due_statement'>('sales_expense_report');

  const handleAdjustBalance = useCallback((customer: Customer) => {
    setAdjustModalCustomer(customer);
  }, []);

  const handleOpenReports = useCallback(() => {
    setExportCustomerId(undefined);
    setExportReportType('sales_expense_report');
    setIsExportModalOpen(true);
  }, []);

  const handleScrollToCustomers = useCallback(() => {
    const el = document.getElementById('customers-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tab === 'customers') {
      setListFilter('all');
      handleScrollToCustomers();
    } else if (tab === 'due_list') {
      setListFilter('hasDue');
      handleScrollToCustomers();
    } else if (tab === 'settings') {
      setIsSettingsMenuOpen(true);
    }
  }, [handleScrollToCustomers]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#061712] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Demo Mode Notice Banner if user is testing offline */}
      {isDemoMode && !user && (
        <div className="bg-gradient-to-r from-amber-950 via-[#0a2f20] to-amber-950 border-b border-amber-600/40 px-4 sm:px-6 py-2 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 z-40 w-full">
          <div className="max-w-xl mx-auto flex items-center justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 max-w-2xl min-w-0 flex-1">
              <CloudOff className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
              <span className="text-[11px] sm:text-xs">
                <strong>Demo Mode:</strong> You are viewing sample offline data. Sign in to access your secure, private cloud ledger with 0 balance.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] sm:text-[11px] shadow-sm transition active:scale-95 flex-shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          </div>
        </div>
      )}

      {/* App Header with Brand Logo, Title & Notifications */}
      <Header 
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenSettings={() => setIsSettingsMenuOpen(true)}
        onGoHome={() => {
          setSelectedCustomer(null);
          setActiveTab('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area: Centered container (max-w-xl mx-auto) with responsive horizontal padding for mobile devices */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 overflow-x-hidden pb-8 box-border">
        
        {/* In-App PWA Install Banner */}
        <PWAInstallBanner />

        {/* Top Profile Header (Store Profile Card with owner portrait & verified badges) */}
        <PharmacyInfoCard 
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
        />

        {/* KPI Metrics Section: 4 colorful rounded vertical stat cards */}
        <StatsCards 
          onOpenAddCustomerModal={handleOpenAddCustomer}
          onSelectFilter={(filter) => {
            setListFilter(filter);
            handleScrollToCustomers();
          }}
          onOpenNewSale={() => {
            setNewSaleModalTab('sales');
            setIsNewSaleModalOpen(true);
          }}
          onScrollToReports={handleOpenReports}
        />

        {/* Quick Actions Grid: 6 bright rounded shortcuts */}
        <QuickActionsGrid 
          onAddCustomer={handleOpenAddCustomer}
          onNewSale={() => {
            setNewSaleModalTab('sales');
            setIsNewSaleModalOpen(true);
          }}
          onDueList={() => {
            setListFilter('hasDue');
            handleScrollToCustomers();
          }}
          onReports={handleOpenReports}
          onSettings={() => setIsSettingsMenuOpen(true)}
          onHelpSupport={() => {
            window.open('https://wa.me/8801846793071?text=Hello%20Siam%20Pharma%20Support', '_blank');
          }}
        />

        {/* Customer Credit Accounts Main Content Section */}
        <div 
          id="customers-section"
          className="rounded-3xl bg-gradient-to-b from-[#072419]/90 to-[#04160f]/95 border border-[rgba(255,255,255,0.15)] p-3.5 sm:p-5 shadow-2xl backdrop-blur-xl w-full max-w-full overflow-hidden box-border"
        >
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[rgba(255,255,255,0.15)]">
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] shadow-[0_0_8px_#00e676]"></span>
              <span>Customer Credit Accounts ({customers.length})</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-[rgba(255,255,255,0.15)]">
              DGDA REG-PH-0924
            </span>
          </div>

          <CustomerList
            initialFilter={listFilter}
            onOpenLedger={handleOpenLedger}
            onQuickPay={handleQuickPay}
            onQuickDue={handleQuickDue}
            onOpenAddCustomerModal={handleOpenAddCustomer}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        </div>

      </main>

      {/* Fixed Bottom Navigation Bar */}
      <BottomNav 
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        onQuickAdd={handleOpenAddCustomer}
      />

      {/* Footer with ample bottom padding clearance (pb-24 sm:pb-28) to prevent BottomNav overlap */}
      <footer className="w-full border-t border-[rgba(255,255,255,0.15)] bg-[#020e09] py-5 px-4 sm:px-6 text-center text-xs text-slate-400 overflow-x-hidden pb-24 sm:pb-28 box-border">
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center gap-1.5 text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400/90 text-xs">
            <Pill className="w-4 h-4 text-emerald-400" />
            <span>Siam Pharma Due Management</span>
            <span>(সিয়াম ফার্মা)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Proprietor: Md Siam Hasan Santo • WhatsApp: 01846793071 • Bogura, Bangladesh
          </p>
        </div>
      </footer>

      {/* Modals */}
      {selectedCustomer && (
        <LedgerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onOpenAddDue={(c) => setDueModalCustomer(c)}
          onOpenQuickPay={(c) => setPayModalCustomer(c)}
          onOpenEditCustomer={(c) => handleOpenEditCustomer(c)}
          onOpenAdjustBalance={(c) => handleAdjustBalance(c)}
          onOpenExportStatement={(c) => {
            setExportCustomerId(c.id);
            setExportReportType('due_statement');
            setIsExportModalOpen(true);
          }}
        />
      )}

      {dueModalCustomer && (
        <AddDueModal
          customer={dueModalCustomer}
          onClose={() => setDueModalCustomer(null)}
        />
      )}

      {payModalCustomer && (
        <QuickPayModal
          customer={payModalCustomer}
          onClose={() => setPayModalCustomer(null)}
        />
      )}

      {adjustModalCustomer && (
        <AdjustBalanceModal
          customer={adjustModalCustomer}
          onClose={() => setAdjustModalCustomer(null)}
        />
      )}

      {isNewSaleModalOpen && (
        <NewSaleModal
          isOpen={isNewSaleModalOpen}
          onClose={() => setIsNewSaleModalOpen(false)}
          onOpenAddCustomer={handleOpenAddCustomer}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenAboutModal={() => setIsAboutModalOpen(true)}
          initialTab={newSaleModalTab}
        />
      )}

      <WhatsAppReminderModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setActiveTab('home');
        }}
      />

      <CustomerModal
        isOpen={isCustomerModalOpen}
        customerToEdit={customerToEdit}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
        onCustomerAdded={(newId) => {
          const found = customers.find((c) => c.id === newId);
          if (found) setSelectedCustomer(found);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          setIsExportModalOpen(false);
          setExportCustomerId(undefined);
        }}
        initialCustomerId={exportCustomerId}
        initialReportType={exportReportType}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      <PharmacyProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SettingsMenuModal
        isOpen={isSettingsMenuOpen}
        onClose={() => {
          setIsSettingsMenuOpen(false);
          setActiveTab('home');
        }}
        onOpenEditProfile={() => setIsProfileModalOpen(true)}
        onOpenExportModal={() => {
          setExportCustomerId(undefined);
          setIsExportModalOpen(true);
        }}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
      />
    </div>
  );
}

function MainApp() {
  const { user, loading, isDemoMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061712] text-[#e2e8f0] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/15 blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0a3d2c] via-[#05261b] to-[#021811] border-2 border-emerald-400/80 flex items-center justify-center text-emerald-300 shadow-xl shadow-emerald-950/80 animate-pulse ring-2 ring-emerald-500/30">
            <div className="flex items-center justify-center tracking-tighter font-black text-2xl text-emerald-400 select-none drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              <span className="text-emerald-300 -mr-0.5">S</span>
              <span className="text-teal-400">P</span>
            </div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white tracking-wide">Siam Pharma Due Management</h2>
            <p className="text-xs text-emerald-400/80">Checking authentication session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return <LoginScreen />;
  }

  return (
    <LedgerProvider>
      <Dashboard />
    </LedgerProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleReplaySplash = () => setShowSplash(true);
    window.addEventListener('show-splash', handleReplaySplash);
    return () => window.removeEventListener('show-splash', handleReplaySplash);
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <MainApp />
      </LanguageProvider>
    </AuthProvider>
  );
}
