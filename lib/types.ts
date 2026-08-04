export interface PublicationRecord {
  id: string;
  rollNumber: string;
  studentName: string;
  paperTitle: string;
  journalName: string;
  issn: string;
  volumeIssue: string;
  doi: string;
  prNumber: string;
  facultyCoordinator: string;
  sourceImageId: string;
  confidenceScores?: {
    overall?: number;
    rollNumber?: number;
    studentName?: number;
    paperTitle?: number;
    journalName?: number;
    issn?: number;
    volumeIssue?: number;
    doi?: number;
    prNumber?: number;
    facultyCoordinator?: number;
  };
}
