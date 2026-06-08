import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const repoRoot = process.cwd();
const packageScript = join(repoRoot, "scripts", "package-release.sh");

const expectedReleaseFiles = [
  "README.md",
  "docs/INSTALL.en.md",
  "docs/INSTALL.zh-CN.md",
  "install-to-vault.sh",
  "main.js",
  "manifest.json"
];

describe("package-release.sh", () => {
  it("creates a release zip with plugin files, install script, and install docs", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as { version: string };
    const zipPath = join(repoRoot, "dist", `follow-builders-sync-${packageJson.version}.zip`);

    execFileSync("bash", [packageScript], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(existsSync(zipPath)).toBe(true);
    const listing = execFileSync("unzip", ["-Z1", zipPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });
    const entries = listing
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const file of expectedReleaseFiles) {
      expect(entries).toContain(file);
    }

    expect(entries.some((entry) => entry.startsWith("src/"))).toBe(false);
    expect(entries.some((entry) => entry.startsWith("scripts/"))).toBe(false);
    expect(entries.some((entry) => entry.startsWith("tests/"))).toBe(false);
    expect(entries.some((entry) => entry.endsWith("package.json"))).toBe(false);
  });

  it("installs successfully from the extracted release zip root", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as { version: string };
    const zipPath = join(repoRoot, "dist", `follow-builders-sync-${packageJson.version}.zip`);
    const tempRoot = mkdtempSync(join(tmpdir(), "follow-builders-release-"));
    const releaseDir = join(tempRoot, "release");
    const vaultPath = join(tempRoot, "vault");

    try {
      execFileSync("mkdir", ["-p", releaseDir, vaultPath]);
      execFileSync("unzip", ["-q", zipPath, "-d", releaseDir], { cwd: repoRoot });
      execFileSync("bash", [join(releaseDir, "install-to-vault.sh"), vaultPath], {
        cwd: releaseDir,
        encoding: "utf8"
      });

      const pluginDir = join(vaultPath, ".obsidian", "plugins", "follow-builders-sync");
      expect(readFileSync(join(pluginDir, "manifest.json"), "utf8")).toContain('"id": "follow-builders-sync"');
      expect(readFileSync(join(pluginDir, "main.js"), "utf8").length).toBeGreaterThan(0);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
