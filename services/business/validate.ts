import { ValidationResult } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateMember(normalized: any): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  if (!normalized.name || String(normalized.name).trim() === '') {
    results.push({ field: 'name', message: 'Name is required.', severity: 'error', passed: false });
  }

  if (!normalized.contact_no) {
    results.push({ field: 'contact_no', message: 'Contact No is required.', severity: 'error', passed: false });
  } else if (String(normalized.contact_no).length !== 10) {
    results.push({ field: 'contact_no', message: 'Contact number must contain exactly 10 digits.', severity: 'error', passed: false });
  }

  if (normalized.plan_duration !== undefined && String(normalized.plan_duration).trim() === '') {
    results.push({ field: 'plan_duration', message: 'Plan duration must not be empty.', severity: 'error', passed: false });
  }

  if (normalized.price !== undefined && String(normalized.price).trim() !== '') {
    if (isNaN(Number(normalized.price))) {
      results.push({ field: 'price', message: 'Price must be numeric.', severity: 'error', passed: false });
    }
  }

  return results;
}
