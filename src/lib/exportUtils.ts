/**
 * Export utilities for CSV and PDF generation
 */

export function downloadCSV(rows: Record<string, any>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => headers.map(h => {
      const val = row[h] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(';') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(';'))
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}.csv`);
}

export function downloadPDF(title: string, headers: string[], rows: string[][], filename: string) {
  // Generate a simple HTML-based printable PDF
  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:11px;">${cell}</td>`).join('')}</tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 30px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 600; }
        tr:nth-child(even) { background: #fafafa; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="subtitle">Exporterad ${new Date().toLocaleDateString('sv-SE')} · Odlingsdagboken</p>
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
