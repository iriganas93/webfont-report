const fs = require("fs");
const path = require("path");

/**
 * Recursively collect all JS files in component directory
 */
const collectJSFiles = (dir, jsFiles = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectJSFiles(fullPath, jsFiles);
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            jsFiles.push(fullPath);
        }
    }
    return jsFiles;
};

/**
 * Scan OCR results and track image usages in code files, also check for spine usages
 * @param {*} ocrResults — OCR parsed results
 * @param {*} gameComponentsDirectoryPath — components folder
 * @param {*} spineImageToRegions — spine data: { imageName: [regionNames] }
 */
const getCodeFilesUsage = (ocrResults, gameComponentsDirectoryPath, spineImageToRegions = {}) => {
    const jsFiles = collectJSFiles(gameComponentsDirectoryPath);

    for (const [relativePath, data] of Object.entries(ocrResults)) {
        if (!data.hasText) continue;

        const imageFileName = path.basename(relativePath); // full file name e.g. abc.png
        const nameWithoutExt = imageFileName.replace(/\.[^/.]+$/, ""); // no extension
        const nameBase = nameWithoutExt.replace(/[-_]\d+$/, ""); // stripped variant

        const isSpine = relativePath.includes("spine");

        const usedIn = [];

        for (const js of jsFiles) {
            const content = fs.readFileSync(js, "utf8");

            // Check for simple sprite image references
            if (content.includes(`"${imageFileName}`) || content.includes(`"${nameWithoutExt}`) || content.includes(`"${nameBase}`)) {
                usedIn.push(path.relative(process.cwd(), js));
                continue; // found direct reference
            }

            // If this is a spine image, also check for any regions under this image
            if (isSpine && spineImageToRegions[imageFileName]) {
                for (const spineRegion of spineImageToRegions[imageFileName]) {
                    // simple region name match
                    if (content.includes(`"${spineRegion}`) && content.includes(`autoDisplayObjectTypes.SPINE`)) {
                        usedIn.push(path.relative(process.cwd(), js));
                        break;
                    }
                }
            }
        }

        if (usedIn.length > 0) {
            ocrResults[relativePath].usedInComponents = usedIn;
        }
    }
};

/**
 * Build OCR text mapping
 */
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

/**
 * Find best layer matching component path
 */
const findBestLayerGroup = (componentPath, layerGroups) => {
    let bestMatch = null;
    for (const group of layerGroups) {
        if (componentPath.includes(group) && (!bestMatch || group.length > bestMatch.length)) {
            bestMatch = group;
        }
    }
    return bestMatch;
};

/**
 * Summarize simple counts by layer
 */
const summarizeLayerCounts = (resourceUsageByLayer) => {
    const summary = {};
    for (const [layer, data] of Object.entries(resourceUsageByLayer)) {
        summary[layer] = data.count || 0;
    }
    return summary;
};

/**
 * Generate final grouping by layer, allowing multi-group inclusion
 */
const getResourceUsageByLayer = (ocrResults, layerGroups) => {
    const resultByGroup = {};

    for (const [imageKey, data] of Object.entries(ocrResults)) {
        if (!data.hasText || !Array.isArray(data.usedInComponents)) continue;

        const isSpine = imageKey.includes("spine");

        // For every usedInComponents file, check its group
        for (const componentPath of data.usedInComponents) {
            const group = findBestLayerGroup(componentPath, layerGroups);
            const simplifiedKey = group ? group.split("/").pop() : "uncategorized";

            if (!resultByGroup[simplifiedKey]) {
                resultByGroup[simplifiedKey] = {
                    sprites: [],
                    spines: [],
                    files: new Set(),
                };
            }

            // Add the image entry to the group if not already added
            const imageArray = isSpine ? resultByGroup[simplifiedKey].spines : resultByGroup[simplifiedKey].sprites;
            const alreadyExists = imageArray.some((entry) => entry.image === imageKey);
            if (!alreadyExists) {
                imageArray.push({ image: imageKey, data });
            }

            // Add the specific file
            resultByGroup[simplifiedKey].files.add(componentPath);
        }

        // If no usedInComponents at all, fallback to uncategorized
        if (data.usedInComponents.length === 0) {
            const fallback = "uncategorized";
            if (!resultByGroup[fallback]) {
                resultByGroup[fallback] = {
                    sprites: [],
                    spines: [],
                    files: new Set(),
                };
            }

            const imageArray = isSpine ? resultByGroup[fallback].spines : resultByGroup[fallback].sprites;
            imageArray.push({ image: imageKey, data });
        }
    }

    // Finalize result object
    const gameLayersUsage = {};
    for (const [group, sets] of Object.entries(resultByGroup)) {
        gameLayersUsage[group] = {
            count: {
                sprites: sets.sprites.length,
                spines: sets.spines.length,
            },
            images: {
                sprites: sets.sprites,
                spines: sets.spines,
            },
            files: Array.from(sets.files),
        };
    }

    const counts = summarizeLayerCounts(gameLayersUsage);
    return { gameLayersUsage, counts };
};

module.exports = { getCodeFilesUsage, getOCRTextMap, getResourceUsageByLayer };
