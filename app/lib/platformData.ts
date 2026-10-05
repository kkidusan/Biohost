// app/lib/platformData.ts

export interface Tutor {
  id: string;
  name: string;
  email: string;
  subject: string;
  gradeLevel: string;
  hourlyRate: number;
  monthlyRate: number;
  learningMode: "Online" | "In-Person" | "Both";
  location: string;
  rating: number;
  reviewCount: number;
  bio: string;
  credentials: string;
  experience: string;
  verified: boolean;
  avatar: string;
  availability: string[];
}

export interface Booking {
  id: string;
  tutorId: string;
  tutorName: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  date: string;
  timeSlot: string;
  amount: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  escrowStatus: "Held in Escrow" | "Released to Tutor" | "Refunded";
  learningMode: "Online" | "In-Person";
}

export interface VerificationRequest {
  id: string;
  tutorId: string;
  tutorName: string;
  email: string;
  subject: string;
  degree: string;
  idDocument: string;
  backgroundCheckStatus: "Pending" | "Approved" | "Rejected";
  status: "Pending" | "Approved" | "Rejected";
}

export interface StudentRequest {
  id: string;
  name: string;
  subject: string;
  gradeLevel: string;
  budgetMax: number;
  learningMode: "Online" | "In-Person" | "Both";
  location: string;
  description: string;
  urgency: "Immediate" | "This Week" | "Flexible";
  postedDate: string;
  avatar: string;
}

// Initial Mock Data
export const initialTutors: Tutor[] = [
  {
    id: "t1",
    name: "Dr. Sarah Jenkins",
    email: "sarah.jenkins@tutors.com",
    subject: "Mathematics",
    gradeLevel: "High School / College",
    hourlyRate: 45,
    monthlyRate: 350,
    learningMode: "Both",
    location: "New York, NY",
    rating: 4.9,
    reviewCount: 38,
    bio: "Ph.D. in Applied Mathematics from Columbia University with 8+ years of experience helping students excel in Calculus, Algebra, and SAT Math.",
    credentials: "Ph.D. Mathematics, Columbia University",
    experience: "8 Years Full-time Tutoring & University Teaching",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    availability: ["Mon 3:00 PM", "Wed 4:00 PM", "Fri 2:00 PM", "Sat 10:00 AM"]
  },
  {
    id: "t2",
    name: "Michael Chang",
    email: "michael.chang@tutors.com",
    subject: "Science",
    gradeLevel: "Middle / High School",
    hourlyRate: 35,
    monthlyRate: 280,
    learningMode: "Online",
    location: "San Francisco, CA",
    rating: 4.8,
    reviewCount: 24,
    bio: "M.S. in Physics & Chemistry. Passionate about making complex scientific concepts engaging and easy to understand for young minds.",
    credentials: "M.S. Physics, UC Berkeley",
    experience: "5 Years STEM Tutoring",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200",
    availability: ["Tue 5:00 PM", "Thu 5:00 PM", "Sun 1:00 PM"]
  },
  {
    id: "t3",
    name: "Elena Rostova",
    email: "elena.rostova@tutors.com",
    subject: "English & Literature",
    gradeLevel: "Elementary / Middle School",
    hourlyRate: 30,
    monthlyRate: 240,
    learningMode: "In-Person",
    location: "Chicago, IL",
    rating: 5.0,
    reviewCount: 42,
    bio: "Certified English Teacher and author. Specialized in reading comprehension, creative writing, ESL, and grammar mastery.",
    credentials: "B.A. English Lit, University of Chicago, State Teaching License",
    experience: "10 Years Classroom & Private Instruction",
    verified: false, // Pending verification in Admin
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200",
    availability: ["Mon 1:00 PM", "Wed 1:00 PM", "Thu 3:00 PM"]
  }
];

export const initialBookings: Booking[] = [
  {
    id: "b1",
    tutorId: "t1",
    tutorName: "Dr. Sarah Jenkins",
    studentName: "Alex Smith",
    studentEmail: "alex.smith@student.com",
    subject: "Mathematics",
    date: "2026-06-15",
    timeSlot: "Mon 3:00 PM",
    amount: 45,
    status: "Confirmed",
    escrowStatus: "Held in Escrow",
    learningMode: "Online"
  }
];

export const initialVerifications: VerificationRequest[] = [
  {
    id: "v1",
    tutorId: "t3",
    tutorName: "Elena Rostova",
    email: "elena.rostova@tutors.com",
    subject: "English & Literature",
    degree: "B.A. English Lit - University of Chicago",
    idDocument: "Passport_Verified.pdf",
    backgroundCheckStatus: "Pending",
    status: "Pending"
  },
  {
    id: "v2",
    tutorId: "t1",
    tutorName: "Dr. Sarah Jenkins",
    email: "sarah.jenkins@tutors.com",
    subject: "Mathematics",
    degree: "Ph.D. Mathematics, Columbia University",
    idDocument: "Degree_Certificate.pdf",
    backgroundCheckStatus: "Approved",
    status: "Approved"
  },
  {
    id: "v3",
    tutorId: "t2",
    tutorName: "Michael Chang",
    email: "michael.chang@tutors.com",
    subject: "Science",
    degree: "M.S. Physics, UC Berkeley",
    idDocument: "Physics_Diploma.pdf",
    backgroundCheckStatus: "Approved",
    status: "Approved"
  }
];

export const initialStudentRequests: StudentRequest[] = [
  {
    id: "sr1",
    name: "Alex Smith",
    subject: "Mathematics",
    gradeLevel: "High School / College",
    budgetMax: 50,
    learningMode: "Online",
    location: "New York, NY",
    description: "Looking for an expert Calculus and SAT Math tutor to help prepare for upcoming finals and college entrance exams. 3 sessions per week preferred.",
    urgency: "Immediate",
    postedDate: "2026-06-01",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "sr2",
    name: "Marcus Johnson",
    subject: "Science",
    gradeLevel: "Middle / High School",
    budgetMax: 40,
    learningMode: "Both",
    location: "San Francisco, CA",
    description: "Need help with AP Physics mechanics and chemistry lab preparation. Looking for patient tutor with strong STEM background.",
    urgency: "This Week",
    postedDate: "2026-06-02",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "sr3",
    name: "Samantha Wright",
    subject: "English & Literature",
    gradeLevel: "Elementary / Middle School",
    budgetMax: 35,
    learningMode: "In-Person",
    location: "Chicago, IL",
    description: "Seeking a dedicated reading and essay writing tutor for 7th grade student needing support with grammar and comprehension.",
    urgency: "Flexible",
    postedDate: "2026-06-03",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200"
  },
  {
    id: "sr4",
    name: "David Kim",
    subject: "Computer Science",
    gradeLevel: "High School / College",
    budgetMax: 60,
    learningMode: "Online",
    location: "Seattle, WA",
    description: "Looking for guidance in Python programming, data structures, and building full-stack web applications with React.",
    urgency: "Immediate",
    postedDate: "2026-06-04",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
  }
];
