export type Experience = {
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  highlights: string[];
  note: string;
};

export type Education = {
  qualification: string;
  institution: string;
  location: string;
  startYear: number;
  endYear: number;
};

export type Certification = {
  name: string;
  issuer: string;
  year: number;
};

export const experienceCopy = {
  dateConfirmationLabel: "Note",
} as const;

export const experience: Experience[] = [
  {
    role: "Backend Developer Intern",
    organization: "Unified Mentor Pvt Ltd",
    startDate: "July 2025",
    endDate: "December 2025",
    highlights: [
      "Built 30+ modular backend components with Node.js and Express.",
      "Built and integrated REST APIs with database-backed services; refactored server-side architecture for reuse and scalability.",
    ],
    note: "Dates need confirmation against LinkedIn.",
  },
];

export const education: Education[] = [
  {
    qualification: "B.Tech Computer Science",
    institution: "Jaypee Institute of Information Technology",
    location: "Noida",
    startYear: 2022,
    endYear: 2026,
  },
];

export const certifications: Certification[] = [
  { name: "GitHub Foundations", issuer: "GitHub", year: 2026 },
  { name: "Data Analytics with Python", issuer: "NPTEL, IIT Roorkee", year: 2026 },
];
