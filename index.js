const fs = require("fs");
const path = require("path");
const { getAllImageFilesPaths, saveReportFile, generateOcrDataJS } = require("./utils/file.utils");
const { getImagesOCR } = require("./utils/ocr.utils");
const { getCodeFilesUsage, getOCRTextMap, getResourceUsageByLayer } = require("./utils/transformations.utils");
const { extractSpineImageUsage } = require("./utils/spine.utils");
const { copyHtmlViewerFiles } = require("./utils/htmlViewer.utils");

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

async function getWebFontOCR({
    imageDir,
    componentDir,
    resultPath,
    textMapPath,
    summaryPath,
    layerFilesPath,
    gameLayers,
    htmlViewer = true,
    excludedFolders = [],
    copyTextImagesTo = null,
}) {
    const imageFilePaths = getAllImageFilesPaths(imageDir, excludedFolders);
    const { results, withText, withoutText, lowConfidence } = await getImagesOCR(imageFilePaths, imageDir);

    console.log(`📊 Images with text: ${withText}`);
    console.log(`📊 Images without text: ${withoutText}`);

    const spineImagesRegions = await extractSpineImageUsage(imageDir);
    saveReportFile("webfonts-ocr/ocr-spines.json", spineImagesRegions);

    await getCodeFilesUsage(results, componentDir, spineImagesRegions);

    if (resultPath) {
        saveReportFile(resultPath, results);
        console.log(`📋 OCR Results written to: ${resultPath}`);
    }
    if (textMapPath) {
        saveReportFile(textMapPath, getOCRTextMap(results));
        console.log(`📋 OCR Text map written to: ${textMapPath}`);
    }
    if (summaryPath) {
        saveReportFile(summaryPath, {
            totalImages: imageFilePaths.length,
            imagesWithText: withText,
            imagesWithoutText: withoutText,
            lowConfidence: lowConfidence,
        });
        console.log(`📋 OCR Summary written to: ${summaryPath}`);
    }

    if (htmlViewer) {
        await copyHtmlViewerFiles("webfonts-ocr");
    }

    const layersResults = getResourceUsageByLayer(results, gameLayers);
    if (layerFilesPath) {
        saveReportFile(layerFilesPath, layersResults.gameLayersUsage);
        console.log(`📋 Layer files usage written to: ${layerFilesPath}`);
        generateOcrDataJS("webfonts-ocr", layersResults);
    }

    if (copyTextImagesTo) {
        copyTextImagesFlat(results, imageDir, copyTextImagesTo);
    }

    return layersResults;
}

module.exports = {
    getWebFontOCR,
};
