const path = require("path");
const fs = require("fs");
const vision = require("@google-cloud/vision");
const orcResultsMocked = require("../mocks/ocr-results-mocked-puck-shot-expander.json");

const MOCK_RESULTS = true;

// Always prefer env variable (as Google officially recommends)
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // fallback: check for vision.config.json in current working directory (project root)
    const fallbackPath = path.resolve(process.cwd(), "vision.config.json");
    if (fs.existsSync(fallbackPath)) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = fallbackPath;
        console.log(`✅ Using fallback vision config: ${fallbackPath}`);
    } else {
        console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS not found. Vision API may fail.");
    }
}

async function processImagesOCR(files, imageDir) {
    const results = {};
    let withText = 0;
    let withoutText = 0;
    const lowConfidence = [];

    const client = new vision.ImageAnnotatorClient();

    console.log("🔍 Processing images:", files.length);
    for (const file of files) {
        const rel = path.relative(imageDir, file);

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
                    }),
                ),
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
                confidence: hasText ? confidence : null,
            };
        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err.message);
            results[rel] = {
                hasText: false,
                textRaw: "",
                confidence: null,
                error: err.message,
            };
            withoutText++;
        }
    }

    return {
        results,
        withText,
        withoutText,
        lowConfidence,
    };
}

const mapOCRValues = (results) => {
    let withText = 0;
    let withoutText = 0;
    const lowConfidence = [];

    for (const file in results) {
        const { hasText, confidence } = results[file];
        if (hasText) {
            withText++;
            if (confidence !== null && confidence < 0.8) {
                lowConfidence.push({ file, confidence });
            }
        } else {
            withoutText++;
        }
    }

    return {
        results,
        withText,
        withoutText,
        lowConfidence,
    };
};

const getImagesOCR = (files, imageDir) => {
    if (MOCK_RESULTS) {
        console.log("Using mocked OCR results for testing.");
        return Promise.resolve(mapOCRValues(orcResultsMocked));
    }
    return processImagesOCR(files, imageDir);
};

module.exports = { getImagesOCR };
