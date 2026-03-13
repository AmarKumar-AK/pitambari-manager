export function calculateTotals(
  clothLength: number,
  clothCostPerUnit: number,
  coloringCostPerUnit: number
) {
  const clothTotal = clothLength * clothCostPerUnit;
  const coloringTotal = clothLength * coloringCostPerUnit;
  const totalCost = clothTotal + coloringTotal;
  return { clothTotal, coloringTotal, totalCost };
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export function parseDecimal(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}
