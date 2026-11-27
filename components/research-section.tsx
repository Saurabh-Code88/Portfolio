import { TechnologyStack } from "@/components/technology-stack";
import { research, researchCopy } from "@/content/research";
import { siteCopy } from "@/content/site";
import { expeditionCopy } from "@/content/expedition";

export function ResearchSection() {
  return (
    <section
      className="content-section"
      id="research"
      aria-labelledby="research-heading"
    >
      <div className="section-heading">
        <div>
          <p className="section-kicker">{siteCopy.researchEyebrow}</p>
          <h2 id="research-heading">{siteCopy.researchHeading}</h2>
        </div>
      </div>
      {research.map((paper) => (
        <article className="research-panel" key={paper.title}>
          <div className="research-panel__header">
            <div>
              <h3>{paper.title}</h3>
              <span className="chapter-only research-objective">
                {expeditionCopy.objective}
              </span>
              <p>{paper.summary}</p>
            </div>
            <p className="research-venue">
              {siteCopy.acceptedAtPrefix} {paper.venue}, {paper.year}
            </p>
          </div>
          <div className="research-panel__details">
            <div>
              <h4>
                <span className="portfolio-original">
                  {researchCopy.findingLabel}
                </span>
                <span className="chapter-only">{expeditionCopy.outcome}</span>
              </h4>
              <p>{paper.finding}</p>
            </div>
            <div>
              <h4>{researchCopy.technologyLabel}</h4>
              <div className="chapter-only">
                <TechnologyStack tools={paper.stack} />
              </div>
              <ul className="tag-list portfolio-original">
                {paper.stack.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{researchCopy.coAuthorsLabel}</h4>
              <p>{paper.coAuthors.join(", ")}</p>
            </div>
            <div>
              <h4>{researchCopy.advisorLabel}</h4>
              <p>
                {paper.advisor}, {paper.institution}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
