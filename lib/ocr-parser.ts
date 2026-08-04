import { PublicationRecord } from './types';
import { v4 as uuidv4 } from 'uuid';

interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface TesseractWord {
  text: string;
  confidence: number;
  bbox: BBox;
}

export interface TesseractOutput {
  text: string;
  confidence: number;
  words: TesseractWord[];
}

export function parseTesseractResult(result: TesseractOutput, imageId: string): { records: PublicationRecord[] } {
  const words = result.words;
  if (!words || words.length === 0) return { records: [] };

  // 1. Group words into rows by y-position
  words.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  const rows: TesseractWord[][] = [];
  let currentRow: TesseractWord[] = [];
  const ROW_TOLERANCE = 15;

  let lastY = words[0].bbox.y0;

  for (const word of words) {
    if (Math.abs(word.bbox.y0 - lastY) > ROW_TOLERANCE) {
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        rows.push(currentRow);
      }
      currentRow = [];
      lastY = word.bbox.y0;
    }
    currentRow.push(word);
  }
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    rows.push(currentRow);
  }

  // 2. Group into columns by x-position clusters
  let minX = Infinity;
  let maxX = -Infinity;
  words.forEach(w => {
    if (w.bbox.x0 < minX) minX = w.bbox.x0;
    if (w.bbox.x1 > maxX) maxX = w.bbox.x1;
  });

  const width = maxX - minX;
  const colWidth = width / 9;

  const records: PublicationRecord[] = [];

  for (const row of rows) {
    const textStr = row.map(w => w.text.toLowerCase()).join(' ');
    // Heuristic: skip header rows
    if (textStr.includes('roll number') || textStr.includes('student name')) {
      continue;
    }

    const cells: { text: string; confTotal: number; count: number }[] = Array.from({ length: 9 }, () => ({ text: '', confTotal: 0, count: 0 }));

    for (const word of row) {
      const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
      let colIdx = Math.floor((centerX - minX) / colWidth);
      if (colIdx < 0) colIdx = 0;
      if (colIdx > 8) colIdx = 8;
      
      cells[colIdx].text += (cells[colIdx].text ? ' ' : '') + word.text;
      cells[colIdx].confTotal += word.confidence;
      cells[colIdx].count += 1;
    }

    const getConf = (idx: number) => cells[idx].count > 0 ? cells[idx].confTotal / cells[idx].count : 100;
    
    const allWordsCount = row.length;
    const allWordsConf = row.reduce((sum, w) => sum + w.confidence, 0);
    const overallConf = allWordsCount > 0 ? allWordsConf / allWordsCount : 100;

    // A valid row should have at least some populated columns
    const populated = cells.filter(c => c.text.trim().length > 0).length;
    if (populated >= 3) {
      records.push({
        id: uuidv4(),
        sourceImageId: imageId,
        rollNumber: cells[0].text,
        studentName: cells[1].text,
        paperTitle: cells[2].text,
        journalName: cells[3].text,
        issn: cells[4].text,
        volumeIssue: cells[5].text,
        doi: cells[6].text,
        prNumber: cells[7].text,
        facultyCoordinator: cells[8].text,
        confidenceScores: {
          overall: overallConf,
          rollNumber: getConf(0),
          studentName: getConf(1),
          paperTitle: getConf(2),
          journalName: getConf(3),
          issn: getConf(4),
          volumeIssue: getConf(5),
          doi: getConf(6),
          prNumber: getConf(7),
          facultyCoordinator: getConf(8),
        }
      });
    }
  }

  return { records };
}
