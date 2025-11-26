
export type TransactionType = 'expense' | 'income';

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountAUD: number;
  amountTWD: number;
  category: string;
  date: string; // ISO string
  note: string;
  items?: ReceiptItem[]; // Optional list of items from receipt
  tax?: number; // PAYG Tax for income
  superannuation?: number; // Super contribution for income
}

// --- Expense Categories ---
export enum Category {
  RENT = '房租住宿',
  GROCERIES = '超市雜貨',
  DINING = '外食咖啡',
  TRANSPORT = '大眾交通',
  CAR = '養車油資',
  ELECTRICITY = '電費',
  WATER = '水費',
  GAS = '天然氣',
  INTERNET = '家用網路',
  MOBILE = '手機通訊',
  SHOPPING = '購物治裝',
  ENTERTAINMENT = '娛樂訂閱',
  HEALTH = '醫療保險',
  EDUCATION = '教育簽證',
  LOAN = '貸款還款',
  PETS = '寵物毛孩',
  TRAVEL = '旅遊度假',
  OTHER = '其他雜項'
}

// --- Income Categories ---
export enum IncomeCategory {
  SALARY_FULL = '正職薪資',     // Full-time job
  SALARY_CASUAL = '兼職打工',   // Casual/Part-time (Uber, Hospo)
  TAX_REFUND = '年度退稅',      // Tax return
  BONUS = '獎金紅包',           // Bonus, Gifts
  INVESTMENT = '投資理財',      // Stocks, Crypto, Interest
  SECOND_HAND = '二手拍賣',     // FB Marketplace, Gumtree
  OTHER_INCOME = '其他收入'     // Other
}

// Combine for generic usage if needed
export type AnyCategory = Category | IncomeCategory;

export const CATEGORY_COLORS: Record<string, string> = {
  // Expenses
  [Category.RENT]: '#6366f1', // Indigo
  [Category.GROCERIES]: '#10b981', // Emerald
  [Category.DINING]: '#f59e0b', // Amber
  [Category.TRANSPORT]: '#3b82f6', // Blue
  [Category.CAR]: '#ef4444', // Red
  [Category.ELECTRICITY]: '#eab308', // Yellow
  [Category.WATER]: '#06b6d4', // Cyan
  [Category.GAS]: '#f97316', // Orange
  [Category.INTERNET]: '#8b5cf6', // Violet
  [Category.MOBILE]: '#d946ef', // Fuchsia
  [Category.SHOPPING]: '#ec4899', // Pink
  [Category.ENTERTAINMENT]: '#a855f7', // Purple
  [Category.HEALTH]: '#14b8a6', // Teal
  [Category.EDUCATION]: '#f59e0b', // Amber
  [Category.LOAN]: '#64748b', // Slate
  [Category.PETS]: '#a16207', // Yellow-Brown
  [Category.TRAVEL]: '#0ea5e9', // Sky
  [Category.OTHER]: '#94a3b8', // Slate Light

  // Income (Using distinctive Green/Gold/Blue themes)
  [IncomeCategory.SALARY_FULL]: '#15803d', // Strong Green
  [IncomeCategory.SALARY_CASUAL]: '#84cc16', // Lime
  [IncomeCategory.TAX_REFUND]: '#eab308', // Gold
  [IncomeCategory.BONUS]: '#f43f5e', // Rose
  [IncomeCategory.INVESTMENT]: '#0ea5e9', // Sky Blue
  [IncomeCategory.SECOND_HAND]: '#d946ef', // Fuchsia
  [IncomeCategory.OTHER_INCOME]: '#64748b', // Slate
};

export const CATEGORY_ICONS: Record<string, string> = {
  // Expenses
  [Category.RENT]: 'Home',
  [Category.GROCERIES]: 'ShoppingBasket',
  [Category.DINING]: 'Coffee',
  [Category.TRANSPORT]: 'TrainFront',
  [Category.CAR]: 'Car',
  [Category.ELECTRICITY]: 'Zap',
  [Category.WATER]: 'Droplets',
  [Category.GAS]: 'Flame',
  [Category.INTERNET]: 'Wifi',
  [Category.MOBILE]: 'Smartphone',
  [Category.SHOPPING]: 'ShoppingBag',
  [Category.ENTERTAINMENT]: 'Ticket',
  [Category.HEALTH]: 'HeartPulse',
  [Category.EDUCATION]: 'GraduationCap',
  [Category.LOAN]: 'Landmark',
  [Category.PETS]: 'PawPrint',
  [Category.TRAVEL]: 'Plane',
  [Category.OTHER]: 'CircleEllipsis',

  // Income
  [IncomeCategory.SALARY_FULL]: 'Briefcase',
  [IncomeCategory.SALARY_CASUAL]: 'Clock',
  [IncomeCategory.TAX_REFUND]: 'FileCheck',
  [IncomeCategory.BONUS]: 'Gift',
  [IncomeCategory.INVESTMENT]: 'TrendingUp',
  [IncomeCategory.SECOND_HAND]: 'Recycle',
  [IncomeCategory.OTHER_INCOME]: 'Wallet',
};

export interface DailySummary {
  date: string;
  totalAUD: number;
  totalTWD: number;
}
