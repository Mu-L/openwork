import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { publishPr } from "../src/publish-pr.ts";
import type { CommandRunner, Fetcher } from "../src/publish-pr.ts";
import type { PhotoRollRecord } from "../src/schema.ts";

function dryRunRecord(dir: string): PhotoRollRecord {
  return {
    name: "Dry run proof",
    dir,
    createdAt: "2026-07-02T10:00:00.000Z",
    closedAt: "2026-07-02T10:01:00.000Z",
    summary: {
      ok: true,
      totalFrames: 1,
      passedFrames: 1,
      failedFrames: 0,
      unvalidatedFrames: 0,
      passedExpectations: 1,
      failedExpectations: 0,
    },
    frames: [{
      caption: "Dry-run claim",
      fileName: "01-dry-run.png",
      hash: "hash",
      route: "#/dry-run",
      at: "2026-07-02T10:00:00.000Z",
      description: "Visible dry-run state",
      model: "test-model",
      ok: true,
      results: [{ expectation: "Dry run is visible", passed: true, evidence: "Visible" }],
    }],
  };
}

test("publishPr dry-run prints composed markdown without upload or gh calls", async () => {
  const rollDir = await mkdtemp(join(tmpdir(), "openwork-evidence-publish-"));
  try {
    await mkdir(rollDir, { recursive: true });
    await writeFile(join(rollDir, "roll.json"), JSON.stringify(dryRunRecord(rollDir)));
    let commandCalled = false;
    let fetchCalled = false;
    let output = "";
    const exec: CommandRunner = () => {
      commandCalled = true;
      return { status: 1, stdout: "", stderr: "unexpected command" };
    };
    const fetcher: Fetcher = async () => {
      fetchCalled = true;
      throw new Error("unexpected fetch");
    };
    const result = await publishPr(
      { rollDir, dryRun: true },
      { exec, fetch: fetcher, stdout: (markdown) => { output = markdown; } },
    );
    assert.equal(commandCalled, false);
    assert.equal(fetchCalled, false);
    assert.equal(result.posted, false);
    assert.match(output, /<!-- photo-roll -->/);
    assert.match(output, /Dry-run claim/);
    assert.match(output, /Dry run: screenshots were not uploaded/);
  } finally {
    await rm(rollDir, { recursive: true, force: true });
  }
});
