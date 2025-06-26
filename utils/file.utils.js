const path = require("path");
const fs = require("fs");

const resolveFromRoot = (p) => path.resolve(process.cwd(), p);

const isImageFile = (filePath) => [".png", ".jpg", ".jpeg"].includes(path.extname(filePath).toLowerCase());

const isExcludedFolder = (filePath, excludedFolders) => filePath.split(path.sep).some((seg) => excludedFolders.includes(seg));

const ensureDirForFile = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const saveReportFile = (filePath, reportData, label = "OCR Results") => {
    ensureDirForFile(filePath);
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), "utf8");
    console.log(`📋 ${label} written to: ${filePath}`);
};

const getAllImageFilesPaths = (dirPath, excludedFolders) => {
    let results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            if (isExcludedFolder(fullPath, excludedFolders)) continue;
            results = results.concat(getAllImageFilesPaths(fullPath, excludedFolders));
        } else if (entry.isFile() && isImageFile(fullPath) && !isExcludedFolder(fullPath, excludedFolders)) {
            results.push(fullPath);
        }
    }

    return results;
};

/**
 * Generates a standalone JS file with the ocrData constant for easy frontend consumption
 */
const generateOcrDataJS = (outputPath, layersResults) => {
    const outputFile = path.join(resolveFromRoot(outputPath), "index.js");
    const content = `const ocrData = ${JSON.stringify(layersResults.gameLayersUsage, null, 2)};\n`;

    try {
        fs.writeFileSync(outputFile, content, "utf-8");
        console.log(`📄 OCR data JS file written to: ${outputFile}`);
    } catch (err) {
        console.error(`❌ Failed to write ocrData JS file:`, err.message);
    }
};

/**
 * Copies all images with hasText: true into a single output folder (flat)
 */
function copyTextImagesFlat(results, imageDir, outputDir) {
    console.log(`📦 Copying images with text to: ${outputDir}`);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const [imageRelPath, data] of Object.entries(results)) {
        if (!data.hasText) continue;

        const sourcePath = path.join(imageDir, imageRelPath);
        const fileNameOnly = path.basename(imageRelPath);
        const destPath = path.join(outputDir, fileNameOnly);

        try {
            if (!fs.existsSync(sourcePath)) {
                console.warn(`⚠️ Source image not found: ${sourcePath}`);
                continue;
            }
            fs.copyFileSync(sourcePath, destPath);
            // console.log(`✅ Copied: ${fileNameOnly}`);
        } catch (err) {
            console.error(`❌ Failed to copy ${fileNameOnly}:`, err.message);
        }
    }
}

module.exports = {
    isImageFile,
    isExcludedFolder,
    getAllImageFilesPaths,
    ensureDirForFile,
    saveReportFile,
    generateOcrDataJS,
    copyTextImagesFlat,
};
