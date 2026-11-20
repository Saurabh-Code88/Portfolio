import { projectsCopy, type Project } from "@/content/projects";

type ArchitectureDiagramProps = {
  project: Project;
};

const diagramKeyBySlug: Record<Project["slug"], keyof typeof projectsCopy.nodes> = {
  "support-resolution-agent": "support",
  ghostapply: "ghostapply",
  kritique: "kritique",
  collabcode: "collabcode",
  "distributed-url-shortener": "urlShortener",
};

export function ArchitectureDiagram({ project }: ArchitectureDiagramProps) {
  const diagramKey = diagramKeyBySlug[project.slug];
  const nodes = projectsCopy.nodes[diagramKey];
  const descriptions = projectsCopy.nodeDescriptions[diagramKey];
  const diagramNote = projectsCopy.diagramNotes[diagramKey];
  const arrowId = `diagram-arrow-${project.slug}`;

  return (
    <div
      className="diagram-scroll"
      role="region"
      aria-label={`Scrollable ${project.title} architecture diagram`}
      tabIndex={0}
    >
      <svg
        className="architecture-diagram"
        viewBox="0 0 960 270"
        role="img"
        aria-label={`${project.title} architecture diagram. ${project.architecture.split(/\s+Diagram:/i)[0]}`}
      >
        <defs>
          <marker
            id={arrowId}
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="var(--amber)" />
          </marker>
        </defs>
        {diagramNote && (
          <text className="diagram-note" x="480" y="37" textAnchor="middle">
            {diagramNote}
          </text>
        )}
        {nodes.map((node, index) => {
          const x = 28 + index * 232;
          const isGhostApply = project.slug === "ghostapply";

          return (
            <g key={node}>
              {index < nodes.length - 1 && (
                <path
                  d={`M${x + 194} 143 H${x + 224}`}
                  fill="none"
                  stroke="var(--amber)"
                  strokeWidth="2"
                  markerEnd={`url(#${arrowId})`}
                />
              )}
              <rect
                x={x}
                y="91"
                width="194"
                height="104"
                rx="13"
                fill="var(--surface)"
                stroke="var(--rust)"
                strokeWidth="2"
              />
              {isGhostApply && (
                <circle cx={x + 24} cy="116" r="13" fill="var(--amber)" />
              )}
              {isGhostApply && (
                <text
                  className="diagram-stage-number"
                  x={x + 24}
                  y="121"
                  textAnchor="middle"
                >
                  {index + 1}
                </text>
              )}
              <text
                className="diagram-node-title"
                x={isGhostApply ? x + 45 : x + 16}
                y="125"
              >
                {node}
              </text>
              <text className="diagram-node-description" x={x + 16} y="158">
                {descriptions[index]}
              </text>
            </g>
          );
        })}
        {project.slug === "ghostapply" && (
          <path
            d="M852 204 C852 237 116 237 116 205"
            fill="none"
            stroke="var(--ember)"
            strokeWidth="2"
            strokeDasharray="5 6"
            markerEnd={`url(#${arrowId})`}
          />
        )}
      </svg>
    </div>
  );
}
