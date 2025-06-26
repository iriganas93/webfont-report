const { getAllImageFilesPaths, saveReportFile, generateOcrDataJS, copyTextImagesFlat } = require("./utils/file.utils");
const { getImagesOCR } = require("./utils/ocr.utils");
const { getCodeFilesUsage, getOCRTextMap, getResourceUsageByLayer } = require("./utils/transformations.utils");
const { extractSpineImageUsage } = require("./utils/spine.utils");
const { copyHtmlViewerFiles } = require("./utils/htmlViewer.utils");
const { generateSpreadsheetData } = require("./utils/csv.utils");

const TARGET_DIR = "webfonts-ocr";

const OCR_FILES_PATHS = {
    RESULTS: `${TARGET_DIR}/ocr-results.json`,
    TEXT_MAP: `${TARGET_DIR}/ocr-text-map.json`,
    SUMMARY: `${TARGET_DIR}/ocr-summary.json`,
    LAYER_FILES: `${TARGET_DIR}/layer-files-usage.json`,
    SPINES: `${TARGET_DIR}/ocr-spines.json`,
    SPREADSHEET: `${TARGET_DIR}/ocr-spreadsheet.csv`,
    HTML_VIEWER_IMAGES: `${TARGET_DIR}/images`,
};

async function getWebFontOCR({ imageDir, componentDir, gameLayers, writeReportsFiles = true, excludedFolders = [] }) {
    const imageFilePaths = getAllImageFilesPaths(imageDir, excludedFolders);

    const { results, withText, withoutText, lowConfidence } = await getImagesOCR(imageFilePaths, imageDir);
    console.log(`📊 Images with text: ${withText}`);
    console.log(`📊 Images without text: ${withoutText}`);

    const spineImagesRegions = await extractSpineImageUsage(imageDir);
    await getCodeFilesUsage(results, componentDir, spineImagesRegions);
    const layersResults = getResourceUsageByLayer(results, gameLayers);

    await copyHtmlViewerFiles(TARGET_DIR);
    copyTextImagesFlat(results, imageDir, OCR_FILES_PATHS.HTML_VIEWER_IMAGES);
    await generateSpreadsheetData(results, imageDir, OCR_FILES_PATHS.SPREADSHEET);
    generateOcrDataJS(TARGET_DIR, layersResults);

    if (writeReportsFiles) {
        saveReportFile(OCR_FILES_PATHS.RESULTS, results, "OCR Results");
        saveReportFile(OCR_FILES_PATHS.SPINES, spineImagesRegions, "Spines Map");
        saveReportFile(OCR_FILES_PATHS.TEXT_MAP, getOCRTextMap(results), "Text Map");
        saveReportFile(OCR_FILES_PATHS.LAYER_FILES, layersResults.gameLayersUsage);
        saveReportFile(OCR_FILES_PATHS.SUMMARY, {
            totalImages: imageFilePaths.length,
            imagesWithText: withText,
            imagesWithoutText: withoutText,
            lowConfidence: lowConfidence,
        });
    }

    return layersResults;
}

module.exports = {
    getWebFontOCR,
};
