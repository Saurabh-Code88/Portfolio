/* eslint-disable @next/next/no-img-element -- Small local SVGs need no raster optimizer. */
import { technologyFor } from "@/content/technologies";
export function TechIcon({ name }: { name: string }) {
  const technology = technologyFor(name);
  if (!technology?.icon) return null;
  return (
    <img
      className={`tech-icon${technology.dark ? " tech-icon--light" : ""}`}
      src={`/icons/technology/${technology.icon}.svg`}
      width={36}
      height={36}
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
  );
}
export function TechnologyStack({
  tools,
  className = "",
}: {
  tools: readonly string[];
  className?: string;
}) {
  return (
    <ul className={`technology-stack ${className}`}>
      {tools.map((name) => (
        <li key={name}>
          <TechIcon name={name} />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  );
}
export function TechnologyGroup({
  name,
  note,
  tools,
}: {
  name: string;
  note: string;
  tools: readonly string[];
}) {
  return (
    <section className="toolkit-group">
      <div className="toolkit-group__heading">
        <div>
          <h3>{name}</h3>
          <p>{note}</p>
        </div>
      </div>
      <TechnologyStack tools={tools} />
    </section>
  );
}
