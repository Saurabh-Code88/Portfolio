export type Profile = {
  name: string;
  role: string;
  location: string;
  headline: string;
  subline: string;
  links: {
    github: string;
    linkedin: string;
    x: string;
    leetcode: string;
    email: string;
  };
};

export const profile: Profile = {
  name: "Saurabh Pramanik",
  role: "Backend developer",
  location: "Noida, India",
  headline: "I build the backend systems AI agents run on.",
  subline: "Queues, retrieval, streaming and fault tolerance for LLM products. Node.js, Python, Redis, PostgreSQL.",
  links: {
    github: "https://github.com/Saurabh-Code88",
    linkedin: "https://linkedin.com/in/saurabh-pramanik",
    x: "https://x.com/pramanik_codes",
    leetcode: "https://leetcode.com/u/PRAMANIKSAURABH",
    email: "mailto:saurabh.work85@gmail.com",
  },
};

export const profileContactLinks = [
  { label: "Email", href: profile.links.email, download: false },
  { label: "GitHub", href: profile.links.github, download: false },
  { label: "LinkedIn", href: profile.links.linkedin, download: false },
  { label: "X", href: profile.links.x, download: false },
  { label: "LeetCode", href: profile.links.leetcode, download: false },
  { label: "Download resume", href: "/resume.pdf", download: true },
] as const;
