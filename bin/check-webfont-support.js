#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const semver = require("semver");

const GAME_ROOT = process.cwd();
const PKG_PATH = path.join(GAME_ROOT, "package.json");
const REQUIRED_VERSION = "10.8.0";
const DEP_NAME = "ctp-iwg-framework";

function extractVersion(rawVersion) {
    // e.g., "github:camelotls/ctp-iwg-framework#10.9.1"
    if (rawVersion.startsWith("github:")) {
        const match = rawVersion.match(/#(.+)$/);
        return match ? match[1] : null;
    }
    return rawVersion;
}

function checkWebfontSupport() {
    if (!fs.existsSync(PKG_PATH)) {
        console.error("❌ No package.json found in current directory.");
        process.exit(1);
    }

    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const rawVersion = deps[DEP_NAME];

    if (!rawVersion) {
        console.log(`ℹ️ Framework "${DEP_NAME}" not found in dependencies.`);
        process.exit(0);
    }

    const cleanVersion = extractVersion(rawVersion);

    if (!semver.valid(cleanVersion)) {
        console.log(`⚠️ Could not parse framework version: "${rawVersion}"`);
        process.exit(1);
    }

    const isSupported = semver.gte(cleanVersion, REQUIRED_VERSION);

    if (isSupported) {
        console.log(`✅ Webfonts are supported (framework version ${cleanVersion} ≥ ${REQUIRED_VERSION})`);
        process.exit(0);
    } else {
        console.log(`❌ Webfonts not supported (framework version ${cleanVersion} < ${REQUIRED_VERSION})`);
        process.exit(1);
    }
}

checkWebfontSupport();
