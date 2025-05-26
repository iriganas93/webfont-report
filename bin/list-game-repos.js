#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const semver = require("semver");
const { cpus } = require("os");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const ORG_NAME = "camelotls";
const OUTPUT_PATH = path.resolve(process.cwd(), "game-repos.json");
const GITHUB_API = "https://api.github.com";
const TWO_YEARS_AGO = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
const PER_PAGE = 100;
const REQUIRED_VERSION = "10.8.0";
const MAX_PARALLEL = cpus().length;

const EXCLUDED_REPOS = [
    "delphi-game-management",
    "delphi-games",
    "game-fonts-playground",
    "nexus-games-config",
    "iwg-games-artifacts-downloader",
    "games",
    "game-engine-toolkit"
];

function extractFrameworkVersion(raw) {
    if (!raw) return null;
    if (raw.startsWith("github:")) {
        const match = raw.match(/#(.+)$/);
        return match ? match[1] : null;
    }
    return raw;
}

async function fetchAllRepos(token) {
    let page = 1;
    const matchingRepos = [];

    while (true) {
        const res = await fetch(
            `${GITHUB_API}/orgs/${ORG_NAME}/repos?per_page=${PER_PAGE}&page=${page}`,
            {
                headers: {
                    Authorization: `token ${token}`,
                    "User-Agent": "webfont-report-cli",
                },
            }
        );

        if (!res.ok) {
            throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
        }

        const repos = await res.json();
        if (repos.length === 0) break;

        for (const repo of repos) {
            const name = repo.name;
            const createdAt = new Date(repo.created_at);
            if (
                name.toLowerCase().includes("game") &&
                createdAt > TWO_YEARS_AGO &&
                !EXCLUDED_REPOS.includes(name)
            ) {
                matchingRepos.push({
                    name,
                    url: repo.html_url,
                    created_at: repo.created_at,
                    owner: repo.owner.login,
                });
            }
        }

        page++;
    }

    return matchingRepos;
}

async function analyzeFrameworkRemote(repo, token) {
    const url = `${GITHUB_API}/repos/${repo.owner}/${repo.name}/contents/package.json`;

    try {
        const res = await fetch(url, {
            headers: {
                Authorization: `token ${token}`,
                "User-Agent": "webfont-report-cli",
                Accept: "application/vnd.github.v3.raw"
            }
        });

        if (!res.ok) {
            return { ...repo, framework: null, isWebfontSupported: false };
        }

        const pkg = await res.json();
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const raw = deps["ctp-iwg-framework"];
        const version = extractFrameworkVersion(raw);
        const isSupported = version && semver.valid(version) && semver.gte(version, REQUIRED_VERSION);

        return {
            ...repo,
            framework: version || null,
            isWebfontSupported: !!isSupported,
        };
    } catch (err) {
        return { ...repo, framework: null, isWebfontSupported: false };
    }
}

function runParallel(tasks, limit) {
    return new Promise((resolve) => {
        const results = [];
        let idx = 0;
        let running = 0;

        const runNext = () => {
            if (idx >= tasks.length && running === 0) return resolve(results);
            while (running < limit && idx < tasks.length) {
                const currentIndex = idx++;
                running++;
                tasks[currentIndex]().then((res) => {
                    results[currentIndex] = res;
                    running--;
                    runNext();
                });
            }
        };

        runNext();
    });
}

async function main() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.error("❌ GITHUB_TOKEN environment variable not set.");
        process.exit(1);
    }

    console.log("🔍 Fetching game repos from GitHub...");
    try {
        const repos = await fetchAllRepos(token);

        const tasks = repos.map((repo) => async () => await analyzeFrameworkRemote(repo, token));
        const analyzed = await runParallel(tasks, MAX_PARALLEL);

        console.log("\n📦 Game Repositories (last 2 years):\n");
        analyzed.forEach((repo, idx) => {
            console.log(`${idx + 1}. ${repo.name} - ${repo.url} [${repo.framework || "none"}] => ${repo.isWebfontSupported ? "✅" : "❌"}`);
        });

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(analyzed, null, 2));
        console.log(`\n✅ Saved to ${OUTPUT_PATH}`);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}

main();
