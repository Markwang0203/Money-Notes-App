
import { GoogleGenAI } from "@google/genai";
import { Transaction, Category, IncomeCategory, TransactionType, ReceiptItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFinancialInsight = async (transactions: Transaction[], exchangeRate: number): Promise<string> => {
  if (transactions.length === 0) {
    return "目前沒有足夠的交易資料進行分析。";
  }

  // Calculate basics (Handle legacy data where type might be undefined, default to expense)
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amountAUD, 0);
    
  const totalExpense = transactions
    .filter(t => t.type !== 'income') // Treats 'expense' and undefined as expense
    .reduce((sum, t) => sum + t.amountAUD, 0);
    
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((net / totalIncome) * 100).toFixed(1) : '0';

  // Prepare a lightweight summary for the AI
  const recentTransactions = transactions.slice(0, 30).map(t => 
    `- ${t.date} [${t.type === 'income' ? '收入' : '支出'}]: $${t.amountAUD.toFixed(2)} (${t.category}) - ${t.note}`
  ).join('\n');

  const prompt = `
    你是一位專業的澳洲理財顧問。請根據以下用戶的財務記錄（澳幣 AUD）進行分析。
    
    財務概況:
    - 總收入: $${totalIncome.toFixed(2)}
    - 總支出: $${totalExpense.toFixed(2)}
    - 淨結餘: $${net.toFixed(2)}
    - 儲蓄率: ${savingsRate}%
    - 目前匯率: 1 AUD = ${exchangeRate} TWD
    
    近期交易記錄 (部分):
    ${recentTransactions}
    
    請用繁體中文提供：
    1. **收支分析**: 簡評目前的現金流狀況。
    2. **支出/收入洞察**: 點出值得注意的消費模式或收入狀況。
    3. **具體建議**: 給出一條具體的理財建議（例如：如何優化稅務、節省特定澳洲開銷、或投資建議）。
    
    語氣專業且充滿鼓勵，字數控制在 200 字以內。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "無法產生分析結果。";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "AI 分析暫時無法使用，請稍後再試。";
  }
};

export interface ReceiptData {
  amount: number;
  category: string;
  date: string;
  merchant: string;
  items: ReceiptItem[];
  tax?: number;
  superannuation?: number;
}

export const analyzeDocumentImage = async (base64Data: string, activeTab: TransactionType, mimeType: string = 'image/jpeg'): Promise<ReceiptData | null> => {
  const expenseCategories = Object.values(Category).join(', ');
  const incomeCategories = Object.values(IncomeCategory).join(', ');
  
  const targetCategories = activeTab === 'income' ? incomeCategories : expenseCategories;
  const docType = activeTab === 'income' ? "Payslip, Bank Statement, or Invoice" : "Receipt, Tax Invoice, or Bill";
  const contextHint = activeTab === 'income' 
    ? "Look for 'Net Pay' (this is the amount), 'PAYG Tax' or 'Withholding' (this is tax), and 'Superannuation' or 'Super' (this is superannuation)." 
    : "Look for 'Total', 'Amount Due'. Also, list individual line items if visible (e.g., Milk, Eggs).";

  const prompt = `
    Analyze this document (Image or PDF), which is a ${docType} from Australia. 
    Context: The user is adding a new ${activeTab.toUpperCase()} record. ${contextHint}

    Extract the following information in JSON format:
    1. "amount": The final transaction amount (number only). For payslips, use the Net Pay (actual money received).
    2. "date": The transaction date in ISO format (YYYY-MM-DD). If not found, use today.
    3. "merchant": The name of the merchant, employer, or payer.
    4. "category": Choose the SINGLE best fitting category from this list: [${targetCategories}].
    5. "items": An array of individual items purchased (only for expenses/receipts). Structure: { "name": "Generic Item Name", "price": number }. 
    6. "tax": (Only for Payslips/Income) The PAYG Tax Withheld amount, if visible. Number only.
    7. "superannuation": (Only for Payslips/Income) The Superannuation Guarantee contribution amount, if visible. Number only.

    IMPORTANT for "items": Normalize the name to a generic, readable English name (e.g. change "WW FC MILK" to "Full Cream Milk"). Exclude discounts or subtotals.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ReceiptData;
  } catch (error) {
    console.error("Document analysis failed:", error);
    return null;
  }
};
    