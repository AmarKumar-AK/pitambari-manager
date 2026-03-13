export interface ClothEntry {
  id: number;
  clothNumber: string;
  customerName: string;
  sentBy: string;
  receivedDate: string;
  clothLength: number;
  clothCostPerUnit: number;
  coloringCostPerUnit: number;
  clothTotal: number;
  coloringTotal: number;
  totalCost: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type NewClothEntry = Omit<ClothEntry, 'id' | 'createdAt' | 'updatedAt'>;

export interface Customer {
  name: string;
  phone: string;
  totalAmount: number;
  totalLength: number;
  totalEntries: number;
}

export interface DashboardStats {
  totalLengthToday: number;
  totalEntriesToday: number;
  totalLength: number;
  totalEarnings: number;
  totalEntries: number;
}

export interface BillData {
  customerName: string;
  receivedDate: string;
  entries: ClothEntry[];
  grandTotal: number;
  totalLength: number;
  billDate: string;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalEntries: number;
  totalLength: number;
  totalAmount: number;
  customerCount: number;
}

export type ThemeMode = 'light' | 'dark';
