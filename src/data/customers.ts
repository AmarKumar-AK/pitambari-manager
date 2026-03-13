import { CLOTH_NUMBERS } from '../constants';

export interface CustomerRates {
  /** Coloring cost per meter (₹) for this cloth number */
  coloringCostPerUnit: number;
}

export interface Customer {
  /** Full display name */
  name: string;
  /** Short abbreviation used in reports */
  shortForm: string;
  /** Per-cloth-number pricing — keys match CLOTH_NUMBERS */
  rates: Record<string, CustomerRates>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Add your customers here.
// Keys in `rates` must be values from CLOTH_NUMBERS: '000','00','0','1','2','3','4'
// ─────────────────────────────────────────────────────────────────────────────

export const CUSTOMERS: Customer[] = [
  {
    name: 'मो. सलाम मिस्त्री',
    shortForm: 'MS',
    rates: {
      '000': { coloringCostPerUnit: 0 },
      '00':  { coloringCostPerUnit: 0 },
      '0':   { coloringCostPerUnit: 0 },
      '1':   { coloringCostPerUnit: 0 },
      '2':   { coloringCostPerUnit: 0 },
      '3':   { coloringCostPerUnit: 0 },
      '4':   { coloringCostPerUnit: 0 },
    },
  },
  {
    name: 'नन्दकिशोर कुमार',
    shortForm: 'NK',
    rates: {
      '000': { coloringCostPerUnit: 0 },
      '00':  { coloringCostPerUnit: 0 },
      '0':   { coloringCostPerUnit: 0 },
      '1':   { coloringCostPerUnit: 0 },
      '2':   { coloringCostPerUnit: 0 },
      '3':   { coloringCostPerUnit: 0 },
      '4':   { coloringCostPerUnit: 0 },
    },
  },
  {
    name: 'नोखलाल प्रसाद',
    shortForm: 'NLP',
    rates: {
      '000': { coloringCostPerUnit: 0 },
      '00':  { coloringCostPerUnit: 0 },
      '0':   { coloringCostPerUnit: 0 },
      '1':   { coloringCostPerUnit: 0 },
      '2':   { coloringCostPerUnit: 0 },
      '3':   { coloringCostPerUnit: 0 },
      '4':   { coloringCostPerUnit: 0 },
    },
  },
];

/** Convenience lookup: customer name → Customer */
export const CUSTOMER_MAP: Record<string, Customer> = Object.fromEntries(
  CUSTOMERS.map((c) => [c.name, c])
);
