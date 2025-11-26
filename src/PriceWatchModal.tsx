
import React, { useMemo, useState } from 'react';
import { X, ShoppingBag, ArrowDown, TrendingDown, Store, Search } from 'lucide-react';
import { Transaction, ReceiptItem } from '../types';

interface PriceWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

interface ItemStat {
  name: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  bestStore: string;
  lastPrice: number;
  history: { price: number; store: string; date: string }[];
}

const PriceWatchModal: React.FC<PriceWatchModalProps> = ({ isOpen, onClose, transactions }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Analyze transactions to build item statistics
  const itemStats = useMemo(() => {
    const statsMap = new Map<string, { prices: { price: number; store: string; date: string }[] }>();

    transactions.forEach(t => {
      if (t.items && t.items.length > 0) {
        t.items.forEach(item => {
          // Normalize item name slightly (lowercase, trim)
          const normalizedName = item.name.trim(); // Gemini should have already genericized it
          if (!statsMap.has(normalizedName)) {
            statsMap.set(normalizedName, { prices: [] });
          }
          statsMap.get(normalizedName)?.prices.push({
            price: item.price,
            store: t.note || 'Unknown', // Use note as merchant
            date: t.date
          });
        });
      }
    });

    const results: ItemStat[] = [];
    statsMap.forEach((data, name) => {
      if (data.prices.length > 0) {
        const sortedPrices = [...data.prices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const priceValues = data.prices.map(p => p.price);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        
        // Find store with min price (most recent if multiple)
        const bestBuy = data.prices.find(p => p.price === minPrice);
        
        results.push({
          name: name,
          minPrice,
          maxPrice,
          avgPrice,
          bestStore: bestBuy?.store || 'Unknown',
          lastPrice: sortedPrices[0].price,
          history: sortedPrices
        });
      }
    });

    return results.sort((a, b) => b.history.length - a.history.length); // Most frequent first
  }, [transactions]);

  const filteredStats = itemStats.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
               <h2 className="text-2xl font-bold flex items-center gap-2">
                 <ShoppingBag className="text-emerald-400" /> 物價觀測站
               </h2>
               <p className="text-slate-300 text-sm mt-1">
                 自動追蹤歷史收據，比價 Woolworths, Coles 等商家
               </p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="mt-6 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
               type="text" 
               placeholder="搜尋商品名稱..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder:text-slate-500"
             />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center">
              <ShoppingBag size={48} className="mb-3 opacity-20" />
              <p>尚無商品數據</p>
              <p className="text-xs mt-1">請使用「拍照記帳」功能上傳收據以開始追蹤</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredStats.map((stat, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-lg capitalize">{stat.name}</h3>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">
                       <TrendingDown size={14} /> 最低 ${stat.minPrice.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex flex-col">
                       <span className="text-xs text-slate-400">上次購入</span>
                       <span className="font-semibold text-slate-700">${stat.lastPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs text-slate-400">平均價格</span>
                       <span className="font-semibold text-slate-700">${stat.avgPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col flex-1">
                       <span className="text-xs text-slate-400">最划算商家</span>
                       <span className="font-semibold text-emerald-600 flex items-center gap-1 truncate">
                         <Store size={14} /> {stat.bestStore}
                       </span>
                    </div>
                  </div>

                  {stat.history.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-50 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                         {stat.history.slice(0, 5).map((h, i) => (
                            <div key={i} className="flex-shrink-0 text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-500">
                               {h.date.split('-').slice(1).join('/')}: <span className="font-bold text-slate-700">${h.price}</span> @ {h.store}
                            </div>
                         ))}
                      </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default PriceWatchModal;
