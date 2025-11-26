
import React, { useMemo, useState } from 'react';
import { X, BarChart3, TrendingUp, PieChart, ArrowLeft, Receipt, AlertCircle, Calendar } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import { Transaction, CATEGORY_COLORS, Category } from '../types';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, transactions }) => {
  const [activeTab, setActiveTab] = useState<'trend' | 'category'>('trend');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // Drill-down state: keeping track of which category is selected for detailed item view
  const [detailCategory, setDetailCategory] = useState<string | null>(null);

  // --- Data Processing ---

  // 1. Group by Month for Trends
  const monthlyData = useMemo(() => {
    const map = new Map<string, { name: string; Income: number; Expense: number; Net: number }>();

    transactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!map.has(key)) {
        map.set(key, { name: key, Income: 0, Expense: 0, Net: 0 });
      }
      
      const entry = map.get(key)!;
      if (t.type === 'income') {
        entry.Income += t.amountAUD;
      } else {
        entry.Expense += t.amountAUD;
      }
      entry.Net = entry.Income - entry.Expense;
    });

    // Sort chronologically and format name
    return Array.from(map.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(item => ({
        ...item,
        shortName: item.name.split('-')[1] // Just month number
      }));
  }, [transactions]);

  // 2. Filter Transactions based on Month
  const filteredTransactions = useMemo(() => {
    return selectedMonth === 'all' 
      ? transactions 
      : transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // 3. Group by Category for Pie Chart (Top Level)
  const categoryData = useMemo(() => {
    const expenseOnly = filteredTransactions.filter(t => t.type !== 'income');
    
    const grouped = expenseOnly.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amountAUD;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort highest expense first
  }, [filteredTransactions]);

  const totalExpenseInPeriod = categoryData.reduce((sum, item) => sum + item.value, 0);

  // 4. Drill-down Data: Group by Item Name for a specific category
  const itemizedData = useMemo(() => {
    if (!detailCategory) return [];

    const relevantTransactions = filteredTransactions.filter(t => t.category === detailCategory);
    
    // Map to store aggregated item prices
    const itemMap = new Map<string, number>();
    let manualEntryTotal = 0;

    relevantTransactions.forEach(t => {
      if (t.items && t.items.length > 0) {
        // Calculate sum of items to verify against total
        let itemsSum = 0;
        t.items.forEach(item => {
           // Simple normalization: lowercase and trim
           const name = item.name.trim(); 
           itemMap.set(name, (itemMap.get(name) || 0) + item.price);
           itemsSum += item.price;
        });
        
        // If there's a discrepancy (e.g. tip, or items didn't match total), add to "Other"
        // But usually we just trust items for the breakdown. 
        // A safer bet is: if (t.amountAUD > itemsSum), add remainder to manual.
        if (t.amountAUD > itemsSum + 0.1) {
           manualEntryTotal += (t.amountAUD - itemsSum);
        }
      } else {
        // No items found (manual entry), add full amount to manual bucket
        manualEntryTotal += t.amountAUD;
      }
    });

    const results = Array.from(itemMap.entries()).map(([name, value]) => ({ name, value }));
    
    if (manualEntryTotal > 0.01) {
      results.push({ name: '未分類/手動輸入', value: manualEntryTotal });
    }

    // Sort by value desc
    return results.sort((a, b) => b.value - a.value);

  }, [filteredTransactions, detailCategory]);

  const totalItemizedExpense = itemizedData.reduce((sum, item) => sum + item.value, 0);

  // Available months for dropdown
  const availableMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Colors for items (generated dynamically since items are unknown)
  const getItemColor = (index: number) => {
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];
    return palette[index % palette.length];
  };

  const handleClose = () => {
    setDetailCategory(null);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={handleClose} />
      
      <div className="relative w-full max-w-4xl bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-oz-600" /> 財務分析中心
            </h2>
            <p className="text-xs text-slate-400">Financial Analytics</p>
          </div>
          <button onClick={handleClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Tabs - Only show when not drilling down */}
        {!detailCategory && (
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex gap-2 flex-shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('trend')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'trend' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <TrendingUp size={16} /> 收支趨勢 Trends
            </button>
            <button
              onClick={() => setActiveTab('category')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'category' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <PieChart size={16} /> 消費組成 Breakdown
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* View 1: Trend Charts */}
          {activeTab === 'trend' && !detailCategory && (
            <>
              {/* Monthly Income vs Expense Bar Chart */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <span className="w-1 h-4 bg-oz-500 rounded-full"></span>
                  每月收支對比 (Income vs Expense)
                </h3>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}/>
                      <Bar dataKey="Income" name="收入" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="Expense" name="支出" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Net Savings Area Chart */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <span className="w-1 h-4 bg-gold-500 rounded-full"></span>
                  淨資產成長 (Net Savings)
                </h3>
                <div className="h-48 sm:h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Area type="monotone" dataKey="Net" name="淨結餘" stroke="#ca8a04" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* View 2: Category Breakdown (With Drill-down logic) */}
          {activeTab === 'category' && (
            <div className="flex flex-col h-full">
              
              {/* Controls (Month Filter) - Hide if drilling down */}
              {!detailCategory && (
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                    <div className="md:w-1/3 space-y-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">選擇月份</label>
                            <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                            <select 
                                value={selectedMonth} 
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-oz-500"
                            >
                                <option value="all">所有時間 (All Time)</option>
                                {availableMonths.map(m => (
                                <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">總支出 Total Expense</h4>
                            <p className="text-2xl font-bold text-slate-800">${totalExpenseInPeriod.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Category Chart */}
                    <div className="md:w-2/3 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
                         {/* Chart */}
                        <div className="h-64 w-full">
                            {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                    onClick={(data) => setDetailCategory(data.name)}
                                    className="cursor-pointer outline-none"
                                >
                                    {categoryData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={CATEGORY_COLORS[entry.name as Category] || '#94a3b8'} 
                                        strokeWidth={0}
                                    />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value: number) => [`$${value}`, 'AUD']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                </RePieChart>
                            </ResponsiveContainer>
                            ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">此區間無支出記錄</div>
                            )}
                        </div>
                        
                        <p className="text-xs text-slate-400 mt-2 mb-4 flex items-center gap-1">
                            <AlertCircle size={12}/> 點擊圓餅圖或下方列表查看單品細項
                        </p>

                        {/* Top Categories List */}
                        <div className="w-full space-y-3">
                            {categoryData.slice(0, 10).map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setDetailCategory(item.name)}
                                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer rounded-xl transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] || '#94a3b8' }}></div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-oz-600 transition-colors">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold text-slate-800">${item.value.toLocaleString()}</span>
                                    <span className="text-xs text-slate-400 w-10 text-right">
                                    {Math.round((item.value / totalExpenseInPeriod) * 100)}%
                                    </span>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                </div>
              )}

              {/* Drill Down View: Item Breakdown */}
              {detailCategory && (
                <div className="animate-in slide-in-from-right-10 duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <button 
                            onClick={() => setDetailCategory(null)}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} className="text-slate-600" />
                        </button>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{detailCategory} 細項分析</h3>
                            <p className="text-xs text-slate-500">
                                {selectedMonth === 'all' ? '所有時間' : selectedMonth} • 共 ${totalItemizedExpense.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Item Chart */}
                        <div className="md:w-1/2 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                             <h4 className="text-sm font-bold text-slate-500 mb-4 text-center">單品費用佔比 (Top 10)</h4>
                             <div className="h-64 w-full">
                                {itemizedData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={itemizedData.slice(0, 10)} // Show top 10 only in chart to avoid clutter
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {itemizedData.slice(0, 10).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getItemColor(index)} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'AUD']}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <Receipt size={32} className="opacity-20"/>
                                        <span className="text-sm">此類別尚無單品明細數據</span>
                                        <span className="text-[10px]">請使用「拍照記帳」功能以上傳收據明細</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Item List */}
                        <div className="md:w-1/2 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex-1">
                            <h4 className="text-sm font-bold text-slate-500 mb-4">明細列表 ({itemizedData.length} 項)</h4>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {itemizedData.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-10">無資料</p>
                                ) : (
                                    itemizedData.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: getItemColor(idx) }}></div>
                                                <span className="text-sm font-medium text-slate-700 capitalize truncate">{item.name}</span>
                                            </div>
                                            <div className="flex-shrink-0 text-right">
                                                <div className="text-sm font-bold text-slate-800">${item.value.toFixed(2)}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {((item.value / totalItemizedExpense) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
    