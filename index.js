#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import simpleGit from "simple-git";
import fs from "fs";

console.log(chalk.blue("\n🚀 React Component Installer CLI\n"));

// add all your components here
const components = {
  auth: "https://github.com/YOUR_USERNAME/auth-component.git",
  navbar: "https://github.com/YOUR_USERNAME/navbar-component.git",
  sidebar: "https://github.com/YOUR_USERNAME/sidebar-component.git",
  hero: "https://github.com/YOUR_USERNAME/hero-component.git",
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

  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`❌ Folder already exists: ${targetDir}`));
    process.exit(1);
  }

  console.log(chalk.yellow("📥 Downloading component..."));

  const git = simpleGit();
  await git.clone(url, targetDir);

  console.log(chalk.green(`\n✅ Installed: ${component}`));
  console.log(chalk.cyan(`📂 Saved to: src/${component}\n`));
}

run();
