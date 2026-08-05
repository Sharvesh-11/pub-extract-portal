import { ExtractedMember } from '@/types';

export function resolveMembers(stagedMembers: ExtractedMember[]): { members: ExtractedMember[], mergedCount: number } {
  let mergedCount = 0;
  const finalMap = new Map<string, ExtractedMember>();

  for (const m of stagedMembers) {
    const phone = m.normalizedData?.phoneNumber;
    const email = m.normalizedData?.email;
    
    // Grouping identifier. Phone takes priority, then email. If neither, don't group.
    const key = phone ? `phone_${phone}` : email ? `email_${email}` : `unmergable_${m.id}`;
    
    if (finalMap.has(key)) {
      mergedCount++;
      const existing = finalMap.get(key)!;
      
      const existingDate = new Date(existing.normalizedData.joinDate).getTime();
      const newDate = new Date(m.normalizedData.joinDate).getTime();
      
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
