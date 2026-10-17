import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Printer, 
  Phone, 
  MessageCircle, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  SlidersHorizontal,
  FileText,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowLeftRight,
  Receipt,
  CircleDollarSign,
  Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Area, 
  ComposedChart 
} from 'recharts';
import { Customer, Transaction } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useLanguage } from '../context/LanguageContext';
import { formatTransactionDateTime } from '../lib/formatDateTime';

interface LedgerDetailModalProps {
  customer: Customer | null;
  onClose: () => void;
  onOpenAddDue: (customer: Customer) => void;
  onOpenQuickPay: (customer: Customer) => void;
  onOpenEditCustomer: (customer: Customer) => void;
  onOpenAdjustBalance: (customer: Customer) => void;
  onOpenExportStatement?: (customer: Customer) => void;
}

export const LedgerDetailModal: React.FC<LedgerDetailModalProps> = ({
  customer,
  onClose,
  onOpenAddDue,
  onOpenQuickPay,
  onOpenEditCustomer,
  onOpenAdjustBalance,
  onOpenExportStatement,
}) => {
  const { customerTransactions, loadingTransactions, deleteCustomer } = useLedger();
  const { t, language } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChart, setShowChart] = useState(true);

  // Compute chronological balance progression for Recharts Line Chart
  const chartData = useMemo(() => {
    if (!customer) return [];

    if (!customerTransactions || customerTransactions.length === 0) {
      return [
        {
          label: 'Start',
          date: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : 'Initial',
          balance: customer.totalDue,
          change: 0,
          type: 'initial',
          description: language === 'bn' ? 'প্রারম্ভিক বকেয়া' : 'Initial Due'
        },
        {
          label: 'Today',
          date: new Date().toLocaleDateString('en-GB'),
          balance: customer.totalDue,
          change: 0,
          type: 'current',
          description: language === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Current Balance'
        }
      ];
    }

    // Sort transactions oldest to newest
    const sorted = [...customerTransactions].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const points: Array<{
      label: string;
      date: string;
      balance: number;
      change: number;
      type: string;
      description?: string;
    }> = [];

    // Add baseline starting point before first recorded transaction
    const firstTx = sorted[0];
    points.push({
      label: 'Start',
      date: firstTx.date || 'Initial',
      balance: firstTx.previousBalance,
      change: 0,
      type: 'baseline',
      description: language === 'bn' ? 'শুরুর ব্যালেন্স' : 'Starting Balance'
    });

    sorted.forEach((tx, idx) => {
      const dateParts = tx.date ? tx.date.split('/') : [];
      const shortDate = dateParts.length >= 2 ? `${dateParts[0]}/${dateParts[1]}` : (tx.date || `#${idx + 1}`);

      points.push({
        label: shortDate,
        date: tx.date || '',
        balance: tx.newBalance,
        change: tx.type === 'payment' ? -tx.amount : tx.amount,
        type: tx.type,
        description: tx.description
      });
    });

    return points;
  }, [customer, customerTransactions, language]);

  // Statistics summary and Total Len-Den (Turnover/Volume) calculation from ledger history
  const statsSummary = useMemo(() => {
    if (!customer) {
      return { 
        maxBalance: 0, 
        minBalance: 0, 
        totalPaid: 0, 
        totalLenDen: 0, 
        totalDuesAdded: 0, 
        totalPaymentsMade: 0, 
        txCount: 0 
      };
    }

    if (!customerTransactions || customerTransactions.length === 0) {
      const initialDue = Math.max(0, customer.totalDue || 0);
      return { 
        maxBalance: initialDue, 
        minBalance: initialDue, 
        totalPaid: 0,
        totalLenDen: initialDue,
        totalDuesAdded: initialDue,
        totalPaymentsMade: 0,
        txCount: initialDue > 0 ? 1 : 0
      };
    }

    let dues = 0;
    let payments = 0;
    let absoluteSum = 0;

    customerTransactions.forEach((tx) => {
      const amt = Math.abs(Number(tx.amount) || 0);
      absoluteSum += amt;
      if (tx.type === 'due') {
        dues += amt;
      } else if (tx.type === 'payment') {
        payments += amt;
      } else {
        dues += amt;
      }
    });

    const balances = chartData.map((d) => d.balance);
    const maxBalance = balances.length > 0 ? Math.max(...balances, customer.totalDue) : customer.totalDue;
    const minBalance = balances.length > 0 ? Math.min(...balances, customer.totalDue) : customer.totalDue;

    return { 
      maxBalance, 
      minBalance, 
      totalPaid: payments,
      totalLenDen: absoluteSum > 0 ? absoluteSum : (customer.totalDue || 0),
      totalDuesAdded: dues,
      totalPaymentsMade: payments,
      txCount: customerTransactions.length
    };
  }, [chartData, customer, customerTransactions]);

  if (!customer) return null;

  const hasDue = customer.totalDue > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    if (onOpenExportStatement && customer) {
      onOpenExportStatement(customer);
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) cleanPhone = '88' + cleanPhone;
    const message = encodeURIComponent(t.whatsappTemplate(customer.name, customer.totalDue));
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#051c13] border border-emerald-700/50 shadow-2xl shadow-emerald-950 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between p-3.5 sm:p-5 border-b border-emerald-800/40 bg-gradient-to-r from-[#062418] to-[#041910]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                hasDue ? 'bg-rose-950/60 text-rose-300 border-rose-800/40' : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
              }`}>
                #{customer.serialNumber}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {customer.name}
              </h2>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-300">
              <span className="font-mono text-emerald-300 font-semibold">{customer.phone}</span>
              {customer.address && <span className="text-slate-400">• {customer.address}</span>}
            </div>
            {customer.notes && (
              <p className="text-[11px] text-emerald-300/70 italic mt-1 bg-emerald-950/40 px-2 py-0.5 rounded inline-block">
                {customer.notes}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 text-xs font-semibold shadow-sm transition-all"
              title="Generate PDF Statement / Print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">স্টেটমেন্ট PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-emerald-950/60 hover:bg-rose-950 border border-emerald-800/50 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Balance & Total Len-Den Summary Section */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0c1813] via-[#081f18] to-[#041a12] border-b border-emerald-800/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Side-by-Side Summary Cards: Total Remaining Due + Total Len-Den */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
              
              {/* Summary Card 1: Total Remaining Due */}
              <div className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-200 ${
                hasDue 
                  ? 'bg-gradient-to-br from-[#240e13] via-[#1a0b10] to-[#12070a] border-rose-600/50 shadow-lg shadow-rose-950/30' 
                  : 'bg-gradient-to-br from-[#0b2418] via-[#071a11] to-[#04130c] border-emerald-600/50 shadow-lg shadow-emerald-950/30'
              }`}>
                {/* Subtle background glow */}
                <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl pointer-events-none ${
                  hasDue ? 'bg-rose-500/15' : 'bg-emerald-500/15'
                }`} />

                <div className="flex items-center justify-between gap-2 mb-1.5 relative z-10">
                  <span className="text-xs uppercase tracking-wider font-bold text-slate-300 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${hasDue ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
                    {language === 'bn' ? 'মোট অবশিষ্ট বাকি' : t.totalBalanceDue}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    hasDue 
                      ? 'bg-rose-950/90 text-rose-300 border-rose-700/60' 
                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                  }`}>
                    {hasDue ? (language === 'bn' ? 'বকেয়া বিদ্যমান' : 'Due Pending') : (language === 'bn' ? 'পরিশোধিত' : 'Zero Due')}
                  </span>
                </div>

                <div className={`text-2xl sm:text-3xl font-black flex items-baseline gap-1 relative z-10 ${
                  hasDue ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  <span className="text-base sm:text-lg font-bold">{t.currency}</span>
                  <span className="font-mono tracking-tight">{customer.totalDue.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10 relative z-10">
                  <span>{language === 'bn' ? 'বর্তমান স্ট্যাটাস:' : 'Current Status:'}</span>
                  <span className={hasDue ? 'text-rose-300 font-semibold' : 'text-emerald-300 font-semibold'}>
                    {hasDue 
                      ? (language === 'bn' ? 'তাগাদা যোগ্য বাকি' : 'Payment Due') 
                      : (language === 'bn' ? 'সম্পূর্ণ পরিশোধিত' : 'Fully Cleared')}
                  </span>
                </div>
              </div>

              {/* Summary Card 2: Total Len-Den (Total Transactions / Turnover) */}
              <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-[#07242c] via-[#051d23] to-[#041419] border border-cyan-400/50 shadow-lg shadow-cyan-950/30 transition-all duration-200">
                {/* Subtle cyan glow */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-400/15 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between gap-2 mb-1.5 relative z-10">
                  <span className="text-xs uppercase tracking-wider font-bold text-cyan-200 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>{language === 'bn' ? 'মোট লেন-দেন (টার্নওভার)' : 'Total Len-Den (Turnover)'}</span>
                  </span>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-cyan-950/90 text-cyan-300 border border-cyan-700/60">
                    {statsSummary.txCount} {language === 'bn' ? 'টি এন্ট্রি' : 'txns'}
                  </span>
                </div>

                <div className="text-2xl sm:text-3xl font-black text-cyan-300 flex items-baseline gap-1 relative z-10">
                  <span className="text-base sm:text-lg font-bold text-cyan-400">{t.currency}</span>
                  <span className="font-mono tracking-tight">{statsSummary.totalLenDen.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-cyan-900/60 relative z-10">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {language === 'bn' ? 'জমা:' : 'Paid:'} ৳{statsSummary.totalPaymentsMade.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-rose-300 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {language === 'bn' ? 'বাকী ক্রয়:' : 'Sales/Due:'} ৳{statsSummary.totalDuesAdded.toLocaleString()}
                  </span>
                </div>
              </div>

            </div>

            {/* Action Buttons Column / Row */}
            <div className="flex flex-row lg:flex-col items-stretch gap-2 lg:min-w-[190px] flex-shrink-0">
              <button
                onClick={() => onOpenAddDue(customer)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-950 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addDueBtn}</span>
              </button>

              <button
                onClick={() => onOpenQuickPay(customer)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.recordPaymentBtn}</span>
              </button>

              <button
                onClick={() => onOpenAdjustBalance(customer)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 text-xs font-semibold transition-colors"
                title="Edit / Adjust Balance"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ব্যালেন্স সমন্বয়' : 'Adjust Balance'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Customer Balance History Line Chart using recharts */}
        <div className="bg-[#03170f] border-b border-emerald-900/40 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-[#00e676]">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">
                {language === 'bn' ? 'ব্যালেন্স হিস্ট্রি ও ট্রেন্ড' : 'Balance History & Trend'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
                {chartData.length} {language === 'bn' ? 'পয়েন্ট' : 'points'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Peak Due stat badge */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-900/60">
                <span className="text-slate-400">{language === 'bn' ? 'সর্বোচ্চ বাকি:' : 'Peak Due:'}</span>
                <span className="text-rose-400 font-bold">৳{statsSummary.maxBalance.toLocaleString()}</span>
              </div>
              
              {/* Total Paid stat badge */}
              {statsSummary.totalPaid > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-900/60">
                  <span className="text-slate-400">{language === 'bn' ? 'মোট পরিশোধ:' : 'Total Paid:'}</span>
                  <span className="text-emerald-400 font-bold">৳{statsSummary.totalPaid.toLocaleString()}</span>
                </div>
              )}

              {/* Collapse / Expand Button */}
              <button
                type="button"
                onClick={() => setShowChart(!showChart)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/50 text-[11px] text-emerald-300 transition-colors"
                title={showChart ? "Hide Chart" : "Show Chart"}
              >
                <span>{showChart ? (language === 'bn' ? 'লুকান' : 'Hide') : (language === 'bn' ? 'দেখান' : 'Show')}</span>
                {showChart ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {showChart && (
            <div className="w-full h-36 sm:h-44 pt-1 animate-in fade-in duration-200">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceLineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#063824" strokeDasharray="3 3" vertical={false} opacity={0.6} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#0a4d33" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#0a4d33' }}
                  />
                  <YAxis 
                    stroke="#0a4d33" 
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#0a4d33' }}
                    tickFormatter={(val: number) => `৳${val}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as {
                          label: string;
                          date: string;
                          balance: number;
                          change: number;
                          type: string;
                          description?: string;
                        };
                        const isPayment = data.type === 'payment';
                        const isDue = data.type === 'due';

                        return (
                          <div className="bg-[#03150e]/95 backdrop-blur-md border border-emerald-500/40 p-2.5 rounded-xl shadow-xl shadow-black/80 text-xs min-w-[150px] select-none z-50">
                            <div className="flex items-center justify-between gap-2 border-b border-emerald-900/50 pb-1 mb-1.5">
                              <span className="font-mono text-slate-300 text-[10px]">{data.date || data.label}</span>
                              {data.type !== 'baseline' && data.type !== 'initial' && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  isPayment ? 'bg-emerald-500/20 text-emerald-300' :
                                  isDue ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'
                                }`}>
                                  {isPayment ? (language === 'bn' ? 'জমা' : 'Payment') :
                                   isDue ? (language === 'bn' ? 'বাকি' : 'Due') :
                                   (language === 'bn' ? 'সমন্বয়' : 'Adj')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[11px] text-slate-400 font-medium">{language === 'bn' ? 'ব্যালেন্স:' : 'Balance:'}</span>
                              <span className={`text-sm font-black font-mono ${data.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                ৳{data.balance.toLocaleString()}
                              </span>
                            </div>

                            {data.change !== 0 && (
                              <div className="flex items-center justify-between text-[10px] font-mono mt-0.5">
                                <span className="text-slate-400">{language === 'bn' ? 'পরিবর্তন:' : 'Change:'}</span>
                                <span className={data.change > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {data.change > 0 ? `+৳${data.change.toLocaleString()}` : `-৳${Math.abs(data.change).toLocaleString()}`}
                                </span>
                              </div>
                            )}

                            {data.description && (
                              <p className="text-[10px] text-slate-300 italic mt-1 line-clamp-2 border-t border-emerald-900/50 pt-1">
                                {data.description}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    fill="url(#balanceLineGrad)"
                    stroke="transparent"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    name="Balance"
                    stroke="#00e676" 
                    strokeWidth={2.5} 
                    dot={{ r: 3.5, fill: '#00e676', stroke: '#04150e', strokeWidth: 1.5 }}
                    activeDot={{ r: 5.5, fill: '#00e5ff', stroke: '#ffffff', strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Transaction History Header */}
        <div className="px-5 py-3 bg-[#04150e] border-b border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>{t.transactionHistory}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => onOpenEditCustomer(customer)}
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.editCustomerBtn}</span>
            </button>

            {hasDue && (
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium ml-2"
                title="Send reminder on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        {/* Transaction Item List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loadingTransactions ? (
            <div className="py-12 text-center">
              <div className="w-7 h-7 mx-auto border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-xs text-emerald-400/80">{t.syncing}</p>
            </div>
          ) : customerTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-emerald-500/30 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No transactions recorded yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Add a due item or record a payment using the buttons above.
              </p>
            </div>
          ) : (
            customerTransactions.map((tx) => {
              const isPayment = tx.type === 'payment';
              const isDue = tx.type === 'due';
              const isAdj = tx.type === 'adjustment';
              const formattedDT = formatTransactionDateTime(tx.date, tx.createdAt);

              return (
                <div
                  key={tx.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPayment
                      ? 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-600/50'
                      : isDue
                      ? 'bg-rose-950/20 border-rose-900/30 hover:border-rose-700/50'
                      : 'bg-cyan-950/20 border-cyan-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isPayment
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isDue
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {isPayment ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isDue ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <SlidersHorizontal className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold ${
                              isPayment
                                ? 'text-emerald-300'
                                : isDue
                                ? 'text-rose-300'
                                : 'text-cyan-300'
                            }`}
                          >
                            {isPayment
                              ? t.typePayment
                              : isDue
                              ? t.typeDue
                              : t.typeAdjustment}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono inline-flex items-center gap-1.5">
                            <span>{formattedDT.date}</span>
                            {formattedDT.time && (
                              <>
                                <span className="text-slate-600 font-bold">•</span>
                                <span className="text-emerald-300/80 font-medium inline-flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5 text-emerald-400/80" />
                                  {formattedDT.time}
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        {tx.description && (
                          <p className="text-xs text-slate-200 mt-1 font-medium">
                            {tx.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                          <span>Balance: {t.currency}{tx.previousBalance}</span>
                          <span>→</span>
                          <span className="font-semibold text-slate-200">
                            {t.currency}{tx.newBalance}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Amount */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div
                        className={`text-base sm:text-lg font-black font-mono ${
                          isPayment
                            ? 'text-emerald-400'
                            : isDue
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {isPayment ? '-' : '+'}
                        {t.currency}
                        {tx.amount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isPayment
                          ? (language === 'bn' ? 'পরিশোধ' : 'Payment')
                          : isDue
                          ? (language === 'bn' ? 'বাকি' : 'Due')
                          : (language === 'bn' ? 'সমন্বয়' : 'Adjustment')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Delete Customer Section */}
        <div className="p-4 border-t border-emerald-900/40 bg-[#04150e] flex items-center justify-between">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.deleteCustomerBtn}</span>
            </button>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 p-2 rounded-xl bg-rose-950/60 border border-rose-800/60">
              <div className="flex items-center gap-2 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>
                  {hasDue ? `${t.deleteDueWarning} ৳${customer.totalDue}! ` : ''}
                  {t.deleteWarning}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : t.deletePermanently}
                </button>
              </div>
            </div>
          )}

          {!showDeleteConfirm && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/40 text-xs font-medium text-slate-200"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
