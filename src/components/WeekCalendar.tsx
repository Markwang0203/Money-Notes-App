
import React, { useMemo } from 'react';
import { Transaction } from '../types';

interface WeekCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  transactions: Transaction[];
}

const WeekCalendar: React.FC<WeekCalendarProps> = ({ selectedDate, onSelectDate, transactions }) => {
  const today = new Date();
  
  // Generate current week (Mon-Sun)
  const weekDates = useMemo(() => {
    const curr = new Date();
    // Adjust to get Monday (1) as start. 
    // If today is Sunday (0), day is 0. (0 + 6) % 7 = 6 (Sat) -> logic needs tweak for JS 
    // Standard JS: Sun=0, Mon=1...
    const day = curr.getDay(); 
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    
    const monday = new Date(curr.setDate(diff));
    const week = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push(d);
    }
    return week;
  }, []);

  // Check which dates have transactions
  const hasDataMap = useMemo(() => {
    const map = new Set<string>();
    transactions.forEach(t => map.add(t.date));
    return map;
  }, [transactions]);

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
  const formatDayName = (date: Date) => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[date.getDay()];
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-white/40 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-slate-700">本週概況</h3>
        {selectedDate && (
          <button 
            onClick={() => onSelectDate(null)}
            className="text-xs text-oz-600 font-medium bg-oz-50 px-2 py-1 rounded-full"
          >
            顯示全部
          </button>
        )}
      </div>
      <div className="flex justify-between">
        {weekDates.map((dateObj) => {
          const dateKey = formatDateKey(dateObj);
          const isSelected = selectedDate === dateKey;
          const isToday = formatDateKey(today) === dateKey;
          const hasData = hasDataMap.has(dateKey);

          return (
            <button
              key={dateKey}
              onClick={() => onSelectDate(isSelected ? null : dateKey)}
              className={`flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all relative ${
                isSelected 
                  ? 'bg-slate-800 text-white shadow-md scale-105' 
                  : 'hover:bg-slate-100 text-slate-500'
              } ${isToday && !isSelected ? 'text-oz-600 font-bold bg-oz-50' : ''}`}
            >
              <span className="text-[10px] mb-0.5">{formatDayName(dateObj)}</span>
              <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-oz-600' : ''}`}>
                {dateObj.getDate()}
              </span>
              
              {/* Dot indicator for transactions */}
              {hasData && (
                <span className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-oz-400' : 'bg-slate-300'}`}></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeekCalendar;
