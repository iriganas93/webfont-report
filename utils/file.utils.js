const path = require("path");
const fs = require("fs");

const isImageFile = (filePath) => [".png", ".jpg", ".jpeg"].includes(path.extname(filePath).toLowerCase());

const isExcludedFolder = (filePath, excludedFolders) => filePath.split(path.sep).some((seg) => excludedFolders.includes(seg));

const ensureDirForFile = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const saveReportFile = (filePath, reportData) => {
    ensureDirForFile(filePath);
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2), "utf8");
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

module.exports = {
    isImageFile,
    isExcludedFolder,
    getAllImageFilesPaths,
    ensureDirForFile,
    saveReportFile,
};
