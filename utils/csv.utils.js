const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { imageSize } = require("image-size");

const convertFilenameToKey = (filename) => {
    const baseName = path.basename(filename, path.extname(filename));
    return baseName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .toUpperCase();
};

const generateSpreadsheetData = async (ocrResults, imageDir, outputXlsxPath) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("OCR Results");

    worksheet.columns = [
        { header: "Image", key: "image", width: 35 },
        { header: "TextKey", key: "textKey", width: 35 },
        { header: "TextValue", key: "textValue", width: 50 },
    ];

    let rowIndex = 2;

    for (const [imagePath, data] of Object.entries(ocrResults)) {
        if (!data.hasText || !data.textRaw) continue;
        if (typeof data.confidence === "number" && data.confidence < 0.8) continue;

        const textKey = convertFilenameToKey(imagePath);
        const cleanText = data.textRaw.replace(/"/g, "''");

        worksheet.addRow({ image: "", textKey, textValue: cleanText });

        const fullImagePath = path.join(imageDir, imagePath);
        if (!fs.existsSync(fullImagePath)) {
            console.warn(`⚠️ Image not found: ${fullImagePath}`);
            rowIndex++;
            continue;
        }

        const imageBuffer = fs.readFileSync(fullImagePath);
        let dimensions;
        try {
            dimensions = imageSize(imageBuffer);
        } catch (err) {
            console.warn(`⚠️ Failed to read dimensions for: ${imagePath}`, err.message);
            rowIndex++;
            continue;
        }

        const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: path.extname(imagePath).substring(1).toLowerCase(),
        });

        // Double the previous max size
        const maxWidth = 280;
        const maxHeight = 240;
        const widthRatio = maxWidth / dimensions.width;
        const heightRatio = maxHeight / dimensions.height;
        const scale = Math.min(widthRatio, heightRatio, 1);
        const scaledWidth = Math.round(dimensions.width * scale);
        const scaledHeight = Math.round(dimensions.height * scale);

        worksheet.addImage(imageId, {
            tl: { col: 0, row: rowIndex - 1 },
            ext: { width: scaledWidth, height: scaledHeight },
        });

        // Ensure minimum row height of 50
        const calculatedRowHeight = Math.max(scaledHeight * 0.75, 50);
        worksheet.getRow(rowIndex).height = calculatedRowHeight;

        // Styling for image cell
        const cell = worksheet.getCell(`A${rowIndex}`);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF212423" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
        };

        rowIndex++;
    }

    await workbook.xlsx.writeFile(outputXlsxPath);
    console.log(`✅ Excel file generated at: ${outputXlsxPath}`);
};

module.exports = { generateSpreadsheetData };
