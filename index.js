#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import simpleGit from "simple-git";
import fs from "fs";
import fsExtra from "fs-extra";
import path from "path";
import ora from "ora";

console.log(chalk.blue("\n🚀 React Component Installer CLI\n"));

const components = {
  pookie_auth: "https://github.com/Anshitva7mishra/pookie-auth-cl1.git",
  grad_auth: "https://github.com/Sarthak-Saghal/auth-cl1.git",
};


async function cloneToTemp(url, tempDir) {
  const git = simpleGit();
  const spinner = ora({
    text: "Cloning repository...",
    color: "yellow",
  }).start();
  try {
    await git.clone(url, tempDir, ["--depth", "1"]);
    spinner.succeed("Repository cloned");
  } catch (err) {
    spinner.fail("Failed to clone repository");
    throw err;
  }
}

async function ensureTarget(component) {
  const srcDir = path.resolve(process.cwd(), "src");
  const compsDir = path.join(srcDir, "components");
  await fsExtra.ensureDir(srcDir);
  await fsExtra.ensureDir(compsDir);
  const compFolderName = `${component}Components`;
  const targetDir = path.join(compsDir, compFolderName);
  return targetDir;
}

async function promptIfExistsSimple(targetDir) {
  if (!fs.existsSync(targetDir)) return { action: "create" };
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: `Folder already exists: ${targetDir}. What would you like to do?`,
      choices: [
        {
          name: "Overwrite the folder (delete & fresh install)",
          value: "overwrite",
        },
        {
          name: "Merge: keep existing files, only add missing files",
          value: "merge",
        },
        { name: "Cancel installation", value: "cancel" },
      ],
      default: "cancel",
    },
  ]);
  return { action };
}

async function pickSourceInClone(tempDir, component) {
  const candidates = [
    path.join(tempDir, "src", component),
    path.join(tempDir, component),
    path.join(tempDir, "src"),
    tempDir,
  ];
  for (const c of candidates) {
    if (await fsExtra.pathExists(c)) {
      const stat = await fsExtra.stat(c);
      if (stat.isDirectory()) return c;
    }
  }
  return tempDir;
}

async function installComponent(url, targetDir, mode, component) {
  const tempParent = path.resolve(process.cwd(), ".compo_tmp");
  await fsExtra.ensureDir(tempParent);
  const tempDir = path.join(tempParent, `clone_${Date.now()}`);
  try {
    await cloneToTemp(url, tempDir);
    let sourceDir = await pickSourceInClone(tempDir, component);
    const basename = path.basename(sourceDir);
    if (basename !== component) {
      const nested = path.join(sourceDir, component);
      if (
        (await fsExtra.pathExists(nested)) &&
        (await fsExtra.stat(nested)).isDirectory()
      ) {
        sourceDir = nested;
      }
    }
    if (mode === "overwrite") {
      const removing = ora({
        text: `Removing existing folder ${targetDir}`,
        color: "yellow",
      }).start();
      await fsExtra.remove(targetDir);
      removing.succeed("Old folder removed");
      await fsExtra.ensureDir(targetDir);
      await fsExtra.copy(sourceDir, targetDir, {
        overwrite: true,
        errorOnExist: false,
      });
    } else if (mode === "merge") {
      await fsExtra.ensureDir(targetDir);
      const copying = ora({
        text: `Merging files into ${targetDir}`,
        color: "yellow",
      }).start();
      await fsExtra.copy(sourceDir, targetDir, {
        overwrite: false,
        errorOnExist: false,
      });
      copying.succeed("Files merged (existing files preserved)");
    } else {
      await fsExtra.ensureDir(targetDir);
      await fsExtra.copy(sourceDir, targetDir, {
        overwrite: true,
        errorOnExist: false,
      });
    }
    const gitFolder = path.join(targetDir, ".git");
    if (await fsExtra.pathExists(gitFolder)) {
      await fsExtra.remove(gitFolder);
    }
    await fsExtra.remove(tempDir).catch(() => {});
    try {
      const remaining = await fsExtra.readdir(tempParent);
      if (remaining.length === 0) await fsExtra.remove(tempParent);
    } catch {}
  } catch (err) {
    await fsExtra.remove(tempDir).catch(() => {});
    throw err;
  }
}

async function run() {
  const { component } = await inquirer.prompt([
    {
      type: "list",
      name: "component",
      message: "Select component to install:",
      choices: Object.keys(components),
    },
  ]);
  const url = components[component];
  const targetDir = await ensureTarget(component);
  const { action } = await promptIfExistsSimple(targetDir);
  if (action === "cancel") {
    console.log(chalk.cyan("\n⚠️  Operation cancelled by the user.\n"));
    process.exit(0);
  }
  const mode = action === undefined || action === "create" ? "create" : action;
  console.log(chalk.yellow("\n📥 Installing component..."));
  try {
    await installComponent(url, targetDir, mode, component);
    console.log(chalk.green(`\n✅ Installed: ${component}`));
    console.log(
      chalk.cyan(`📂 Saved to: src/components/${component}Components\n`)
    );
    console.log(chalk.magenta("🎉 Enjoy your new component!\n"));
  } catch (err) {
    console.log(
      chalk.red(`\n❌ Failed to install ${component}: ${err.message}\n`)
    );
    process.exit(1);
  }
}

run();
