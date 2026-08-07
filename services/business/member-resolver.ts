import { ExtractedMember } from '@/types';

export function resolveMembers(stagedMembers: ExtractedMember[]): { members: ExtractedMember[], mergedCount: number } {
  let mergedCount = 0;
  const finalMap = new Map<string, ExtractedMember>();

  for (const m of stagedMembers) {
    const contact_no = m.normalizedData?.contact_no;
    
    // Grouping identifier. Phone takes priority. If neither, don't group.
    const key = contact_no ? `contact_no_${contact_no}` : `unmergable_${m.id}`;
    
    if (finalMap.has(key)) {
      mergedCount++;
      const existing = finalMap.get(key)!;
      
      const existingDate = existing.normalizedData.date ? new Date(existing.normalizedData.date).getTime() : 0;
      const newDate = m.normalizedData.date ? new Date(m.normalizedData.date).getTime() : 0;
      
      if (!isNaN(newDate) && (isNaN(existingDate) || newDate > existingDate)) {
        finalMap.set(key, m); // Newer replaces older
      } else if (isNaN(existingDate) && isNaN(newDate)) {
        // Keep existing (first occurrence)
      }
    } else {
      finalMap.set(key, m);
    }
  }
  
  return {
    members: Array.from(finalMap.values()),
    mergedCount
  };
}
