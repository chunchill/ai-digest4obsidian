import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

const repoRoot = process.cwd();
const packageScript = join(repoRoot, "scripts", "package-release.sh");

describe("package-release.sh", () => {
  it("creates a release zip with plugin files, install script, and install docs", async () => {
    const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as { version: string };
    const zipPath = join(repoRoot, "dist", `follow-builders-sync-${packageJson.version}.zip`);

    execFileSync("bash", [packageScript], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(existsSync(zipPath)).toBe(true);
    const listing = execFileSync("unzip", ["-l", zipPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    expect(listing).toContain("manifest.json");
    expect(listing).toContain("main.js");
    expect(listing).toContain("install-to-vault.sh");
    expect(listing).toContain("README.md");
    expect(listing).toContain("docs/INSTALL.en.md");
    expect(listing).toContain("docs/INSTALL.zh-CN.md");
  });
});
