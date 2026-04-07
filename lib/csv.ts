/**
 * Convert array of objects to CSV string and trigger browser download.
 * Excel-friendly: prepends UTF-8 BOM for proper Japanese rendering.
 */
export function downloadCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!rows.length) return;

  const cols =
    columns ??
    (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ key: k, label: String(k) }));

  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = cols.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((row) => cols.map((c) => escape(row[c.key])).join(','))
    .join('\n');

  const csv = '\uFEFF' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
