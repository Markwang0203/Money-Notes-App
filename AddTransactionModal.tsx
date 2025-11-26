
import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Camera, Loader2, ListPlus, Banknote, Coins } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Category, IncomeCategory, CATEGORY_ICONS, CATEGORY_COLORS, TransactionType, ReceiptItem } from '../types';
import { analyzeDocumentImage } from '../services/geminiService';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (amount: number, category: string, note: string, date: string, type: TransactionType, items?: ReceiptItem[], tax?: number, superannuation?: number) => void;
  exchangeRate: number;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAdd, exchangeRate }) => {
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(Category.GROCERIES);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  
  // New fields for Payslip
  const [tax, setTax] = useState('');
  const [superannuation, setSuperannuation] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setCategory(activeTab === 'expense' ? Category.GROCERIES : IncomeCategory.SALARY_FULL);
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
      setItems([]);
      setTax('');
      setSuperannuation('');
      setIsAnalyzing(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numTax = tax ? parseFloat(tax) : undefined;
    const numSuper = superannuation ? parseFloat(superannuation) : undefined;

    if (!isNaN(numAmount) && numAmount > 0) {
      onAdd(numAmount, category, note, date, activeTab, items, numTax, numSuper);
      onClose();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type (image or pdf)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('請上傳圖片 (JPG/PNG) 或 PDF 文件');
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64," or "data:application/pdf;base64,")
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        try {
          const data = await analyzeDocumentImage(base64String, activeTab, mimeType);
          if (data) {
            setAmount(data.amount.toString());
            setCategory(data.category);
            setNote(data.merchant);
            setDate(data.date);
            if (data.items && data.items.length > 0) {
              setItems(data.items);
            }
            // Populate Payslip info
            if (data.tax) setTax(data.tax.toString());
            if (data.superannuation) setSuperannuation(data.superannuation.toString());
          }
        } catch (err) {
          console.error("Failed to analyze document", err);
          alert("無法辨識文件，請手動輸入。");
        } finally {
          setIsAnalyzing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
    } catch (err) {
      setIsAnalyzing(false);
    }
  };

  const calculatedTWD = amount ? (parseFloat(amount) * exchangeRate).toFixed(0) : '0';
  const categoryList = activeTab === 'expense' ? Object.values(Category) : Object.values(IncomeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl transform transition-all p-6 animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[95vh] flex flex-col">
        
        {/* Header & Tabs */}
        <div className="flex flex-col gap-4 mb-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
               {activeTab === 'expense' ? '新增消費' : '新增收入'}
            </h2>
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
              <X size={20} className="text-slate-600" />
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
                type="button"
                onClick={() => setActiveTab('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                支出 Expense
             </button>
             <button 
                type="button"
                onClick={() => setActiveTab('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-white text-oz-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                收入 Income
             </button>
          </div>
        </div>

        {/* Camera/Upload Button */}
        <div className="absolute top-6 right-14">
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className={`p-2 rounded-full transition-colors border flex items-center gap-1 px-3 disabled:opacity-50 ${activeTab === 'income' ? 'bg-oz-50 text-oz-600 border-oz-200 hover:bg-oz-100' : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'}`}
            >
               {isAnalyzing ? (
                 <Loader2 size={18} className="animate-spin" />
               ) : (
                 <Camera size={18} />
               )}
               <span className="text-xs font-bold hidden sm:inline">
                 {isAnalyzing ? '分析中...' : (activeTab === 'income' ? '上傳薪資單' : '拍收據')}
               </span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf" 
              onChange={handleFileChange}
            />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto no-scrollbar space-y-5 pb-2">
          {/* Amount Input */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">
              {activeTab === 'income' ? '實領金額 (Net Pay AUD)' : '金額 (AUD)'}
            </label>
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                    <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 text-3xl font-bold bg-slate-50 rounded-2xl focus:outline-none focus:ring-2 transition-all placeholder:text-slate-200 ${activeTab === 'income' ? 'text-oz-600 focus:ring-oz-500' : 'text-slate-800 focus:ring-slate-400'}`}
                        placeholder="0.00"
                        autoFocus={!isAnalyzing}
                    />
                </div>
                <div className="flex flex-col items-center justify-center h-full px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 min-w-[100px]">
                    <span className="text-xs text-slate-500 font-semibold mb-1">約台幣</span>
                    <span className="text-lg font-bold text-slate-700">NT${parseInt(calculatedTWD).toLocaleString()}</span>
                </div>
            </div>
            {items.length > 0 && activeTab === 'expense' && (
                <div className="mt-2 ml-1 text-xs text-emerald-600 flex items-center gap-1">
                  <ListPlus size={14} /> 已自動識別 {items.length} 項商品
                </div>
            )}
          </div>

          {/* Payslip Specific Fields */}
          {activeTab === 'income' && (
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1 flex items-center gap-1">
                     <Banknote size={12} /> 預扣稅 (Tax)
                  </label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-medium focus:outline-none focus:ring-2 focus:ring-rose-200"
                      />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1 flex items-center gap-1">
                     <Coins size={12} /> 退休金 (Super)
                  </label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input 
                        type="number"
                        step="0.01"
                        value={superannuation}
                        onChange={(e) => setSuperannuation(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                  </div>
               </div>
             </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">選擇類別</label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {categoryList.map((cat) => {
                 const iconName = CATEGORY_ICONS[cat];
                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
                 const IconComponent = (Icons as any)[iconName] || Icons.CircleEllipsis;
                 const isActive = category === cat;
                 const activeColor = CATEGORY_COLORS[cat];

                 return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 aspect-square sm:aspect-auto sm:h-20 ${
                        isActive 
                          ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                          : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                      style={isActive ? { backgroundColor: activeColor } : {}}
                    >
                      <IconComponent size={22} className="mb-1.5" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center break-words w-full">{cat}</span>
                    </button>
                 );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">日期</label>
                 <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-oz-500"
                 />
            </div>
             <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1">備註 / 商家</label>
                 <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={activeTab === 'expense' ? "例如：Woolworths" : "例如：ABC Pty Ltd"}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-oz-500"
                 />
            </div>
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className={`w-full py-4 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 mt-4 disabled:opacity-70 disabled:cursor-not-allowed ${activeTab === 'income' ? 'bg-oz-600 hover:bg-oz-700 shadow-oz-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
          >
            <Check size={24} />
            {activeTab === 'income' ? '確認收入' : '確認支出'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
