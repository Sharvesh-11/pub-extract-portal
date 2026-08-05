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
  
  if (norm.phoneNumber) {
    norm.phoneNumber = String(norm.phoneNumber).replace(/\D/g, ''); 
  }

  if (norm.email) {
    norm.email = String(norm.email).toLowerCase().trim();
  }

  if (norm.membershipPlan || norm.plan) {
    norm.membershipPlan = String(norm.membershipPlan || norm.plan).trim().replace(/\s+/g, ' ');
    delete norm.plan;
  }

  if (norm.duration) {
    let dur = String(norm.duration).trim().replace(/\s+/g, ' ');
    dur = dur.replace(/months?/i, 'Months');
    norm.duration = dur;
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
  
  if (norm.joinDate) norm.joinDate = parseDate(norm.joinDate);
  if (norm.dateOfBirth) norm.dateOfBirth = parseDate(norm.dateOfBirth);

  return norm;
}
