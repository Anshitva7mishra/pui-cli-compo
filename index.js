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
  auth: "https://github.com/Anshitva7mishra/pookie-auth-cl1.git",
};

async function ensureCompParent() {
  const compParent = path.resolve(process.cwd(), "src", "comp");
  if (!fs.existsSync(path.resolve(process.cwd(), "src"))) {
    await fsExtra.ensureDir(path.resolve(process.cwd(), "src"));
  }
  await fsExtra.ensureDir(compParent);
  return compParent;
}

async function promptIfExists(targetDir) {
  if (!fs.existsSync(targetDir)) return { action: "create" };

  console.log(chalk.yellow(`\n❌ Folder already exists: ${targetDir}\n`));

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
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

async function installComponent(url, targetDir, mode) {
  const tempParent = path.resolve(process.cwd(), ".compo_tmp");
  await fsExtra.ensureDir(tempParent);
  const tempDir = path.join(tempParent, `clone_${Date.now()}`);

  try {
    await cloneToTemp(url, tempDir);

    if (mode === "overwrite") {
      const removing = ora({
        text: `Removing existing folder ${targetDir}`,
        color: "yellow",
      }).start();
      await fsExtra.remove(targetDir);
      removing.succeed("Old folder removed");
      await fsExtra.move(tempDir, targetDir);
    } else if (mode === "merge") {
      await fsExtra.ensureDir(targetDir);
      const copying = ora({
        text: `Merging files into ${targetDir}`,
        color: "yellow",
      }).start();
      await fsExtra.copy(tempDir, targetDir, {
        overwrite: false,
        errorOnExist: false,
      });
      copying.succeed("Files merged (existing files preserved)");
      await fsExtra.remove(tempDir);
    } else {
      await fsExtra.move(tempDir, targetDir);
    }

    const gitFolder = path.join(targetDir, ".git");
    if (await fsExtra.pathExists(gitFolder)) {
      await fsExtra.remove(gitFolder);
    }

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

  const compParent = await ensureCompParent();

  const compFolderName = `${component}Compo`;
  const targetDir = path.resolve(compParent, compFolderName);

  const { action } = await promptIfExists(targetDir);

  if (action === "cancel") {
    console.log(chalk.cyan("\n⚠️  Operation cancelled by the user.\n"));
    process.exit(0);
  }

  const mode = action === undefined || action === "create" ? "create" : action;

  console.log(chalk.yellow("\n📥 Installing component..."));

  try {
    await installComponent(url, targetDir, mode);

    console.log(chalk.green(`\n✅ Installed: ${component}`));
    console.log(chalk.cyan(`📂 Saved to: src/comp/${compFolderName}\n`));
    console.log(chalk.magenta("🎉 Enjoy your new component!\n"));
  } catch (err) {
    console.log(
      chalk.red(`\n❌ Failed to install ${component}: ${err.message}\n`)
    );
    process.exit(1);
  }
}

run();
