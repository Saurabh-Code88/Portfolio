export type Research = {
  title: string;
  summary: string;
  venue: string;
  year: number;
  stack: string[];
  finding: string;
  coAuthors: string[];
  advisor: string;
  institution: string;
};

export const researchCopy = {
  technologyLabel: "Technology",
  findingLabel: "Finding",
  coAuthorsLabel: "Co-authors",
  advisorLabel: "Advisor",
} as const;

export const research: Research[] = [
  {
    title: "Cross-stack reproduction of a Quantum Elman Neural Network",
    summary: "A cross-stack reproduction for stock closing-price prediction.",
    venue: "Elsevier ICMLDE 5.0",
    year: 2026,
    stack: ["IBM Qiskit", "Microsoft Q#", "React", "Recharts"],
    finding:
      "The classical Elman baseline beat both quantum reproductions on all six global indices; equivalent amplitude encoding across Qiskit and Q# did not produce equivalent optimization trajectories.",
    coAuthors: ["Yashraj Jadam", "Pavitra Sharma"],
    advisor: "Dr. Himanshu Agrawal",
    institution: "JIIT Noida",
  },
];
