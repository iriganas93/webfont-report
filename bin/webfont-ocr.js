#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { getWebFontOCR } = require("../index");

const CONFIG_FILE = "webfont-ocr.config.json";
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
    console.error(`❌ Missing ${CONFIG_FILE}. Run: pnpm webfont-ocr init`);
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const resolveFromRoot = (p) => path.resolve(process.cwd(), p);

if (!config?.imageDir) {
    console.error(
        `❌ Missing "imageDir" in ${CONFIG_FILE}. Please ensure to add the main folder of the raw assets that will be scanned and processed with OCR.`,
    );
    process.exit(1);
}

if (!config?.componentDir) {
    console.error(
        `❌ Missing "componentDir" in ${CONFIG_FILE}. Please ensure to add the main folder of the game components to check the usage of resources in code.`,
    );
    process.exit(1);
}

if (!config?.gameLayers) {
    console.error(
        `❌ Missing "gameLayers" in ${CONFIG_FILE}. Please ensure you define the game layers based on the game structure to categorize resources usage by layer.`,
    );
    process.exit(1);
}

getWebFontOCR({
    imageDir: resolveFromRoot(config.imageDir),
    componentDir: resolveFromRoot(config.componentDir),
    resultPath: config?.textMapPath ? resolveFromRoot(config.resultPath) : null,
    textMapPath: config?.textMapPath ? resolveFromRoot(config.textMapPath) : null,
    summaryPath: config?.summaryPath ? resolveFromRoot(config.summaryPath) : null,
    layerFilesPath: config?.layerFilesPath ? resolveFromRoot(config.layerFilesPath) : null,
    gameLayers: config.gameLayers,
    excludedFolders: config.excludedFolders || [],
}).then((result) => {
    console.log(`📊 Resource usage by game layer:`, result.counts);
    console.log("✅ Analysis complete.");
});
