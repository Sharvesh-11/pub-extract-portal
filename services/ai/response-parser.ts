export interface StandardExtraction {
  documentType: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
  warnings: string[];
  rawText: string;
}

export function parseResponse(rawText: string): StandardExtraction {
  const warnings: string[] = [];
  let cleanedText = rawText;
  let parsedJson = null;

  // 1. Remove markdown fences
  cleanedText = cleanedText.replace(/^```(json)?\n?/i, '').replace(/```$/i, '').trim();

  // 2. Extract JSON
  try {
    parsedJson = JSON.parse(cleanedText);
  } catch (error) {
    warnings.push("Initial JSON parse failed. Attempting basic repair.");
    // Attempt basic repair: if the model forgot brackets for a single object, wrap it
    if (cleanedText.trim().startsWith('{') && cleanedText.trim().endsWith('}')) {
      try {
        parsedJson = JSON.parse(`[${cleanedText}]`);
      } catch (innerError) {
        throw new Error(`Failed to parse AI response: ${rawText}`);
      }
    } else {
       throw new Error(`Failed to parse AI response: ${rawText}`);
    }
  }

  // Ensure it's an array for standard extraction
  let members = [];
  if (Array.isArray(parsedJson)) {
    members = parsedJson;
  } else if (typeof parsedJson === 'object' && parsedJson !== null) {
    // If it returned an object that looks like it has a records/members array
    if (Array.isArray(parsedJson.members)) members = parsedJson.members;
    else if (Array.isArray(parsedJson.records)) members = parsedJson.records;
    else members = [parsedJson]; // wrap in array
  } else {
    throw new Error("AI returned invalid JSON structure (not an array or object).");
  }

  // Ensure confidence is attached and parsed
  members = members.map((m: any) => {
    let conf = 100; // Default if completely missing
    if (m.confidence !== undefined) {
      conf = Number(m.confidence);
      if (isNaN(conf)) conf = 100;
      if (conf < 0) conf = 0;
      if (conf > 100) conf = 100;
    }
    m.confidence = conf;
    return m;
  });

  return {
    documentType: "Gym Payment Receipt",
    members,
    warnings,
    rawText
  };
}
