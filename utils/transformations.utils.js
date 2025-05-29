const fs = require("fs");
const path = require("path");

const getCodeFilesUsage = (ocrResults, gameComponentsDirectoryPath) => {
    const jsFiles = [];

    function collect(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collect(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".js")) {
                jsFiles.push(fullPath);
            }
        }
    }

    collect(gameComponentsDirectoryPath);

    for (const [relativePath, data] of Object.entries(ocrResults)) {
        if (!data.hasText) continue;

        const imageFileName = path.basename(relativePath); // e.g., text-1.png
        const nameWithoutExt = imageFileName.replace(/\.[^/.]+$/, ""); // e.g., text-1
        const nameBase = nameWithoutExt.replace(/[-_]\d+$/, ""); // e.g., text

        const usedIn = [];

        for (const js of jsFiles) {
            const content = fs.readFileSync(js, "utf8");

            if (content.includes(`"${imageFileName}`) || content.includes(`"${nameWithoutExt}`) || content.includes(`"${nameBase}`)) {
                usedIn.push(path.relative(process.cwd(), js));
            }
        }

        if (usedIn.length > 0) {
            ocrResults[relativePath].usedInComponents = usedIn;
            // console.log(`🔗 Matched "${imageFileName}" or base in:`, usedIn);
        }
    }
};

const getOCRTextMap = (ocrResults) => {
    const map = {};
    for (const [rel, data] of Object.entries(ocrResults)) {
        if (data.hasText && data.textRaw) {
            const base = path.basename(rel, path.extname(rel));
            const key = base.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
            map[key] = data.textRaw;
        }
    }

    return map;
};

const findBestLayerGroup = (componentPath, layerGroups) => {
    let bestMatch = null;

    for (const group of layerGroups) {
        if (componentPath.includes(group)) {
            if (!bestMatch || group.length > bestMatch.length) {
                bestMatch = group;
            }
        }
    }

    return bestMatch;
};

const summarizeLayerCounts = (resourceUsageByLayer) => {
    const summary = {};

    for (const [layer, data] of Object.entries(resourceUsageByLayer)) {
        summary[layer] = data.count || 0;
    }

    return summary;
};

const getResourceUsageByLayer = (ocrResults, layerGroups) => {
    const resultByGroup = {};

    for (const [imageKey, data] of Object.entries(ocrResults)) {
        if (!data.hasText || !Array.isArray(data.usedInComponents)) continue;

        let matched = false;

        for (const componentPath of data.usedInComponents) {
            const group = findBestLayerGroup(componentPath, layerGroups);
            const simplifiedKey = group ? group.split("/").pop() : "uncategorized";

            if (!resultByGroup[simplifiedKey]) {
                resultByGroup[simplifiedKey] = {
                    count: 0,
                    images: new Set(),
                    files: new Set(),
                };
            }

            resultByGroup[simplifiedKey].images.add(imageKey);
            resultByGroup[simplifiedKey].files.add(componentPath);

            if (!group) {
                console.log(`📎 Uncategorized image: ${imageKey} (used in: ${componentPath})`);
            }

            matched = matched || Boolean(group);
        }

        if (!matched && data.usedInComponents.length === 0) {
            const fallback = "uncategorized";
            if (!resultByGroup[fallback]) {
                resultByGroup[fallback] = {
                    count: 0,
                    images: new Set(),
                    files: new Set(),
                };
            }

            resultByGroup[fallback].images.add(imageKey);
            console.log(`📎 Uncategorized image (no components): ${imageKey}`);
        }
    }

    // Finalize results
    const gameLayersUsage = {};
    for (const [group, sets] of Object.entries(resultByGroup)) {
        gameLayersUsage[group] = {
            count: sets.images.size,
            images: Array.from(sets.images),
            files: Array.from(sets.files),
        };
    }

    const counts = summarizeLayerCounts(gameLayersUsage);
    return { gameLayersUsage, counts };
};

module.exports = { getCodeFilesUsage, getOCRTextMap, getResourceUsageByLayer };
