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
    if (!d) return d;
    const pd = new Date(d);
    if (!isNaN(pd.getTime())) return pd.toISOString();
    return String(d).trim();
  };
  
  if (norm.date) norm.date = parseDate(norm.date);

  return norm;
}
