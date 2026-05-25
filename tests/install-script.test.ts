import { execFileSync } from "child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import { chmod, mkdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts", "install-to-vault.sh");

describe("install-to-vault.sh", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), "follow-builders-install-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("installs built plugin files into the requested Obsidian vault", async () => {
    const vaultPath = join(tempRoot, "Vault With Spaces");
    await mkdir(vaultPath);

    const output = execFileSync("bash", [scriptPath, vaultPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    const pluginDir = join(vaultPath, ".obsidian", "plugins", "follow-builders-sync");

    expect(existsSync(join(pluginDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(pluginDir, "main.js"))).toBe(true);
    expect(readFileSync(join(pluginDir, "manifest.json"), "utf8")).toContain('"id": "follow-builders-sync"');
    expect(output).toContain("Follow Builders Sync installed");
  });

  it("works when the install script is placed at the root of a release package", async () => {
    const releasePath = join(tempRoot, "release");
    const vaultPath = join(tempRoot, "Vault");
    await mkdir(releasePath);
    await mkdir(vaultPath);
    writeFileSync(join(releasePath, "manifest.json"), '{"id": "follow-builders-sync"}\n');
    writeFileSync(join(releasePath, "main.js"), "module.exports = {};\n");
    copyFileSync(scriptPath, join(releasePath, "install-to-vault.sh"));
    await chmod(join(releasePath, "install-to-vault.sh"), 0o755);

    execFileSync("bash", [join(releasePath, "install-to-vault.sh"), vaultPath], {
      cwd: releasePath,
      encoding: "utf8"
    });

    const pluginDir = join(vaultPath, ".obsidian", "plugins", "follow-builders-sync");
    expect(readFileSync(join(pluginDir, "manifest.json"), "utf8")).toBe('{"id": "follow-builders-sync"}\n');
    expect(readFileSync(join(pluginDir, "main.js"), "utf8")).toBe("module.exports = {};\n");
  });

  it("fails with usage guidance when no vault path is provided", () => {
    expect(() =>
      execFileSync("bash", [scriptPath], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: "pipe"
      })
    ).toThrow(/Usage:/);
  });
});
