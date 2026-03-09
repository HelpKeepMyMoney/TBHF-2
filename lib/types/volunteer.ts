/** Volunteer position from Firestore */
export interface VolunteerPosition {
  id?: string;
  title: string;
  description: string;
  commitment: string;
  location: string;
  category: string;
  order?: number;
  /** When false, position is a draft and not shown on the public website */
  published?: boolean;
  createLinkedInJobDescription?: boolean;
  linkedInJobDescription?: string;
  linkedInJobDescriptionSavedAt?: { seconds: number } | Date;
}

/** Volunteer application from Firestore */
export interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  interests: string[];
  experience: string;
  availability: string;
  motivation: string;
  referral: string;
  submittedAt: { seconds: number } | null;
  status: string;
  positionId?: string;
  positionTitle?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: { seconds: number } | null;
  interviewScheduledAt?: { seconds: number } | null;
  interviewNotes?: string;
  onboardingStatus?: "not_started" | "in_progress" | "completed";
  onboardingCompletedAt?: { seconds: number } | null;
  onboardingNotes?: string;
}

export const RECRUITMENT_STATUS_OPTIONS = [
  "pending",
  "reviewed",
  "interview_scheduled",
  "interviewed",
  "offered",
  "onboarded",
  "closed",
] as const;
