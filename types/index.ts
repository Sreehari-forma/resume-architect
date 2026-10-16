export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  technologies: string[];
  bullets: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface UserProfile {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  location: string;
  website: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
}

export interface ResumeAnalysis {
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  highlights: string[];
}

export interface TailoredResume {
  id: string;
  jobTitle: string;
  company: string;
  profile: UserProfile;
  analysis: ResumeAnalysis;
  latex: string;
  createdAt: string;
  mode: 'demo' | 'ai';
}

export interface WorkspaceData {
  profile: UserProfile;
  isDemo: boolean;
  userEmail: string | null;
}
