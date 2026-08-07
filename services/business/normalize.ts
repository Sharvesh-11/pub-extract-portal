// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMember(raw: any) {
  const norm = { ...raw };
  
  if (norm.name) {
    norm.name = String(norm.name)
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  
  if (norm.contact_no) {
    norm.contact_no = String(norm.contact_no).replace(/\s+/g, ''); 
  }

  if (norm.plan_duration) {
    let dur = String(norm.plan_duration).trim().replace(/\s+/g, ' ');
    dur = dur.replace(/months?/i, 'Months');
    norm.plan_duration = dur;
  }

  if (norm.price) {
    const pStr = String(norm.price).replace(/[^0-9.]/g, '');
    norm.price = pStr; 
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseDate = (d: any) => {
    if (!d) return null;
    const str = String(d).trim();
    if (!str) return null;

    // DD.MM.YY, DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    const match = str.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2}|\d{4})$/);
    if (match) {
       const day = match[1].padStart(2, '0');
       const month = match[2].padStart(2, '0');
       let year = match[3];
       if (year.length === 2) {
          year = '20' + year;
       }
       const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
       if (!isNaN(parsed.getTime())) {
          return `${year}-${month}-${day}`;
       }
    }

    // ISO 8601 or standard JS date string
    const pd = new Date(str);
    if (!isNaN(pd.getTime())) return pd.toISOString().split('T')[0];
    
    return null;
  };
  
  norm.date = parseDate(norm.date);

  return norm;
}
