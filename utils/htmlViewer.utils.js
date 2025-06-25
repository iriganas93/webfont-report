const fs = require("fs/promises");
const path = require("path");

const copyHtmlViewerFiles = async (targetDir) => {
    const sourceDir = path.join(__dirname, "../htmlCopy");

    try {
        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true });

        const files = await fs.readdir(sourceDir);

        for (const file of files) {
            const sourceFilePath = path.join(sourceDir, file);
            const targetFilePath = path.join(targetDir, file);

            const stat = await fs.stat(sourceFilePath);
            if (stat.isFile()) {
                await fs.copyFile(sourceFilePath, targetFilePath);
                console.log(`✅ Copied ${file} to ${targetDir}`);
            }
        }

        console.log("🎯 HTML viewer files copied successfully.");
    } catch (err) {
        console.error("❌ Error while copying viewer files:", err);
    }
};

module.exports = { copyHtmlViewerFiles };
