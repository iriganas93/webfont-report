const { getAllImageFilesPaths, saveReportFile } = require("./utils/file.utils");
const { getImagesOCR } = require("./utils/ocr.utils");
const { getCodeFilesUsage, getOCRTextMap, getResourceUsageByLayer } = require("./utils/transformations.utils");

async function getWebFontOCR({
    imageDir,
    componentDir,
    resultPath,
    textMapPath,
    summaryPath,
    layerFilesPath,
    gameLayers,
    excludedFolders = [],
}) {
    const imageFilePaths = getAllImageFilesPaths(imageDir, excludedFolders);

    const { results, withText, withoutText, lowConfidence } = await getImagesOCR(imageFilePaths, imageDir);

    console.log(`📊 Images with text: ${withText}`);
    console.log(`📊 Images without text: ${withoutText}`);

    await getCodeFilesUsage(results, componentDir);
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

    const layersResults = getResourceUsageByLayer(results, gameLayers);

    if (layerFilesPath) {
        saveReportFile(layerFilesPath, layersResults.gameLayersUsage);
        console.log(`📋 Layer files usage written to: ${layerFilesPath}`);
    }
    return layersResults;
}

module.exports = {
    getWebFontOCR,
};
