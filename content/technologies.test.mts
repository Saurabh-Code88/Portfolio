import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { technologies, technologyFor } from "./technologies.ts";
import { toolkitCopy } from "./toolkit.ts";
import { projects } from "./projects.ts";
import { research } from "./research.ts";
import { engineeringGroups } from "./expedition.ts";
test("technology registry resolves every actual stack and aliases without invented skills", () => {
  const names = [
    ...toolkitCopy.groups.flatMap((g) => [...g.tools]),
    ...projects.flatMap((p) => p.stack),
    ...research.flatMap((r) => r.stack),
  ];
  for (const name of names) assert.ok(technologyFor(name), name);
  assert.equal(technologyFor("Yjs (CRDT)"), technologyFor("Yjs"));
  assert.equal(technologyFor("Unverified framework"), undefined);
  const supported = new Set(toolkitCopy.groups.flatMap((g) => [...g.tools]));
  for (const g of engineeringGroups)
    for (const name of g.tools) assert.ok(supported.has(name));
  assert.equal(
    new Set(technologies.map((t) => t.id)).size,
    technologies.length,
  );
});
test("bundled logos are local SVGs with no embedded external executable content", () => {
  for (const t of technologies.filter((t) => t.icon)) {
    const file = `public/icons/technology/${t.icon}.svg`;
    assert.ok(existsSync(file), file);
    const svg = readFileSync(file, "utf8");
    assert.match(svg, /<svg/);
    assert.doesNotMatch(
      svg,
      /<script|<foreignObject|(?:href|src)=["']https?:/i,
    );
  }
  assert.ok(existsSync("public/icons/technology/LICENSE-devicon.txt"));
  assert.ok(existsSync("public/icons/technology/LICENSE-simple-icons.md"));
});
test("case-study content has factual fields and resolvable engineering stacks", () => {
  for (const project of projects) {
    assert.match(project.repoUrl, /^https:\/\/github.com\//);
    assert.ok(project.problem.length > 0);
    assert.ok(project.architecture.length > 0);
    for (const name of project.stack) assert.ok(technologyFor(name), name);
    if (project.liveUrl !== null) assert.match(project.liveUrl, /^https:\/\//);
  }
});
