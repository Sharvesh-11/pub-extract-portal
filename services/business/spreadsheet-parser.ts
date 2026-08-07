import * as xlsx from 'xlsx';

export function parseSpreadsheet(buffer: Buffer): any[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  if (workbook.SheetNames.length === 0) return [];
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(firstSheet);
  
  return rows.map(row => {
    // Basic normalization of headers - lowercase and remove spaces
    const normalizedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      normalizedRow[normKey] = value;
    }

    // Map to the expected AI extraction format
    return {
      name: normalizedRow.name || normalizedRow.fullname || normalizedRow.membername || null,
      contact_no: normalizedRow.phone || normalizedRow.contact || normalizedRow.mobile || null,
      date: normalizedRow.joindate || normalizedRow.dateofjoining || normalizedRow.startdate || null,
      plan_duration: normalizedRow.duration || normalizedRow.planduration || null,
      price: normalizedRow.price || normalizedRow.amount || normalizedRow.fee || null,
      confidence: 100, // Structured data is always 100% confident
      warnings: []
    };
  });
}
