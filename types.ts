
export interface SubjectScore {
  subject: string;
  score: number;
}

export interface ExamSubScore {
  sectionA: number;
  sectionB: number;
}

export interface ComputedSubject extends SubjectScore {
  sbaScore: number;
  finalCompositeScore: number;
  grade: string;
  gradeValue: number; 
  remark: string;
  facilitator: string;
  zScore: number;
  sectionA?: number;
  sectionB?: number;
}

export interface InstitutionalPerformance {
  mockSeries: string;
  avgComposite: number;
  avgAggregate: number;
  avgObjective: number;
  avgTheory: number;
  studentCount: number;
  timestamp: string;
}

export interface RemarkMetric {
  text: string;
  count: number;
  maleCount: number;
  femaleCount: number;
}

export interface RemarkTelemetry {
  subjectRemarks: Record<string, RemarkMetric[]>;
  conductRemarks: RemarkMetric[];
  facilitatorNotes: RemarkMetric[];
}

export interface VerificationEntry {
  subject: string;
  verifiedBy: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  confirmedScripts: string[]; 
}

export type StaffRole = 'FACILITATOR' | 'INVIGILATOR' | 'EXAMINER' | 'SUPERVISOR' | 'OFFICER';

export interface StaffAssignment {
  name: string;
  email: string; // Required for OTP
  role: StaffRole;
  enrolledId: string; 
  taughtSubject?: string;
  passkey?: string; 
  invigilations: InvigilationSlot[];
  marking: {
    dateTaken: string;
    dateReturned: string;
    inProgress: boolean;
  };
}

export interface InvigilationSlot {
  dutyDate: string;
  timeSlot: string;
  subject: string;
}

export interface SchoolRegistryEntry {
  id: string; 
  name: string;
  registrant: string;
  registrantEmail: string; // Required for OTP
  // Fix: Added accessCode and related properties for multi-tenant auth
  accessCode: string;
  staffAccessCode: string;
  pupilAccessCode: string;
  enrollmentDate: string;
  studentCount: number;
  avgAggregate: number;
  performanceHistory: InstitutionalPerformance[];
  status: 'active' | 'suspended' | 'audit';
  lastActivity: string;
  // Fix: Added telemetry and logging fields for SuperAdmin audit
  remarkTelemetry?: RemarkTelemetry;
  verificationLogs?: Record<string, VerificationEntry[]>;
  fullData?: {
    settings: GlobalSettings;
    students: StudentData[];
    facilitators: Record<string, StaffAssignment>;
  };
}

export interface StudentData {
  id: number;
  name: string;
  email: string; // Required for OTP (Parent or Pupil)
  gender: string;
  parentName?: string;
  parentContact: string;
  attendance: number;
  conductRemark?: string;
  scores: Record<string, number>;
  sbaScores: Record<string, number>;
  examSubScores: Record<string, ExamSubScore>;
  mockData: Record<string, MockScoreSet>; 
  seriesHistory?: Record<string, MockSeriesRecord>;
  // Fix: Added beceResults for longitudinal tracking
  beceResults?: Record<string, BeceResult>;
}

export interface MockScoreSet {
  scores: Record<string, number>;
  sbaScores: Record<string, number>;
  examSubScores: Record<string, ExamSubScore>;
  facilitatorRemarks: Record<string, string>; 
  observations: {
    facilitator: string;
    invigilator: string;
    examiner: string;
  };
  attendance?: number;
  conductRemark?: string;
}

export interface MockSeriesRecord {
  aggregate: number;
  rank: number;
  date: string;
  subScores?: Record<string, ExamSubScore>;
  // Fix: Added audit tracking fields
  reviewStatus?: string;
  isApproved?: boolean;
  subjectPerformanceSummary?: Record<string, { mean: number; grade: string }>;
}

export interface ProcessedStudent {
  id: number;
  name: string;
  email: string;
  gender: string;
  parentName?: string;
  parentContact: string;
  // Fix: Added parentEmail for dispatch hub
  parentEmail?: string;
  attendance: number;
  conductRemark?: string;
  subjects: ComputedSubject[];
  totalScore: number;
  bestSixAggregate: number;
  bestCoreSubjects: ComputedSubject[];
  bestElectiveSubjects: ComputedSubject[];
  overallRemark: string;
  weaknessAnalysis: string;
  category: string;
  rank: number;
  seriesHistory?: Record<string, MockSeriesRecord>;
  mockData?: Record<string, MockScoreSet>;
  // Fix: Added beceResults for student dashboard
  beceResults?: Record<string, BeceResult>;
}

export interface ClassStatistics {
  subjectMeans: Record<string, number>;
  subjectStdDevs: Record<string, number>;
  subjectSectionAMeans: Record<string, number>;
  subjectSectionBMeans: Record<string, number>;
  subjectSectionAStdDevs: Record<string, number>;
  subjectSectionBStdDevs: Record<string, number>;
}

export interface GradingThresholds {
  A1: number;
  B2: number;
  B3: number;
  C4: number;
  C5: number;
  C6: number;
  D7: number;
  E8: number;
}

