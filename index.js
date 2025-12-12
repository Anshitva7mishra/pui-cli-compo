#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import simpleGit from "simple-git";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import ora from "ora";
import { execSync } from "child_process";
import components from "./components.config.js";

console.log(
  chalk.cyanBright(`
╔══════════════════════════════════════════╗
║   ✨ Powered by ProjectUI (PUI)          ║
║   🎨 Premium React UI Components        ║
║   🌐 https://projectui.in                ║
║   ⭐ Star us on GitHub                   ║
╚══════════════════════════════════════════╝
`)
);

console.log(chalk.blue("\n🚀 React Component Installer CLI\n"));

const cwd = process.cwd();
const arg = process.argv[2];

function detectPackageManager() {
  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
  if (fs.existsSync("yarn.lock")) return "yarn";
  return "npm";
}

async function cloneToTemp(url, tempDir) {
  const git = simpleGit();
  const spinner = ora("Cloning repository...").start();
  try {
    await git.clone(url, tempDir, ["--depth", "1"]);
    spinner.succeed("Repository cloned");
  } catch (e) {
    spinner.fail("Failed to clone repository");
    throw e;
  }
}

async function ensureTarget(key) {
  const target = path.join(cwd, "src", "components", `${key}Components`);
  await fsExtra.ensureDir(path.dirname(target));
  return target;
}

async function promptIfExists(targetDir) {
  if (!fs.existsSync(targetDir)) return "create";
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Component already exists:",
      choices: [
        { name: "Overwrite", value: "overwrite" },
        { name: "Merge", value: "merge" },
        { name: "Cancel", value: "cancel" },
      ],
    },
  ]);
  return action;
}

async function pickSource(tempDir) {
  const options = [path.join(tempDir, "src"), tempDir];
  for (const p of options) {
    if (await fsExtra.pathExists(p)) {
      const stat = await fsExtra.stat(p);
      if (stat.isDirectory()) return p;
    }
  }
  return tempDir;
}

async function safeCleanup(dir) {
  setTimeout(() => {
    fsExtra.remove(dir).catch(() => {});
  }, 300);
}

async function installComponent(repo, targetDir, mode) {
  const tempRoot = path.join(cwd, ".pui_tmp");
  const tempDir = path.join(tempRoot, `clone_${Date.now()}`);
  await fsExtra.ensureDir(tempRoot);

  try {
    await cloneToTemp(repo, tempDir);
    const sourceDir = await pickSource(tempDir);

    if (mode === "overwrite") await fsExtra.remove(targetDir).catch(() => {});
    await fsExtra.ensureDir(targetDir);

    await fsExtra.copy(sourceDir, targetDir, {
      overwrite: mode !== "merge",
      errorOnExist: false,
    });

    const gitDir = path.join(targetDir, ".git");
    if (await fsExtra.pathExists(gitDir)) {
      await fsExtra.remove(gitDir).catch(() => {});
    }

    safeCleanup(tempDir);
    safeCleanup(tempRoot);
  } catch (e) {
    safeCleanup(tempDir);
    safeCleanup(tempRoot);
    throw e;
  }
}

function installDependencies(targetDir) {
  const pkg = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkg)) return;

  const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
  const deps = { ...json.dependencies, ...json.peerDependencies };
  if (!deps || Object.keys(deps).length === 0) return;

  const list = Object.entries(deps).map(([k, v]) => `${k}@${v}`);
  const manager = detectPackageManager();
  const spinner = ora("Installing dependencies...").start();

  try {
    const cmd =
      manager === "pnpm"
        ? `pnpm add ${list.join(" ")}`
        : manager === "yarn"
        ? `yarn add ${list.join(" ")}`
        : `npm install ${list.join(" ")}`;
    execSync(cmd, { stdio: "inherit" });
    spinner.succeed("Dependencies installed");
  } catch {
    spinner.fail("Dependency installation failed");
  }
}

function addCreditFile(targetDir) {
  const file = path.join(targetDir, "README.PUI.md");
  if (fs.existsSync(file)) return;
  fs.writeFileSync(
    file,
    `✨ Installed via ProjectUI (PUI)

Premium React UI components with modern design & motion.

🌐 https://projectui.in
⭐ https://github.com/projectUI2k25

If this component helped you, consider starring the repo ❤️
`
  );
}

async function installFlow(key, repo) {
  const targetDir = await ensureTarget(key);
  const action = await promptIfExists(targetDir);
  if (action === "cancel") process.exit(0);

  const spinner = ora("Installing component...").start();
  try {
    await installComponent(repo, targetDir, action);
    installDependencies(targetDir);
    addCreditFile(targetDir);
    spinner.succeed("Installation complete");
    console.log(chalk.green(`\n✅ Installed: ${key}`));
    console.log(chalk.cyan(`📂 src/components/${key}Components\n`));
  } catch (e) {
    spinner.fail("Installation failed");
    console.log(chalk.red(e.message));
    process.exit(1);
  }
}

async function run() {
  if (!arg) {
    const { category } = await inquirer.prompt([
      {
        type: "list",
        name: "category",
        message: "Select a component category:",
        choices: Object.entries(components).map(([k, v]) => ({
          name: v.label,
          value: k,
        })),
      },
    ]);

    console.log(chalk.cyan(`\nNext step:\n👉 pui-create ${category}\n`));
    process.exit(0);
  }

  if (components[arg]) {
    const cat = components[arg];
    const { component } = await inquirer.prompt([
      {
        type: "list",
        name: "component",
        message: `Select a ${cat.label} component:`,
        choices: Object.entries(cat.items).map(([k, v]) => ({
          name: `${v.name} — ${v.description}`,
          value: k,
        })),
      },
    ]);

    console.log(chalk.cyan(`\nNext step:\n👉 pui-create ${component}\n`));
    process.exit(0);
  }

  let found;
  for (const c of Object.values(components)) {
    if (c.items[arg]) {
      found = c.items[arg];
      break;
    }
  }

  if (!found) {
    console.log(chalk.red(`❌ Unknown component "${arg}"`));
    process.exit(1);
  }

  await installFlow(arg, found.repo);
}

run();
