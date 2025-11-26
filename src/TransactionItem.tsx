
import React from 'react';
import { Transaction, CATEGORY_COLORS, CATEGORY_ICONS, Category, IncomeCategory } from '../types';
import * as Icons from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onDelete }) => {
  // Dynamically get the icon component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iconName = CATEGORY_ICONS[transaction.category] || 'CircleEllipsis';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const IconComponent = (Icons as any)[iconName] || Icons.CircleEllipsis;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const color = CATEGORY_COLORS[transaction.category] || '#64748b';

  const isIncome = transaction.type === 'income';
  const hasPayslipInfo = (transaction.tax && transaction.tax > 0) || (transaction.superannuation && transaction.superannuation > 0);

  return (
    <div className={`group relative flex flex-col p-4 bg-white rounded-2xl shadow-sm border mb-3 hover:shadow-md transition-all duration-200 ${isIncome ? 'border-oz-100' : 'border-slate-100'}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-offset-2 ${isIncome ? 'ring-oz-100' : 'ring-slate-50'}`}
            style={{ backgroundColor: color }}
          >
            <IconComponent size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">{transaction.category}</h4>
            <p className="text-xs text-slate-400">{transaction.note || transaction.date}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-bold text-lg ${isIncome ? 'text-oz-600' : 'text-slate-900'}`}>
            {isIncome ? '+' : ''}${transaction.amountAUD.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block">
            ≈ NT$ {Math.round(transaction.amountTWD).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Payslip details row */}
      {hasPayslipInfo && (
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-3 text-xs">
          {transaction.tax && transaction.tax > 0 && (
             <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded-md font-medium">
               Tax: ${transaction.tax}
             </span>
          )}
          {transaction.superannuation && transaction.superannuation > 0 && (
             <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-medium">
               Super: ${transaction.superannuation}
             </span>
          )}
        </div>
      )}

      <button 
        onClick={() => onDelete(transaction.id)}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity p-2"
        aria-label="Delete"
      >
        <Icons.Trash2 size={16} />
      </button>
    </div>
  );
};

export default TransactionItem;
