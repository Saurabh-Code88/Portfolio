import Link from "next/link";
import { profile } from "@/content/profile";

const navigation = [
  { label: "Work", href: "/#projects" },
  { label: "Toolkit", href: "/#toolkit" },
  { label: "Research", href: "/#research" },
  { label: "About", href: "/#experience" },
];

export function SiteNav() {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label={`${profile.name}, home`}>
        <span className="site-brand__seal" aria-hidden="true">SP</span>
        <span>{profile.name}</span>
      </Link>
      <nav aria-label="Main navigation" className="site-nav">
        {navigation.map((item) => (
          <Link href={item.href} key={item.label}>{item.label}</Link>
        ))}
      </nav>
      <Link className="site-header__contact" href="/#contact">Let’s talk <span aria-hidden="true">↗</span></Link>
    </header>
  );
}
