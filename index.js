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
import boxen from "boxen";
import components from "./components.config.js";

const welcome = `
   ${chalk.bgCyan.black.bold("  PROJECT UI  ")} ${chalk.cyan(
  "— Premium React Ecosystem"
)}
   ${chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
   ${chalk.white("⚡ Framework  • ")} ${chalk.blue("React + Tailwind")}
   ${chalk.white("🌐 Website    • ")} ${chalk.underline.blue(
  "https://projectui.in"
)}
   ${chalk.white("⭐ Community  • ")} ${chalk.italic.yellow(
  "Star us on GitHub if you like this!"
)}
   ${chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
`;

console.log(welcome);

const cwd = process.cwd();
let arg = process.argv[2];
const tempRoot = path.join(os.tmpdir(), "pui-create");

async function cloneToTemp(url, tempDir) {
  const git = simpleGit();
  const spinner = ora({
    text: chalk.cyan("Connecting to remote registry..."),
    spinner: "dots12",
  }).start();
  try {
    await git.clone(url, tempDir, ["--depth", "1"]);
    spinner.succeed(chalk.green("Assets synchronized successfully"));
  } catch (e) {
    spinner.fail(chalk.red("Registry connection failed"));
    throw e;
  }
}

async function ensureTarget(key) {
  const targetPath = path.join(cwd, "src", "components", `${key}Components`);
  await fsExtra.ensureDir(targetPath);
  return targetPath;
}

async function promptIfExists(targetDir) {
  if (!fs.existsSync(targetDir) || fs.readdirSync(targetDir).length === 0)
    return "create";
  console.log(
    `\n ${chalk.bgRed.white.bold(" CONFLICT ")} ${chalk.red(
      `The directory ${path.basename(targetDir)} already exists.`
    )}`
  );
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "How should we resolve this?",
      choices: [
        { name: chalk.yellow("Overwrite (Clean install)"), value: "overwrite" },
        { name: chalk.blue("Merge (Keep current files)"), value: "merge" },
        { name: chalk.gray("Cancel"), value: "cancel" },
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
    const gitDir = path.join(targetDir, ".git");
    if (await fsExtra.pathExists(gitDir)) await fsExtra.remove(gitDir);
    setTimeout(() => fsExtra.remove(tempDir).catch(() => {}), 500);
    return true;
  } catch (e) {
    setTimeout(() => fsExtra.remove(tempDir).catch(() => {}), 500);
    throw e;
  }
}

async function installFlow(key, repo) {
  const targetDir = await ensureTarget(key);
  const action = await promptIfExists(targetDir);
  if (action === "cancel") {
    console.log(chalk.gray("\nProcess terminated by user."));
    process.exit(0);
  }
  const spinner = ora({
    text: chalk.magenta(`Injecting ${chalk.bold(key)}...`),
    spinner: "binary",
  }).start();
  try {
    await installComponent(repo, targetDir, action);
    spinner.stop();

    const rainbow = chalkAnimation.rainbow(
      `✔ ${key.toUpperCase()} READY FOR DEPLOYMENT`
    );

    setTimeout(() => {
      rainbow.stop();
      process.stdout.write("\n");

      const content = `
${chalk.bold.green("🚀  MISSION ACCOMPLISHED!")}

${chalk.white("Your premium component has been successfully injected at:")}
${chalk.underline.cyan(`./src/components/${key}Components`)}

${chalk.bold.yellow("🔥  CRITICAL NEXT STEP:")}
${chalk.white("Open the")} ${chalk.bold.magenta("README.md")} ${chalk.white(
        "inside your new component folder."
      )}
${chalk.white(
  "It contains the specific dependencies you must download to run."
)}

${chalk.bgBlue.black.bold(" PRODUCTION READY ")}
${chalk.italic.white("Read the README further for expert tips on making your")}
${chalk.italic.white("newly installed component fully production ready.")}
      `.trim();

      console.log(
        boxen(content, {
          padding: 1,
          margin: { top: 1, bottom: 1, left: 2 },
          borderStyle: "double",
          borderColor: "magenta",
          title: chalk.bold(" PUI SUCCESS "),
          titleAlignment: "center",
        })
      );
    }, 1200);
  } catch (e) {
    spinner.fail(chalk.red("Deployment failed unexpectedly"));
    process.exit(1);
  }
}

async function run() {
  if (!arg) {
    const { category } = await inquirer.prompt([
      {
        type: "list",
        name: "category",
        message: chalk.white("Choose a blueprint category:"),
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
        message: `Select a ${chalk.bold.cyan(components[arg].label)} variant:`,
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
    console.log(chalk.red(`\n ✘ Unknown component ID: "${arg}"`));
    process.exit(1);
  }
  await installFlow(arg, found.repo);
}

run();
