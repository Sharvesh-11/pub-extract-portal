export type ExtractionProfile = 'Gym Payment Receipt' | 'Generic';

export function buildPrompt(profile: ExtractionProfile): string {
  if (profile === 'Gym Payment Receipt') {
      return `Extract gym payment receipt data from this image.
Return ONLY a JSON array containing objects (do NOT use markdown fences like \`\`\`json, just return raw JSON).
Each object must have exactly these keys:
- name
- contact_no
- price
- date
- plan_duration

Use an empty string "" for any blank or illegible fields. Preserve exact text as written.`;
  }
  
  // Default fallback
  return `Extract all structured data from this image into a JSON array of objects.
Return ONLY a JSON array containing objects (do NOT use markdown fences).`;
}
