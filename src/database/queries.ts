import { useSQLiteContext } from 'expo-sqlite';
import { ClothEntry, Customer, DashboardStats, MonthlyReport, NewClothEntry } from '../types';
import { format } from 'date-fns';

// Raw DB row types (snake_case)
type RawClothEntry = {
  id: number;
  cloth_number: string;
  customer_name: string;
  sent_by: string;
  received_date: string;
  cloth_length: number;
  cloth_cost_per_unit: number;
  coloring_cost_per_unit: number;
  cloth_total: number;
  coloring_total: number;
  total_cost: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

type RawCustomer = {
  name: string;
  phone: string;
  total_amount: number;
  total_length: number;
  total_entries: number;
};

function mapEntry(raw: RawClothEntry): ClothEntry {
  return {
    id: raw.id,
    clothNumber: raw.cloth_number,
    customerName: raw.customer_name,
    sentBy: raw.sent_by ?? '',
    receivedDate: raw.received_date,
    clothLength: raw.cloth_length,
    clothCostPerUnit: raw.cloth_cost_per_unit,
    coloringCostPerUnit: raw.coloring_cost_per_unit,
    clothTotal: raw.cloth_total,
    coloringTotal: raw.coloring_total,
    totalCost: raw.total_cost,
    notes: raw.notes ?? '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function useClothQueries() {
  const db = useSQLiteContext();

  // ── CREATE ──────────────────────────────────────────────────────────────────

  const addClothEntry = async (entry: NewClothEntry): Promise<number> => {
    const result = await db.runAsync(
      `INSERT INTO cloth_entries
         (cloth_number, customer_name, sent_by, received_date,
          cloth_length, cloth_cost_per_unit, coloring_cost_per_unit,
          cloth_total, coloring_total, total_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.clothNumber,
        entry.customerName.trim(),
        entry.sentBy.trim(),
        entry.receivedDate,
        entry.clothLength,
        entry.clothCostPerUnit,
        entry.coloringCostPerUnit,
        entry.clothTotal,
        entry.coloringTotal,
        entry.totalCost,
        entry.notes.trim(),
      ]
    );
    // Ensure customer exists in customers table
    await db.runAsync(
      `INSERT OR IGNORE INTO customers (name) VALUES (?)`,
      [entry.customerName.trim()]
    );
    return result.lastInsertRowId;
  };

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  const updateClothEntry = async (entry: ClothEntry): Promise<void> => {
    await db.runAsync(
      `UPDATE cloth_entries SET
         cloth_number = ?, customer_name = ?, sent_by = ?,
         received_date = ?, cloth_length = ?, cloth_cost_per_unit = ?,
         coloring_cost_per_unit = ?, cloth_total = ?, coloring_total = ?,
         total_cost = ?, notes = ?,
         updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [
        entry.clothNumber,
        entry.customerName.trim(),
        entry.sentBy.trim(),
        entry.receivedDate,
        entry.clothLength,
        entry.clothCostPerUnit,
        entry.coloringCostPerUnit,
        entry.clothTotal,
        entry.coloringTotal,
        entry.totalCost,
        entry.notes.trim(),
        entry.id,
      ]
    );
    await db.runAsync(
      `INSERT OR IGNORE INTO customers (name) VALUES (?)`,
      [entry.customerName.trim()]
    );
  };

  // ── DELETE ──────────────────────────────────────────────────────────────────

  const deleteClothEntry = async (id: number): Promise<void> => {
    await db.runAsync('DELETE FROM cloth_entries WHERE id = ?', [id]);
  };

  // ── READ ─────────────────────────────────────────────────────────────────────

  const getEntryById = async (id: number): Promise<ClothEntry | null> => {
    const row = await db.getFirstAsync<RawClothEntry>(
      'SELECT * FROM cloth_entries WHERE id = ?',
      [id]
    );
    return row ? mapEntry(row) : null;
  };

  const getAllEntries = async (
    search?: string,
    filterDate?: string
  ): Promise<ClothEntry[]> => {
    let query = 'SELECT * FROM cloth_entries WHERE 1=1';
    const params: (string | number)[] = [];

    if (search && search.trim()) {
      query += ' AND (customer_name LIKE ? OR sent_by LIKE ? OR cloth_number LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (filterDate && filterDate.trim()) {
      query += ' AND received_date = ?';
      params.push(filterDate.trim());
    }
    query += ' ORDER BY received_date DESC, id DESC';

    const rows = await db.getAllAsync<RawClothEntry>(query, params);
    return rows.map(mapEntry);
  };

  const getRecentEntries = async (limit = 5): Promise<ClothEntry[]> => {
    const rows = await db.getAllAsync<RawClothEntry>(
      `SELECT * FROM cloth_entries ORDER BY received_date DESC, id DESC LIMIT ?`,
      [limit]
    );
    return rows.map(mapEntry);
  };

  const getEntriesByCustomer = async (customerName: string): Promise<ClothEntry[]> => {
    const rows = await db.getAllAsync<RawClothEntry>(
      `SELECT * FROM cloth_entries
       WHERE customer_name = ?
       ORDER BY received_date DESC, id DESC`,
      [customerName]
    );
    return rows.map(mapEntry);
  };

  const getEntriesByCustomerAndDate = async (
    customerName: string,
    date: string
  ): Promise<ClothEntry[]> => {
    const rows = await db.getAllAsync<RawClothEntry>(
      `SELECT * FROM cloth_entries
       WHERE customer_name = ? AND received_date = ?
       ORDER BY id ASC`,
      [customerName, date]
    );
    return rows.map(mapEntry);
  };

  // ── STATS ─────────────────────────────────────────────────────────────────────

  const getDashboardStats = async (): Promise<DashboardStats> => {
    const today = format(new Date(), 'yyyy-MM-dd');

    const todayRow = await db.getFirstAsync<{
      total_length: number;
      total_entries: number;
    }>(
      `SELECT
         COALESCE(SUM(cloth_length), 0) as total_length,
         COUNT(*) as total_entries
       FROM cloth_entries
       WHERE received_date = ?`,
      [today]
    );

    const totalRow = await db.getFirstAsync<{
      total_earnings: number;
      total_entries: number;
      total_length: number;
    }>(
      `SELECT
         COALESCE(SUM(total_cost), 0) as total_earnings,
         COUNT(*) as total_entries,
         COALESCE(SUM(cloth_length), 0) as total_length
       FROM cloth_entries`
    );

    return {
      totalLengthToday: todayRow?.total_length ?? 0,
      totalEntriesToday: todayRow?.total_entries ?? 0,
      totalLength: totalRow?.total_length ?? 0,
      totalEarnings: totalRow?.total_earnings ?? 0,
      totalEntries: totalRow?.total_entries ?? 0,
    };
  };

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────────

  const getAllCustomers = async (): Promise<Customer[]> => {
    const rows = await db.getAllAsync<RawCustomer>(
      `SELECT
         e.customer_name AS name,
         COALESCE(c.phone, '') AS phone,
         COALESCE(SUM(e.total_cost), 0) AS total_amount,
         COALESCE(SUM(e.cloth_length), 0) AS total_length,
         COUNT(e.id) AS total_entries
       FROM cloth_entries e
       LEFT JOIN customers c ON e.customer_name = c.name
       GROUP BY e.customer_name
       ORDER BY e.customer_name ASC`
    );
    return rows.map((r) => ({
      name: r.name,
      phone: r.phone,
      totalAmount: r.total_amount,
      totalLength: r.total_length,
      totalEntries: r.total_entries,
    }));
  };

  const searchCustomerNames = async (search: string): Promise<string[]> => {
    const rows = await db.getAllAsync<{ name: string }>(
      `SELECT DISTINCT customer_name AS name
       FROM cloth_entries
       WHERE customer_name LIKE ?
       ORDER BY customer_name ASC
       LIMIT 15`,
      [`%${search}%`]
    );
    return rows.map((r) => r.name);
  };

  const getAllCustomerNames = async (): Promise<string[]> => {
    const rows = await db.getAllAsync<{ name: string }>(
      `SELECT DISTINCT customer_name AS name
       FROM cloth_entries
       ORDER BY customer_name ASC`
    );
    return rows.map((r) => r.name);
  };

  const getUniqueDatesForCustomer = async (customerName: string): Promise<string[]> => {
    const rows = await db.getAllAsync<{ received_date: string }>(
      `SELECT DISTINCT received_date
       FROM cloth_entries
       WHERE customer_name = ?
       ORDER BY received_date DESC`,
      [customerName]
    );
    return rows.map((r) => r.received_date);
  };

  // ── REPORTS ──────────────────────────────────────────────────────────────────

  const getMonthlyReports = async (): Promise<MonthlyReport[]> => {
    const rows = await db.getAllAsync<{
      year: number;
      month_name: string;
      total_entries: number;
      total_length: number;
      total_amount: number;
      customer_count: number;
    }>(
      `SELECT
         CAST(strftime('%Y', received_date) AS INTEGER) AS year,
         strftime('%Y-%m', received_date) AS month_name,
         COUNT(*) AS total_entries,
         COALESCE(SUM(cloth_length), 0) AS total_length,
         COALESCE(SUM(total_cost), 0) AS total_amount,
         COUNT(DISTINCT customer_name) AS customer_count
       FROM cloth_entries
       GROUP BY strftime('%Y-%m', received_date)
       ORDER BY received_date DESC`
    );
    return rows.map((r) => ({
      month: r.month_name,
      year: r.year,
      totalEntries: r.total_entries,
      totalLength: r.total_length,
      totalAmount: r.total_amount,
      customerCount: r.customer_count,
    }));
  };

  // ── BACKUP / RESTORE ─────────────────────────────────────────────────────────

  const getAllData = async (): Promise<ClothEntry[]> => {
    const rows = await db.getAllAsync<RawClothEntry>(
      'SELECT * FROM cloth_entries ORDER BY received_date DESC, id DESC'
    );
    return rows.map(mapEntry);
  };

  const importData = async (entries: NewClothEntry[]): Promise<void> => {
    await db.withTransactionAsync(async () => {
      for (const entry of entries) {
        await db.runAsync(
          `INSERT INTO cloth_entries
             (cloth_number, customer_name, sent_by, received_date,
              cloth_length, cloth_cost_per_unit, coloring_cost_per_unit,
              cloth_total, coloring_total, total_cost, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            entry.clothNumber,
            entry.customerName,
            entry.sentBy,
            entry.receivedDate,
            entry.clothLength,
            entry.clothCostPerUnit,
            entry.coloringCostPerUnit,
            entry.clothTotal,
            entry.coloringTotal,
            entry.totalCost,
            entry.notes,
          ]
        );
        await db.runAsync(
          'INSERT OR IGNORE INTO customers (name) VALUES (?)',
          [entry.customerName]
        );
      }
    });
  };

  return {
    addClothEntry,
    updateClothEntry,
    deleteClothEntry,
    getEntryById,
    getAllEntries,
    getRecentEntries,
    getEntriesByCustomer,
    getEntriesByCustomerAndDate,
    getDashboardStats,
    getAllCustomers,
    searchCustomerNames,
    getAllCustomerNames,
    getUniqueDatesForCustomer,
    getMonthlyReports,
    getAllData,
    importData,
  };
}
