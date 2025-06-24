const path = require("path");
const fs = require("fs/promises");

/**
 * Recursively search for the first spine folder under imageDir
 */
const findSpineFolder = async (rootDir) => {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (entry.name.toLowerCase() === "spine" || entry.name.toLowerCase() === "spines") {
                return path.join(rootDir, entry.name);
            }
            const subResult = await findSpineFolder(path.join(rootDir, entry.name));
            if (subResult) return subResult;
        }
    }
    return null;
};

/**
 * Find atlas file
 */
const findAtlasFile = async (spineFolder) => {
    const entries = await fs.readdir(spineFolder);
    for (const file of entries) {
        if (file.toLowerCase().endsWith(".atlas")) {
            return path.join(spineFolder, file);
        }
    }
    return null;
};

/**
 * Parse atlas
 */
const parseAtlas = (atlasContent) => {
    const lines = atlasContent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const imageToSpines = {};
    let currentImage = null;

    for (const line of lines) {
        if (line.endsWith(".png")) {
            console.log("🖼 Found image page:", line);
            currentImage = line;
            imageToSpines[currentImage] = new Set();
            continue;
        }

        if (!currentImage) {
            console.warn("⚠️ Region found before image:", line);
            continue;
        }

        if (line.includes(":")) {
            // metadata like size, bounds, rotate, offsets, etc → skip
            continue;
        }

        // this is region name
        const folder = line.includes("/") ? line.split("/")[0] : line;
        imageToSpines[currentImage].add(folder);
    }

    const result = {};
    for (const [image, spines] of Object.entries(imageToSpines)) {
        result[image] = Array.from(spines).sort();
    }

    return result;
};

/**
 * Main exported function
 */
const extractSpineImageUsage = async (imageDir) => {
    const absImageDir = path.resolve(imageDir);
    console.log("🔎 Searching for spine folder inside:", absImageDir);
    const spineFolder = await findSpineFolder(absImageDir);
    if (!spineFolder) {
        console.error("❌ No spine folder found.");
        return null;
    }

    const atlasPath = await findAtlasFile(spineFolder);
    if (!atlasPath) {
        console.error("❌ No .atlas file found inside spine folder.");
        return null;
    }

    const atlasContent = await fs.readFile(atlasPath, "utf-8");
    const result = parseAtlas(atlasContent);

    console.log("🎯 Extraction complete.");
    return result;
};

module.exports = { extractSpineImageUsage };
