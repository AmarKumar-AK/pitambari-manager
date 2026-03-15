import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BillData } from '../types';
import { formatDisplayDate } from './dateUtils';

function buildBillHTML(bill: BillData): string {
  // Group entries by date
  const dateMap = new Map<string, typeof bill.entries>();
  for (const e of bill.entries) {
    if (!dateMap.has(e.receivedDate)) dateMap.set(e.receivedDate, []);
    dateMap.get(e.receivedDate)!.push(e);
  }
  const sortedDates = [...dateMap.keys()].sort();

  const dateSections = sortedDates.map(date => {
    const dateEntries = dateMap.get(date)!;
    const dateLength = dateEntries.reduce((s, e) => s + e.clothLength, 0);
    const dateColoring = dateEntries.reduce((s, e) => s + e.coloringTotal, 0);
    // Collect unique non-empty bill numbers for this date
    const billNums = [...new Set(dateEntries.map(e => e.billNumber).filter(Boolean))];
    const billLabel = billNums.length > 0 ? ` &nbsp;·&nbsp; Bill #${billNums.join(', #')}` : '';
    const rows = dateEntries.map((entry, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="text-align:center;font-weight:700">${entry.clothNumber}</td>
        <td style="text-align:right">${entry.clothLength.toFixed(2)} चौका</td>
        <td style="text-align:right">₹${entry.coloringCostPerUnit.toFixed(2)}</td>
        <td style="text-align:right">₹${entry.coloringTotal.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;color:#4F46E5">₹${entry.coloringTotal.toFixed(2)}</td>
      </tr>`).join('');
    return `
    <div class="date-section">
      <div class="date-header">${formatDisplayDate(date)}${billLabel}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align:center">Cloth No.</th>
            <th style="text-align:right">लंबाई (चौका)</th>
            <th style="text-align:right">Color Rate</th>
            <th style="text-align:right">Color Amount</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="subtotal-row">
            <td colspan="2">Subtotal</td>
            <td style="text-align:right">${dateLength.toFixed(2)} चौका</td>
            <td colspan="2"></td>
            <td style="text-align:right;color:#6366F1">₹${dateColoring.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloth Bill</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      padding: 24px;
      color: #1E293B;
      font-size: 13px;
    }
    .header {
      text-align: center;
      padding-bottom: 16px;
      border-bottom: 3px solid #4F46E5;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 26px; color: #4F46E5; letter-spacing: -0.5px; }
    .header p  { color: #64748B; font-size: 13px; margin-top: 4px; }

    .bill-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 16px;
    }
    .meta-box {
      flex: 1;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .meta-label { font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-value { font-size: 15px; font-weight: 700; color: #1E293B; margin-top: 3px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    th {
      background: #4F46E5;
      color: #fff;
      padding: 9px 8px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
    }
    td { padding: 9px 8px; border-bottom: 1px solid #F1F5F9; }
    tr:nth-child(even) td { background: #F8FAFC; }
    tr:last-child td { border-bottom: none; }

    .summary-row td {
      background: #EEF2FF !important;
      font-weight: 700;
      font-size: 13px;
      border-top: 2px solid #4F46E5;
    }

    .date-section { margin-bottom: 24px; }
    .date-header {
      background: #EEF2FF;
      color: #4F46E5;
      font-size: 13px;
      font-weight: 700;
      padding: 7px 10px;
      border-radius: 6px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subtotal-row td {
      background: #F0FDF4 !important;
      font-weight: 700;
      font-size: 12px;
      border-top: 1.5px solid #22C55E;
    }

    .grand-total {
      margin-top: 20px;
      text-align: right;
      padding: 16px;
      background: #4F46E5;
      border-radius: 10px;
      color: #fff;
    }
    .grand-total .label { font-size: 13px; opacity: 0.85; }
    .grand-total .amount { font-size: 26px; font-weight: 800; margin-top: 4px; }

    .footer {
      margin-top: 28px;
      text-align: center;
      color: #94A3B8;
      font-size: 11px;
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>&#x1F9F5; गुड्डू पप्पु</h1>
    <p>पितांबरी रंगाई — Bill / Receipt</p>
  </div>

  <div class="bill-meta">
    <div class="meta-box">
      <div class="meta-label">Customer</div>
      <div class="meta-value">${bill.customerName}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Date of Cloth</div>
      <div class="meta-value">${bill.dateLabel ?? formatDisplayDate(bill.receivedDate)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-label">Bill Generated</div>
      <div class="meta-value">${formatDisplayDate(bill.billDate)}</div>
    </div>
  </div>

  ${dateSections}

  <div class="grand-total">
    <div class="label">Grand Total Payable</div>
    <div class="amount">₹${bill.grandTotal.toFixed(2)}</div>
  </div>

  <div class="footer">
    <p>Generated by गुड्डू पप्पु &bull; ${new Date().toLocaleDateString('en-IN')} &bull; Thank you!</p>
  </div>
</body>
</html>`;
}

export async function generateAndSharePDF(bill: BillData): Promise<void> {
  const html = buildBillHTML(bill);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Bill for ${bill.customerName}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

export async function printBill(bill: BillData): Promise<void> {
  const html = buildBillHTML(bill);
  await Print.printAsync({ html });
}
