export interface StudentResult {
  rollNo: string;
  name: string;
  dob: string;
  branch: string;
  semester: string;
  marks: {
    [subject: string]: number;
  };
  totalMarks: number;
  percentage: number;
  cgpa: number;
  rankInClass?: number;
  rankInDepartment?: number;
  lastUpdated: string;
}

export interface ScraperStatus {
  totalStudents: number;
  scrapedCount: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
}
