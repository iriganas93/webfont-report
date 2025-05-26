# 📦 Webfont Report CLI

A utility to scan image assets in game projects and 
detect embedded text using Google Cloud Vision, generate OCR reports, and validate usage of supported webfont-ready framework versions.

---

## 🚀 Features

- Detects and extracts embedded text from image assets.
- Maps detected images to components (based on usage in `index.js` files).
- Outputs:
  - Full OCR results with confidence scores.
  - A clean image-to-text map.
  - A summary report of detected and undetected images.
- Can check if the project uses a `ctp-iwg-framework` version that supports **webfonts**.
- Can scan the games repository for bulk checking the games that have a framework version that support webfonts.
---

## 📦 Installation

This package is intended to be added locally into each game repo:

```bash
pnpm install -D webfont-report
```

> You may link it locally via a relative path during development:
> ```bash
> pnpm install -D file:../webfont-report
> ```

---

## 🧪 Setup

### 1. Initialize the Configuration File

Use the following command to create a starter JSON config:

```bash
pnpm webfont-report init
```

This generates a default file `webfont-report.config.json` in the project root.

### 2. Example Configuration

```json
{
  "imageDir": "./non-production-raw-assets/scene",
  "componentDir": "./src/scenes",
  "resultPath": "./webfonts-report/ocr-results.json",
  "textMapPath": "./webfonts-report/ocr-textMap.json",
  "summaryPath": "./webfonts-report/summary.json",
  "excludedFolders": ["loading", "particles", "bitmapFont"]
}
```

### 📘 Config Schema

| Key             | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `imageDir`       | Root folder containing all images to be scanned.                           |
| `componentDir`   | Root folder where `index.js` files are recursively checked for image usage.|
| `resultPath`     | Path where the **full OCR JSON** results will be written.                  |
| `textMapPath`    | Path where a **clean image-to-text** map will be saved.                    |
| `summaryPath`    | Path for saving a **summary** with totals and low-confidence entries.      |
| `excludedFolders`| Array of folder names to **exclude** from recursive image scanning.        |

---

## 🔍 Run the OCR Analysis

```bash
pnpm webfont-report
```

This will:
- Scan all images in `imageDir` (excluding any subfolders listed).
- Use Google Vision to detect text.
- Write all output files (`resultPath`, `textMapPath`, `summaryPath`).
- Log to the terminal a summary of results.

---

## 📄 Output Files

| File Path         | Contents                                                                 |
|------------------|--------------------------------------------------------------------------|
| `ocr-results.json`| Per-image detailed OCR data including text, confidence, and usage path. |
| `ocr-textMap.json`| Key-value JSON mapping filenames to extracted text.                     |
| `summary.json`    | Totals for images with/without text and any low-confidence entries.     |

---

## ✅ Webfont Version Check

Automatically checks if your game uses a version of `ctp-iwg-framework` >= `10.8.0` (which supports webfonts). This is reported in the summary output.

---

## 🛠 Troubleshooting

- Ensure your Google Vision API credentials file is located inside the `webfont-report` package directory as `vision.config.json`.
- Set up your GITHUB_TOKEN if using repo-scanning features.
