export type ExtractionProfile = 'Gym Member Registration' | 'Generic';

export function buildPrompt(profile: ExtractionProfile): string {
  if (profile === 'Gym Member Registration') {
    return `Extract gym member registration data from this image.
Return ONLY a JSON array containing objects (do NOT use markdown fences like \`\`\`json, just return raw JSON).
Each object must have exactly these keys:
- name
- phoneNumber
- email
- gender
- dateOfBirth
- address
- membershipPlan
- duration
- price
- joinDate
- confidence (number 0-100, based on field completeness and legibility/clarity of the source text for this member)

Use an empty string "" for any blank or illegible fields. Preserve exact text as written.`;
  }
  
  // Default fallback
  return `Extract all structured data from this image into a JSON array of objects.
Return ONLY a JSON array containing objects (do NOT use markdown fences).`;
}
