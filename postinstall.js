const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd(); // ← this is the game project root
const configFile = "webfont-report.config.json";

const destPath = path.join(projectRoot, configFile);
const defaultPath = path.resolve(__dirname, "default-config.json");

if (!fs.existsSync(destPath)) {
    fs.copyFileSync(defaultPath, destPath);
    console.log(`✅ Created ${configFile} in ${projectRoot}`);
} else {
    console.log(`ℹ️ ${configFile} already exists in ${projectRoot}`);
}
