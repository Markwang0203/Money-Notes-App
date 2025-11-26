import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Settings, TrendingUp, PieChart, Sparkles, RefreshCw, ArrowUpCircle, ArrowDownCircle, ShoppingBag, BarChart3, Target, AlertCircle, Calendar, Wallet, FileDown, Trash2 } from 'lucide-react';
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip } from 'recharts';

import { Transaction, Category, CATEGORY_COLORS, TransactionType, ReceiptItem } from './types';
import TransactionItem from './components/TransactionItem';
import AddTransactionModal from './components/AddTransactionModal';
import PriceWatchModal from './components/PriceWatchModal';
import AnalyticsModal from './components/AnalyticsModal';
import WeekCalendar from './components/WeekCalendar';
import { getFinancialInsight } from './services/geminiService';
import Logo from './components/Logo';

const App: React.FC = () => {
  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('oz_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('oz_exchange_rate');
    return saved ? parseFloat(saved) : 21.5;
  });

  // Budgets state: Key = Category Name, Value = Monthly Limit (AUD)
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('oz_budgets');
    return saved ? JSON.parse(saved) : {};
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPriceWatchOpen, setIsPriceWatchOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  
  // Date Filtering State
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('oz_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('oz_exchange_rate', exchangeRate.toString());
  }, [exchangeRate]);

  useEffect(() => {
    localStorage.setItem('oz_budgets', JSON.stringify(budgets));
  }, [budgets]);

  // Auto-fetch exchange rate on mount
  useEffect(() => {
    fetchLiveExchangeRate();
  }, []);

  // --- Functions ---
  const fetchLiveExchangeRate = async () => {
    setIsUpdatingRate(true);
    try {
      // Free public API for exchange rates
      const response = await fetch('https://open.er-api.com/v6/latest/AUD');
      const data = await response.json();
      if (data && data.rates && data.rates.TWD) {
        const rate = parseFloat(data.rates.TWD.toFixed(2));
        setExchangeRate(rate);
      }
    } catch (error) {
      console.error("Failed to fetch live exchange rate", error);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  // --- Calculations ---
  // Default type to 'expense' for legacy data
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type !== 'income');

  const totalIncomeAUD = useMemo(() => incomeTransactions.reduce((sum, t) => sum + t.amountAUD, 0), [incomeTransactions]);
  const totalExpenseAUD = useMemo(() => expenseTransactions.reduce((sum, t) => sum + t.amountAUD, 0), [expenseTransactions]);
  
  const netAssetsAUD = totalIncomeAUD - totalExpenseAUD;
  const netAssetsTWD = netAssetsAUD * exchangeRate;

  const chartData = useMemo(() => {
    // Only show Expense breakdown in chart for now as it's the most common use case
    const grouped = expenseTransactions.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amountAUD;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [expenseTransactions]);

  // Transaction Sorting and Filtering
  const displayedTransactions = useMemo(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (selectedDateFilter) {
      list = list.filter(t => t.date === selectedDateFilter);
    }
    
    return list;
  }, [transactions, selectedDateFilter]);

  // Monthly History Calculation
  const monthlyHistory = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    transactions.forEach(t => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!map.has(monthKey)) {
        map.set(monthKey, { income: 0, expense: 0 });
      }
      const entry = map.get(monthKey)!;
      if (t.type === 'income') {
        entry.income += t.amountAUD;
      } else {
        entry.expense += t.amountAUD;
      }
    });

    // Sort descending by month
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data,
        net: data.income - data.expense
      }));
  }, [transactions]);

  // Budget Calculations (Current Month)
  const budgetStatus = useMemo(() => {
    const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    
    // Calculate spending this month per category
    const currentMonthSpending = transactions
      .filter(t => t.type !== 'income' && t.date.startsWith(currentMonthKey))
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amountAUD;
        return acc;
      }, {} as Record<string, number>);

    // Combine with budgets
    const status = Object.entries(budgets)
      .filter(([_, limit]) => limit > 0) // Only show set budgets
      .map(([cat, limit]) => {
        const spent = currentMonthSpending[cat] || 0;
        const rawPercentage = (spent / limit) * 100;
        const percentage = Math.min(rawPercentage, 100);
        const isOver = spent > limit;
        return { category: cat, limit, spent, percentage, rawPercentage, isOver };
      })
      .sort((a, b) => b.percentage - a.percentage); // High usage first

    return status;
  }, [transactions, budgets]);

  // --- Handlers ---
  const handleAddTransaction = (amount: number, category: string, note: string, date: string, type: TransactionType, items?: ReceiptItem[], tax?: number, superannuation?: number) => {
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type,
      amountAUD: amount,
      amountTWD: amount * exchangeRate,
      category,
      date,
      note,
      items,
      tax,
      superannuation
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    if(window.confirm('確定要刪除這筆記錄嗎？')) {
        setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleUpdateRate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setExchangeRate(val);
  };

  const handleBudgetChange = (category: string, value: string) => {
    const num = parseFloat(value);
    setBudgets(prev => ({
      ...prev,
      [category]: isNaN(num) ? 0 : num
    }));
  };

  const handleAskAI = async () => {
    setLoadingAi(true);
    setAiInsight(null);
    const result = await getFinancialInsight(transactions, exchangeRate);
    setAiInsight(result);
    setLoadingAi(false);
  };

  // Export Month to CSV
  const handleExportMonth = (month: string) => {
    const monthTrans = transactions.filter(t => t.date.startsWith(month));
    if (monthTrans.length === 0) return;

    // CSV Header
    const headers = ['Date', 'Type', 'Category', 'Amount (AUD)', 'Amount (TWD)', 'Note', 'Tax', 'Super', 'Items'];
    
    // CSV Rows
    const rows = monthTrans.map(t => {
      const itemString = t.items ? t.items.map(i => `${i.name}($${i.price})`).join('; ') : '';
      return [
        t.date,
        t.type || 'expense',
        t.category,
        t.amountAUD.toFixed(2),
        t.amountTWD.toFixed(0),
        `"${t.note.replace(/"/g, '""')}"`, // Escape quotes
        t.tax || 0,
        t.superannuation || 0,
        `"${itemString.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n'); // Add BOM for Excel/Sheets Chinese support
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `aus_life_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete Month Data
  const handleDeleteMonth = (month: string) => {
    const confirmMsg = `警告：您確定要刪除 ${month} 月的所有資料嗎？\n此動作無法復原，建議先匯出備份。`;
    if (window.confirm(confirmMsg)) {
        if (window.confirm(`請再次確認：真的要刪除 ${month} 的資料？`)) {
            setTransactions(prev => prev.filter(t => !t.date.startsWith(month)));
        }
    }
  };

  return (
    <div className="min-h-screen font-sans text-slate-800 pb-24 sm:pb-10 relative">
      
      {/* Background Image & Overlay */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=2070&auto=format&fit=crop')" 
        }}
      />
      <div className="fixed inset-0 z-[-1] bg-slate-100/60 backdrop-blur-[2px]" />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-md border-b border-white/20 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
           <Logo className="w-10 h-10 shadow-sm rounded-lg" />
           <h1 className="text-xl font-bold text-slate-800 tracking-tight">Money Notes</h1>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-oz-100 text-oz-600' : 'text-slate-600 hover:text-oz-600 hover:bg-white/50'}`}
        >
          <Settings size={22} />
        </button>
      </header>

      {/* Settings Modal/Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 relative z-50">
             
             {/* Settings Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Settings size={20} /> 設定 Settings
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white rounded-full hover:bg-slate-100 shadow-sm text-slate-500">
                  <ArrowDownCircle size={20} className="rotate-180" />
                </button>
             </div>

             <div className="overflow-y-auto p-6 space-y-6">
                {/* 1. Exchange Rate */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-500 uppercase">匯率設定 (AUD : TWD)</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-oz-500 shadow-sm flex-1">
                          <span className="text-slate-400 text-sm font-medium">1 AUD =</span>
                          <input 
                              type="number" 
                              value={exchangeRate} 
                              onChange={handleUpdateRate}
                              step="0.01"
                              className="w-full font-bold text-slate-800 outline-none"
                          />
                          <span className="text-slate-400 text-sm font-medium">TWD</span>
                      </div>
                      <button 
                        onClick={fetchLiveExchangeRate}
                        disabled={isUpdatingRate}
                        className={`p-3 rounded-xl bg-oz-50 border border-oz-100 text-oz-600 hover:bg-oz-100 transition-all ${isUpdatingRate ? 'animate-spin' : ''}`}
                        title="更新即時匯率"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* 2. Budget Settings */}
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-slate-500 uppercase">類別月預算 (Monthly Budget)</label>
                      <span className="text-xs text-slate-400">設為 0 代表不追蹤</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3">
                      {Object.values(Category).map((cat) => (
                        <div key={cat} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: CATEGORY_COLORS[cat] }}>
                                 {cat.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{cat}</span>
                           </div>
                           <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input 
                                type="number" 
                                placeholder="0"
                                value={budgets[cat] || ''}
                                onChange={(e) => handleBudgetChange(cat, e.target.value)}
                                className="w-full pl-6 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-oz-500 text-right"
                              />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Top Hero Section: Net Assets + Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Net Asset Card (Full width on Mobile, 2/3 on Desktop) */}
            <div className="lg:col-span-2 bg-gradient-to-br from-oz-600/95 to-oz-900/95 backdrop-blur-sm rounded-3xl p-6 text-white shadow-xl shadow-oz-900/20 relative overflow-hidden group border border-white/10 flex flex-col justify-center min-h-[160px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400 opacity-20 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="relative z-10 flex flex-col gap-4">
                    <div>
                    <p className="text-oz-100 text-sm font-medium mb-1 flex items-center gap-2">
                        <span>淨資產 (Net Assets)</span>
                    </p>
                    <h2 className="text-4xl font-extrabold tracking-tight mb-2 text-white drop-shadow-sm">
                        ${netAssetsAUD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-white/95 border border-white/10">
                        ≈ NT$ {Math.round(netAssetsTWD).toLocaleString()}
                    </div>
                    </div>

                    {/* Mini Stats for Income/Expense */}
                    <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-white/10">
                    <div className="flex flex-col">
                        <span className="text-xs text-oz-200 flex items-center gap-1 mb-0.5">
                            <ArrowUpCircle size={12} className="text-emerald-300" /> 總收入 Income
                        </span>
                        <span className="font-bold text-lg text-emerald-100">
                            ${totalIncomeAUD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4">
                        <span className="text-xs text-oz-200 flex items-center gap-1 mb-0.5">
                            <ArrowDownCircle size={12} className="text-rose-300" /> 總支出 Expense
                        </span>
                        <span className="font-bold text-lg text-rose-100">
                            ${totalExpenseAUD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    </div>
                </div>
            </div>

            {/* AI Advisor Card (Right Col on Desktop) */}
            {!selectedDateFilter && (
                <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/40 relative flex flex-col min-h-[160px]">
                    <h3 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                        <Sparkles size={16} className="text-gold-500" /> 財務顧問
                    </h3>
                    <div className="flex-1 overflow-y-auto no-scrollbar text-sm text-slate-600 leading-relaxed custom-scrollbar">
                        {loadingAi ? (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-oz-500"></div>
                                <span>AI 分析中...</span>
                            </div>
                        ) : aiInsight ? (
                            <div className="animate-in fade-in duration-500 whitespace-pre-wrap">
                                {aiInsight}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <p className="text-xs text-slate-400 mb-2">獲取即時收支建議</p>
                                <button 
                                    onClick={handleAskAI}
                                    className="bg-oz-50 hover:bg-oz-100 text-oz-600 text-xs font-bold py-2 px-4 rounded-xl border border-oz-100 transition-colors"
                                >
                                    開始 AI 分析
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Dashboard Widgets Grid (Hidden when filtered) */}
        {!selectedDateFilter && transactions.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Chart Card */}
              <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/40 flex flex-col items-center relative group">
                <h3 className="text-sm font-semibold text-slate-500 mb-4 w-full flex items-center gap-2">
                    <PieChart size={16} className="text-oz-500" /> 支出分佈
                </h3>
                <div className="w-full h-40 relative">
                    {expenseTransactions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as Category] || '#94a3b8'} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [`$${value}`, 'AUD']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 text-xs">暫無支出記錄</div>
                    )}
                </div>
                <button 
                    onClick={() => setIsAnalyticsOpen(true)}
                    className="mt-4 w-full py-2 bg-slate-50/80 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-slate-100"
                >
                    <BarChart3 size={14} /> 查看詳細分析
                </button>
              </div>

              {/* Budget Status Card */}
              <div className="bg-white/90 backdrop-blur-sm p-5 rounded-3xl shadow-sm border border-white/40 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Target size={18} className="text-rose-500" /> 本月預算
                        </h3>
                        <button onClick={() => setIsSettingsOpen(true)} className="text-xs text-slate-400 hover:text-oz-600 font-medium">編輯</button>
                    </div>
                    
                    {budgetStatus.length > 0 ? (
                        <div className="space-y-4 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                            {budgetStatus.map((item) => (
                                <div key={item.category}>
                                    <div className="flex justify-between items-end text-xs mb-1.5">
                                        <span className="font-bold text-slate-700">{item.category}</span>
                                        <div className="text-right">
                                            <span className={`font-bold mr-1.5 ${item.isOver ? 'text-rose-600' : 'text-slate-600'}`}>{item.rawPercentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${item.isOver ? 'bg-rose-500' : item.rawPercentage >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${item.percentage}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs text-center">
                            尚未設定預算<br/>點擊「編輯」開始規劃
                        </div>
                    )}
              </div>

              {/* Price Watch Card */}
              <button
                onClick={() => setIsPriceWatchOpen(true)}
                className="bg-slate-800/90 backdrop-blur-sm text-white p-5 rounded-3xl shadow-lg shadow-slate-900/10 flex flex-col justify-between hover:bg-slate-900 transition-all group border border-slate-700 h-full"
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                            <ShoppingBag size={20} />
                        </div>
                        <div className="bg-slate-700/50 p-2 rounded-full text-slate-300 group-hover:text-white transition-colors">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="text-left mt-4">
                        <h3 className="font-bold text-lg">物價觀測站</h3>
                        <p className="text-xs text-slate-400 mt-1">追蹤 Woolworths, Coles 歷史價格</p>
                    </div>
              </button>
           </div>
        )}

        {/* Weekly Calendar - Always visible as a filter */}
        <WeekCalendar 
          selectedDate={selectedDateFilter} 
          onSelectDate={setSelectedDateFilter} 
          transactions={transactions} 
        />
        
        {/* Monthly History Section (Hide if date filtered) */}
        {!selectedDateFilter && monthlyHistory.length > 0 && (
           <div className="animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-3 px-2">
                 <h3 className="text-lg font-bold text-slate-800/90 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-lg inline-flex items-center gap-2">
                    <Calendar size={18} className="text-slate-600"/> 月度帳單 (Monthly History)
                 </h3>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1 snap-x">
                 {monthlyHistory.map((item) => (
                    <div 
                      key={item.month} 
                      className="snap-start flex-shrink-0 w-48 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/40 flex flex-col gap-2"
                    >
                       <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-1">
                          <h4 className="font-bold text-slate-700 text-sm">
                            {item.month}
                          </h4>
                          <div className="flex gap-1">
                             <button 
                                onClick={() => handleExportMonth(item.month)}
                                className="p-1.5 hover:bg-oz-50 rounded text-slate-400 hover:text-oz-600 transition-colors"
                                title="匯出 CSV"
                             >
                                <FileDown size={14} />
                             </button>
                             <button 
                                onClick={() => handleDeleteMonth(item.month)}
                                className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                title="刪除整月資料"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                       
                       <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-400">收入</span>
                             <span className="text-emerald-600 font-bold">+${item.income.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                             <span className="text-slate-400">支出</span>
                             <span className="text-rose-500 font-bold">-${item.expense.toLocaleString()}</span>
                          </div>
                       </div>
                       <div className={`mt-2 pt-2 border-t border-slate-100 text-sm font-bold flex justify-between items-center ${item.net >= 0 ? 'text-slate-700' : 'text-rose-600'}`}>
                          <span className="text-xs text-slate-400 font-normal">結餘</span>
                          ${item.net.toLocaleString()}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* Transaction List */}
        <div>
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-lg font-bold text-slate-800/90 bg-white/40 backdrop-blur-sm px-3 py-1 rounded-lg inline-flex items-center gap-2">
                   <Wallet size={18} className="text-slate-600"/> 
                   {selectedDateFilter ? `${selectedDateFilter} 交易記錄` : '交易記錄'}
                </h3>
                <span className="text-xs text-slate-600 font-medium bg-white/40 backdrop-blur-sm px-2 py-1 rounded-lg">共 {displayedTransactions.length} 筆</span>
            </div>
            
            <div className="space-y-3">
                {displayedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white/50 backdrop-blur-sm rounded-3xl">
                        <p>{selectedDateFilter ? '這一天沒有記帳資料' : '目前沒有記錄，點擊「+」開始記帳！'}</p>
                    </div>
                ) : (
                    displayedTransactions.map(t => (
                        <TransactionItem 
                            key={t.id} 
                            transaction={t} 
                            onDelete={handleDeleteTransaction}
                        />
                    ))
                )}
            </div>
        </div>

      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 bg-oz-600 hover:bg-oz-500 text-white rounded-full shadow-xl shadow-oz-900/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40 border-2 border-white/20"
      >
        <Plus size={32} />
      </button>

      {/* Add Modal */}
      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddTransaction}
        exchangeRate={exchangeRate}
      />

      {/* Price Watch Modal */}
      <PriceWatchModal 
        isOpen={isPriceWatchOpen} 
        onClose={() => setIsPriceWatchOpen(false)}
        transactions={transactions}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        transactions={transactions}
      />

    </div>
  );
};

export default App;