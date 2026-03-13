# Kapda Manager (PMS)

A React Native / Expo app for managing cloth coloring work at home — tracking cloth entries, customer accounts (hisaab kitaab), generating bills, and exporting PDFs.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator / Android Emulator **or** the Expo Go app on a physical device

### Install & Run

```bash
# Install dependencies
npm install

# Start the dev server
npm start

# Run on iOS (simulator)
npm run ios

# Run on Android (emulator/device)
npm run android
```

> **Note:** `expo-sqlite`, `expo-print`, `expo-sharing`, and `@react-native-community/datetimepicker` are native modules. Use a **Development Build** or **EAS Build** for the best experience. They also work in the Expo Go app.

---

## Project Structure

```
pms/
├── App.tsx                      # Entry point – SQLiteProvider + ThemeProvider + Navigation
├── app.json                     # Expo config
├── package.json
├── tsconfig.json
│
├── assets/                      # App icons & splash screen
│
└── src/
    ├── types/
    │   ├── index.ts             # ClothEntry, Customer, BillData, etc.
    │   └── navigation.ts        # RootStackParamList
    │
    ├── constants/
    │   └── index.ts             # CLOTH_NUMBERS, COLORS (light/dark)
    │
    ├── context/
    │   └── ThemeContext.tsx     # Light/dark mode toggle
    │
    ├── database/
    │   ├── schema.ts            # SQLite table creation & indexes
    │   └── queries.ts           # useClothQueries() hook – all DB operations
    │
    ├── navigation/
    │   └── AppNavigator.tsx     # Root stack + Bottom tab navigator
    │
    ├── components/
    │   ├── StatsCard.tsx        # Dashboard stat tile
    │   ├── ClothCard.tsx        # Cloth entry row card
    │   ├── SearchBar.tsx        # Reusable search input
    │   └── EmptyState.tsx       # Empty list placeholder
    │
    ├── screens/
    │   ├── DashboardScreen.tsx       # Today's stats + recent entries
    │   ├── AddClothEntryScreen.tsx   # Add / Edit cloth entry form
    │   ├── ClothListScreen.tsx       # All records with search & date filter
    │   ├── CustomersScreen.tsx       # Customer list with totals
    │   ├── CustomerLedgerScreen.tsx  # Per-customer all entries + summary
    │   ├── BillScreen.tsx            # Select customer+date → preview bill → PDF
    │   ├── ReportsScreen.tsx         # Monthly revenue reports
    │   ├── SettingsScreen.tsx        # Dark mode, backup export
    │   └── MoreScreen.tsx            # Navigation hub for extra features
    │
    └── utils/
        ├── calculations.ts      # calculateTotals(), formatCurrency()
        ├── dateUtils.ts         # formatDisplayDate(), toDBDate(), todayDB()
        ├── pdfGenerator.ts      # HTML bill template + generateAndSharePDF()
        └── backup.ts            # exportBackup() → JSON file share
```

---

## Features

| Feature | Description |
|---|---|
| **Add/Edit/Delete Entries** | Full CRUD for cloth records |
| **Cloth Number** | Dropdown: 000, 00, 0, 1, 2, 3, 4 |
| **Customer Autocomplete** | Type-ahead suggestions from existing customers |
| **Auto Calculations** | clothTotal, coloringTotal, totalCost computed in real time |
| **Dashboard** | Today's stats + recent entries at a glance |
| **Cloth List** | Searchable, filterable by date |
| **Customer Ledger** | All entries per customer + grand total summary |
| **Bill Generation** | Select customer + date → styled bill preview |
| **PDF Export & Share** | WhatsApp / email PDF via expo-sharing |
| **Monthly Reports** | Month-wise revenue breakdown with progress bars |
| **Dark Mode** | Full light/dark theme toggle |
| **Backup Export** | Export all data as JSON for safekeeping |

---

## Data Model

```typescript
ClothEntry {
  id                   // Auto-increment
  clothNumber          // "000" | "00" | "0" | "1" | "2" | "3" | "4"
  customerName         // Person who sent the cloth
  sentBy               // Delivery person (optional)
  receivedDate         // "yyyy-MM-dd"
  clothLength          // meters (decimal)
  clothCostPerUnit     // ₹ per meter
  coloringCostPerUnit  // ₹ per meter
  clothTotal           // = clothLength × clothCostPerUnit
  coloringTotal        // = clothLength × coloringCostPerUnit
  totalCost            // = clothTotal + coloringTotal
  notes                // optional
}
```

---

## Adding App Icons

Drop your icon images into the `assets/` folder:

- `icon.png` — 1024×1024 px
- `splash.png` — 1284×2778 px (or any size, `contain` resize mode)
- `adaptive-icon.png` — 1024×1024 px (Android)
- `favicon.png` — 32×32 px (web)

---

## Tech Stack

- **React Native** 0.74 + **Expo** SDK 51
- **expo-sqlite** v14 — local SQLite database
- **expo-print** + **expo-sharing** — PDF generation & sharing
- **expo-file-system** — JSON backup export
- **@react-navigation/native** — stack + bottom tab navigation
- **@react-native-community/datetimepicker** — native date picker
- **@react-native-picker/picker** — cloth number dropdown
- **date-fns** — date formatting
