import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projects } from "./projects.ts";

describe("project content", () => {
  it("has a repoUrl for every project", () => {
    for (const project of projects) {
      assert.ok(project.repoUrl.trim(), `${project.title} is missing a repoUrl`);
    }
  });

  it("does not contain empty metric labels or values", () => {
    for (const project of projects) {
      if (project.metric) {
        assert.ok(project.metric.label.trim(), `${project.title} has an empty metric label`);
        assert.ok(project.metric.value.trim(), `${project.title} has an empty metric value`);
      }
    }
  });
});