export interface NormalizationConfig {
  enabled: boolean;
  subject: string;
  maxScore: number;
  isLocked: boolean;
}

export interface SBAConfig {
  enabled: boolean;
  isLocked: boolean;
  sbaWeight: number;
  examWeight: number;
}

export interface ScoreEntryMetadata {
  mockSeries: string;
  entryDate: string;
}

export interface CategoryThreshold {
  label: string;
  min: number;
  max: number;
}

export interface GlobalSettings {
  schoolName: string;
  schoolAddress: string;
  schoolNumber: string; 
  schoolLogo?: string;
  schoolMotto?: string;
  schoolWebsite?: string;
  registrantName?: string; 
  registrantEmail?: string;
  // Fix: Added security keys for institutional access
  accessCode: string;
  staffAccessCode: string;
  pupilAccessCode: string;
  enrollmentDate: string;
  examTitle: string;
  termInfo: string;
  academicYear: string;
  nextTermBegin: string;
  attendanceTotal: string;
  startDate: string;
  endDate: string;
  headTeacherName: string;
  reportDate: string;
  schoolContact: string;
  schoolEmail: string;
  gradingThresholds: GradingThresholds;
  normalizationConfig: NormalizationConfig;
  sbaConfig: SBAConfig;
  scoreEntryMetadata: ScoreEntryMetadata;
  committedMocks?: string[];
  categoryThresholds: CategoryThreshold[];
  isConductLocked: boolean;
  securityPin?: string;
  activeMock: string;
  resourcePortal: Record<string, Record<string, MockResource>>;
  maxSectionA: number;
  maxSectionB: number;
  sortOrder: 'name-asc' | 'name-desc' | 'id-asc' | 'score-desc' | 'aggregate-asc';
  useTDistribution: boolean;
  mockSnapshots?: Record<string, MockSnapshotMetadata>;
  reportTemplate: 'standard' | 'minimal' | 'prestige';
  adminRoleTitle?: string;
  registryRoleTitle?: string;
}

export interface MockSnapshotMetadata {
  submissionDate: string;
  subjectsSubmitted: string[];
  approvalStatus: 'pending' | 'approved' | 'completed';
  // Fix: Added missing properties for verification audit
  confirmedScripts: string[];
  subjectSubmissionDates: Record<string, string>;
  approvedBy: string;
}

export interface MockResource {
  indicators: any[];
  questionUrl?: string;
  schemeUrl?: string;
  generalReport?: string;
}

// Fix: Added missing interfaces for network features

export interface QuestionIndicatorMapping {
  id: string;
  section: 'A' | 'B';
  questionRef: string;
  strand: string;
  subStrand: string;
  indicatorCode: string;
  indicator: string;
  weight: number;
}

export interface BeceResult {
  year: string;
  grades: Record<string, number>;
}

export interface PaymentParticulars {
  amount: number;
  paidBy: string;
  sentBy: string;
  transactionId: string;
  date: string;
  isBulk: boolean;
  isVerified: boolean;
}

export interface PaymentNode {
  paid: boolean;
  language?: string;
  particulars: PaymentParticulars;
}

export interface ForwardingData {
  schoolId: string;
  schoolName: string;
  feedback: string;
  pupilPayments: Record<string, PaymentNode>;
  facilitatorPayments: Record<string, PaymentNode>;
  submissionTimestamp: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SerializedPupil {
  id: number;
  name: string;
  serial: 'A' | 'B' | 'C' | 'D';
  questionCode: string;
}

export interface SerializationData {
  schoolId: string;
  schoolName: string;
  mockSeries: string;
  startDate: string;
  examinerName: string;
  chiefExaminerName: string;
  pupils: SerializedPupil[];
  timestamp: string;
}

export type BloomsScale = 'Knowledge' | 'Understanding' | 'Application' | 'Analysis' | 'Synthesis' | 'Evaluation';

export interface QuestionSubPart {
  partLabel: string;
  text: string;
  possibleAnswers: string;
  markingScheme: string;
  weight: number;
  blooms: BloomsScale;
}

export interface MasterQuestion {
  id: string;
  originalIndex: number;
  type: 'OBJECTIVE' | 'THEORY';
  strand: string;
  subStrand: string;
  indicator: string;
  questionText: string;
  instruction: string;
  correctKey: string;
  weight: number;
  blooms: BloomsScale;
  parts?: QuestionSubPart[];
  answerScheme: string;
  diagramUrl?: string;
}

export interface QuestionPack {
  variant: 'A' | 'B' | 'C' | 'D';
  generalRules: string;
  sectionInstructions: { A: string; B: string };
  objectives: MasterQuestion[];
  theory: MasterQuestion[];
  schemeCode: string;
  matchingMatrix: Record<string, { masterIdx: number; key: string; scheme: string }>;
}

export interface SerializedExam {
  schoolId: string;
  mockSeries: string;
  subject: string;
  packs: { A: QuestionPack; B: QuestionPack; C: QuestionPack; D: QuestionPack };
  timestamp: string;
}
