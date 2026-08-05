import { ValidationResult } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateMember(normalized: any): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  if (!normalized.name || String(normalized.name).trim() === '') {
    results.push({ field: 'name', message: 'Name is required.', severity: 'error', passed: false });
  }

  const hasPhone = !!normalized.phoneNumber;
  const hasEmail = !!normalized.email;
  
  if (!hasPhone && !hasEmail) {
    results.push({ field: 'contact', message: 'Phone OR Email is required.', severity: 'error', passed: false });
  }

  if (hasPhone && String(normalized.phoneNumber).length !== 10) {
    results.push({ field: 'phoneNumber', message: 'Phone number must contain exactly 10 digits.', severity: 'error', passed: false });
  }

  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(normalized.email))) {
      results.push({ field: 'email', message: 'Invalid email format.', severity: 'error', passed: false });
    }
  }

  if (normalized.duration !== undefined && String(normalized.duration).trim() === '') {
    results.push({ field: 'duration', message: 'Duration must not be empty.', severity: 'error', passed: false });
  }

  if (normalized.price !== undefined && String(normalized.price).trim() !== '') {
    if (isNaN(Number(normalized.price))) {
      results.push({ field: 'price', message: 'Price must be numeric.', severity: 'error', passed: false });
    }
  }

  return results;
}
