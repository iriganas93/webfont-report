const fs = require("fs");
const path = require("path");
const vision = require("@google-cloud/vision");

const internalCredsPath = path.resolve(__dirname, "./vision.config.json");
process.env.GOOGLE_APPLICATION_CREDENTIALS = internalCredsPath;

if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS not found. Vision API may fail.");
}

const client = new vision.ImageAnnotatorClient();

function isImageFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".bmp", ".tiff"].includes(ext);
}

function isExcludedFolder(filePath, excludedFolders) {
    const segments = filePath.split(path.sep);
    return segments.some((seg) => excludedFolders.includes(seg));
}

function getAllImageFiles(dirPath, excludedFolders) {
    let results = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (isExcludedFolder(fullPath, excludedFolders)) continue;
            results = results.concat(getAllImageFiles(fullPath, excludedFolders));
        } else if (entry.isFile() && isImageFile(fullPath)) {
            if (!isExcludedFolder(fullPath, excludedFolders)) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

async function mapImageUsage(results, componentDir) {
    const jsFiles = [];

    function collect(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                collect(fullPath);
            } else if (entry.isFile() && entry.name === "index.js") {
                jsFiles.push(fullPath);
            }
        }
    }

    collect(componentDir);

    for (const [relativePath, data] of Object.entries(results)) {
        if (!data.hasText) continue;
        const imageFileName = path.basename(relativePath);
        const usedIn = [];

        for (const js of jsFiles) {
            const content = fs.readFileSync(js, "utf8");
            if (content.includes(`"${imageFileName}"`) || content.includes(`'${imageFileName}'`)) {
                usedIn.push(path.relative(process.cwd(), js));
            }
        }

        if (usedIn.length > 0) {
            results[relativePath].usedInComponents = usedIn;
            console.log(`🔗 Matched "${imageFileName}" in:`, usedIn);
        }
    }
}

function generateTextMap(results, outputPath) {
    const map = {};
    for (const [rel, data] of Object.entries(results)) {
        if (data.hasText && data.textRaw) {
            const base = path.basename(rel, path.extname(rel));
            const key = base.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
            map[key] = data.textRaw;
        }
    }

    fs.writeFileSync(outputPath, JSON.stringify(map, null, 2), "utf8");
}

function ensureDirForFile(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
}

function writeSummary(summaryPath, stats) {
    ensureDirForFile(summaryPath);
    fs.writeFileSync(summaryPath, JSON.stringify(stats, null, 2), "utf8");
}

async function analyze({
                           imageDir,
                           componentDir,
                           resultPath,
                           textMapPath,
                           summaryPath,
                           excludedFolders = []
                       }) {
    const results = {};
    const files = getAllImageFiles(imageDir, excludedFolders);
    let withText = 0;
    let withoutText = 0;
    const lowConfidence = [];

    for (const file of files) {
        const rel = path.relative(imageDir, file);
        console.log("🔍 Processing:", rel);

        try {
            const [res] = await client.documentTextDetection(file);
            const annotation = res.fullTextAnnotation;

            let textRaw = "";
            let confidence = null;
            let scores = [];

            annotation?.pages?.forEach((page) =>
                page.blocks?.forEach((block) =>
                    block.paragraphs?.forEach((para) => {
                        if (typeof para.confidence === "number") {
                            scores.push(para.confidence);
                        }
                    })
                )
            );

            if (annotation?.text) {
                textRaw = annotation.text.trim();
            }

            if (scores.length > 0 && textRaw.length > 0) {
                confidence = parseFloat((scores.reduce((a, b) => a + b) / scores.length).toFixed(2));
            }

            const hasText = textRaw.length > 0;
            hasText ? withText++ : withoutText++;

            if (hasText && confidence !== null && confidence < 0.8) {
                lowConfidence.push({ file: rel, confidence });
            }

            results[rel] = {
                hasText,
                textRaw,
                confidence: hasText ? confidence : null
            };
        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err.message);
            results[rel] = {
                hasText: false,
                textRaw: "",
                confidence: null,
                error: err.message
            };
            withoutText++;
        }
    }

    await mapImageUsage(results, componentDir);

    ensureDirForFile(resultPath);
    fs.writeFileSync(resultPath, JSON.stringify(results, null, 2), "utf8");

    ensureDirForFile(textMapPath);
    generateTextMap(results, textMapPath);

    writeSummary(summaryPath, {
        totalImages: files.length,
        imagesWithText: withText,
        imagesWithoutText: withoutText,
        lowConfidence: lowConfidence
    });

    console.log("✅ Analysis complete.");
    console.log(`📊 Images with text: ${withText}`);
    console.log(`📊 Images without text: ${withoutText}`);
    console.log(`📋 Summary saved to: ${summaryPath}`);
}

module.exports = {
    analyze
};
