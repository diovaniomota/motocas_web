export function exportToCSV<T>(
  data: T[],
  filename: string,
  columns: { key: keyof T; label: string }[],
): void {
  const header = columns.map((c) => c.label).join(';')
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key]
        if (val == null) return ''
        const str = String(val)
        return str.includes(';') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
      .join(';'),
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
