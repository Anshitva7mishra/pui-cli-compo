#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import simpleGit from "simple-git";
import fs from "fs";

console.log(chalk.blue("\n🚀 React Component Installer CLI\n"));

// Add your actual GitHub component URLs
const components = {
  auth: "https://github.com/Anshitva7mishra/pookie-auth-cl1.git",
};

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
  const targetDir = `./src/${component}`;

  // Ensure src folder exists
  if (!fs.existsSync("./src")) {
    fs.mkdirSync("./src");
  }

  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`❌ Folder already exists: ${targetDir}`));
    process.exit(1);
  }

  console.log(chalk.yellow("📥 Downloading component..."));

  const git = simpleGit();

  try {
    await git.clone(url, targetDir);
  } catch (err) {
    console.log(chalk.red(`❌ Failed to clone ${component}: ${err.message}`));
    process.exit(1);
  }

  console.log(chalk.green(`\n✅ Installed: ${component}`));
  console.log(chalk.cyan(`📂 Saved to: src/${component}\n`));
  console.log(chalk.magenta("🎉 Enjoy your new component!\n"));
}

run();
