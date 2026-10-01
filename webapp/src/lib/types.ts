// Shared response shapes used by both the API routes and the client.

export interface SchoolRow {
  id: number;
  schoolName: string;
  location: string;
  coordinatorName: string;
  coordinatorPhone: string;
  coordinatorLocation: string;
  male: number;
  female: number;
  total: number;
  station: string;
  photoCount: number;
  createdAt: string;
}

export interface SchoolStats {
  totalStudents: number;
  totalSchools: number;
  totalMale: number;
  totalFemale: number;
}

export interface GroupBreakdown {
  name: string;
  male: number;
  female: number;
  total: number;
}

export interface BulkStats {
  totalMembers: number;
  totalMale: number;
  totalFemale: number;
  groups: GroupBreakdown[];
}

export interface WorkerStats {
  total: number;
  bulkTotal: number;
  bulkMale: number;
  bulkFemale: number;
  individualTotal: number;
}

export interface VisitorRow {
  id: number;
  category: string;
  male: number;
  female: number;
  total: number;
  notes: string;
  station: string;
  createdAt: string;
}

export interface VisitorStats {
  totalVisitors: number;
  totalMale: number;
  totalFemale: number;
  visitors: VisitorRow[];
}

export interface Summary {
  studentTotal: number;
  memberTotal: number;
  visitorTotal: number;
  workerTotal: number;
  grandTotal: number;
  totalMale: number;
  totalFemale: number;
  groups: GroupBreakdown[];
  schools: { name: string; total: number }[];
  workers: WorkerStats;
}

export interface DashboardPayload {
  stats: SchoolStats;
  schools: SchoolRow[];
  bulk: BulkStats;
  workers: WorkerStats;
  visitors: VisitorStats;
  summary: Summary;
  generatedAt: string;
}

export interface RosterMatch {
  rowId: number;
  fullName: string;
  phone: string;
  station: string;
  details: string;
  alreadyRegistered: boolean;
}

export interface DuplicateMatch {
  schoolName: string;
  similarity: number;
  coordinatorName: string;
  coordinatorPhone: string;
  total: number;
  male: number;
  female: number;
  station: string;
}

export const MEMBER_GROUPS = ["Group 1", "Group 2", "Group 3", "Group 4", "Others"] as const;
export type MemberGroup = (typeof MEMBER_GROUPS)[number];
