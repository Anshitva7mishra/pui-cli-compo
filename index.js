#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import chalkAnimation from "chalk-animation";
import simpleGit from "simple-git";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import os from "os";
import ora from "ora";
import components from "./components.config.js";

// --- THE SEXIER HEADER ---
console.log(
  chalk.bold.cyan(`
  ${chalk.magenta("⭐")} ${chalk.white("Thank you for using ProjectUI!")}
  ${chalk.gray("──────────────────────────────────────────────────")}
  
   ${chalk.bgCyan.black("  PROJECT UI (PUI)  ")}  ${chalk.cyan(
    "Premium React Components"
  )}
  
   ${chalk.blue("🌐 Website:")}   ${chalk.underline.white(
    "https://projectui.in"
  )}
   ${chalk.yellow("✨ Status:")}    ${chalk.green("Ready to install")}
   ${chalk.magenta("💖 Community:")} ${chalk.italic.white(
    "If you like it, star us on GitHub!"
  )}
   ${chalk.white("👉 Repo:")}      ${chalk.underline.blue(
    "https://github.com/projectUI2k25"
  )}

  ${chalk.gray("──────────────────────────────────────────────────")}
`)
);

const cwd = process.cwd();
let arg = process.argv[2];
const tempRoot = path.join(os.tmpdir(), "pui-create");

async function cloneToTemp(url, tempDir) {
  const git = simpleGit();
  // Using a custom spinner frame for a "smoother" look
  const spinner = ora({
    text: chalk.blue("Fetching component from source..."),
    spinner: "dots12",
    color: "cyan",
  }).start();

  try {
    await git.clone(url, tempDir, ["--depth", "1"]);
    spinner.succeed(chalk.green("Source synchronized successfully"));
  } catch (e) {
    spinner.fail(chalk.red("Failed to reach repository"));
    throw e;
  }
}

async function ensureTarget(key) {
  // Logic to ensure src -> components -> Folder
  const targetPath = path.join(cwd, "src", "components", `${key}Components`);
  await fsExtra.ensureDir(targetPath);
  return targetPath;
}

async function promptIfExists(targetDir) {
  if (!fs.existsSync(targetDir) || fs.readdirSync(targetDir).length === 0)
    return "create";

  console.log(
    chalk.bold.yellow(
      `\n⚠️  Conflict Detected: ${path.basename(targetDir)} already exists.`
    )
  );

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "How should we proceed?",
      choices: [
        { name: chalk.red("Overwrite (Delete existing)"), value: "overwrite" },
        { name: chalk.blue("Merge (Keep existing files)"), value: "merge" },
        { name: chalk.gray("Cancel Installation"), value: "cancel" },
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

async function installComponent(repo, targetDir, mode) {
  const tempDir = path.join(tempRoot, `clone_${Date.now()}`);
  await fsExtra.ensureDir(tempRoot);
  try {
    await cloneToTemp(repo, tempDir);
    const sourceDir = await pickSource(tempDir);

    if (mode === "overwrite") await fsExtra.emptyDir(targetDir);

    await fsExtra.copy(sourceDir, targetDir, { overwrite: mode !== "merge" });

    // Cleanup internal git data
    const gitDir = path.join(targetDir, ".git");
    if (await fsExtra.pathExists(gitDir)) await fsExtra.remove(gitDir);

    setTimeout(() => fsExtra.remove(tempDir).catch(() => {}), 500);
  } catch (e) {
    setTimeout(() => fsExtra.remove(tempDir).catch(() => {}), 500);
    throw e;
  }
}

async function installFlow(key, repo) {
  const targetDir = await ensureTarget(key);
  const action = await promptIfExists(targetDir);

  if (action === "cancel") {
    console.log(chalk.gray("\nOperation aborted by user."));
    process.exit(0);
  }

  const spinner = ora({
    text: chalk.magenta(`Building ${key}...`),
    spinner: "moon",
  }).start();

  try {
    await installComponent(repo, targetDir, action);
    spinner.stop();

    // Sexier Success Message with Animation
    const rainbow = chalkAnimation.rainbow(`\n✅ ${key} is ready to use!`);
    setTimeout(() => {
      rainbow.stop(); // Stop animation after 2 seconds
      console.log(
        chalk.gray("──────────────────────────────────────────────────")
      );
      console.log(
        `${chalk.bold("📍 Location:")} ${chalk.cyan(
          `src/components/${key}Components`
        )}`
      );
      console.log(
        `${chalk.bold("🚀 Next step:")} Import the component into your project.`
      );
      console.log(
        chalk.gray("──────────────────────────────────────────────────\n")
      );
    }, 2000);
  } catch (e) {
    spinner.fail(chalk.red("Installation failed unexpectedly"));
    console.error(e);
    process.exit(1);
  }
}

async function run() {
  if (!arg) {
    const { category } = await inquirer.prompt([
      {
        type: "list",
        name: "category",
        message: chalk.cyan("What are you building today?"),
        choices: Object.entries(components).map(([k, v]) => ({
          name: v.label,
          value: k,
        })),
      },
    ]);
    arg = category;
  }

  if (components[arg]) {
    const { component } = await inquirer.prompt([
      {
        type: "list",
        name: "component",
        message: `Pick your ${chalk.bold.blue(components[arg].label)}:`,
        choices: Object.entries(components[arg].items).map(([k, v]) => ({
          name: `${chalk.white(v.name)} ${chalk.dim(`— ${v.description}`)}`,
          value: k,
        })),
      },
    ]);
    arg = component;
  }

  let found;
  for (const c of Object.values(components)) {
    if (c.items[arg]) {
      found = c.items[arg];
      break;
    }
  }

  if (!found) {
    console.log(chalk.red(`\n❌ Error: Could not find component "${arg}"`));
    process.exit(1);
  }

  await installFlow(arg, found.repo);
}

run();
