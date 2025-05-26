#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { analyze } = require("../index");

const CONFIG_FILE = "webfont-report.config.json";
const defaultConfigPath = path.resolve(__dirname, "../default-config.json");

const args = process.argv.slice(2);

// Handle `pnpm webfont-report init`
if (args.includes("init")) {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
        fs.copyFileSync(defaultConfigPath, configPath);
        console.log(`✅ Created ${CONFIG_FILE} in ${process.cwd()}`);
    } else {
        console.log(`ℹ️ ${CONFIG_FILE} already exists.`);
    }
    process.exit(0);
}

// Default behavior: run analysis
const configPath = path.resolve(process.cwd(), CONFIG_FILE);
if (!fs.existsSync(configPath)) {
    console.error(`❌ Missing ${CONFIG_FILE}. Run: pnpm webfont-report init`);
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const resolveFromRoot = (p) => path.resolve(process.cwd(), p);

analyze({
    imageDir: resolveFromRoot(config.imageDir),
    componentDir: resolveFromRoot(config.componentDir),
    resultPath: resolveFromRoot(config.resultPath),
    textMapPath: resolveFromRoot(config.textMapPath),
    summaryPath: resolveFromRoot(config.summaryPath),
    excludedFolders: config.excludedFolders || []
});
