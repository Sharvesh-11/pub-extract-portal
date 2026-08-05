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
      fullName: normalizedRow.name || normalizedRow.fullname || normalizedRow.membername || null,
      phone: normalizedRow.phone || normalizedRow.contact || normalizedRow.mobile || null,
      email: normalizedRow.email || normalizedRow.emailaddress || null,
      gender: normalizedRow.gender || normalizedRow.sex || null,
      dob: normalizedRow.dob || normalizedRow.dateofbirth || null,
      address: normalizedRow.address || normalizedRow.location || null,
      joinDate: normalizedRow.joindate || normalizedRow.dateofjoining || normalizedRow.startdate || null,
      plan: {
        name: normalizedRow.plan || normalizedRow.membership || normalizedRow.planname || null,
        duration: normalizedRow.duration || normalizedRow.planduration || null,
        price: normalizedRow.price || normalizedRow.amount || normalizedRow.fee || null,
      },
      confidence: 100, // Structured data is always 100% confident
      warnings: []
    };
  });
}
