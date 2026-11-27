import { TechnologyGroup } from "@/components/technology-stack";
import { toolkitCopy } from "@/content/toolkit";
import { engineeringGroups, expeditionCopy } from "@/content/expedition";

function ToolIcon({ name, index }: { name: string; index: number }) {
  const glyph = name
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`tool-icon tool-icon--${index % 4}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <path
          className="tool-icon__orbit"
          d="M24 4.5 43.5 16v16L24 43.5 4.5 32V16L24 4.5Z"
        />
        <path
          className="tool-icon__core"
          d="M24 11.5 37 19v10L24 36.5 11 29V19l13-7.5Z"
        />
        <text x="24" y="27.5" textAnchor="middle">
          {glyph}
        </text>
      </svg>
    </span>
  );
}

export function ToolkitSection() {
  return (
    <section
      className="content-section toolkit-section"
      id="toolkit"
      aria-labelledby="toolkit-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">{toolkitCopy.eyebrow}</p>
          <h2 id="toolkit-heading">
            <span className="portfolio-original">{toolkitCopy.heading}</span>
            <span className="chapter-only">
              {expeditionCopy.toolkitHeading}
            </span>
          </h2>
        </div>
        <p>
          <span className="portfolio-original">{toolkitCopy.intro}</span>
          <span className="chapter-only">{expeditionCopy.toolkitIntro}</span>
        </p>
      </div>
      <div className="toolkit-groups portfolio-original">
        {toolkitCopy.groups.map((group, groupIndex) => (
          <section
            className="toolkit-group"
            key={group.name}
            aria-labelledby={`toolkit-group-${groupIndex}`}
          >
            <div className="toolkit-group__heading">
              <span className="toolkit-group__index" aria-hidden="true">
                {String(groupIndex + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 id={`toolkit-group-${groupIndex}`}>{group.name}</h3>
                <p>{group.note}</p>
              </div>
            </div>
            <ul className="toolkit-list">
              {group.tools.map((tool, index) => (
                <li className="tool-item" key={tool}>
                  <span className="tool-item__surface">
                    <ToolIcon name={tool} index={index + groupIndex} />
                    <span>{tool}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="toolkit-groups chapter-only">
        {engineeringGroups.map((group) => (
          <TechnologyGroup key={group.name} {...group} />
        ))}
      </div>
    </section>
  );
}
