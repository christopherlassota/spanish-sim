// @ts-check

import fs from "node:fs";
import path from "node:path";
import { json, text } from "./http-utils.mjs";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

/**
 * @param {import("node:http").ServerResponse} res
 * @param {string} filePath
 */
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return json(res, 404, { error: "Not found" });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/**
 * `startsWith()` is not enough here because `dist2/file.js` also starts with `dist`.
 *
 * @param {string} baseDir
 * @param {string} targetPath
 * @param {typeof path} [pathLib]
 */
export function isPathInsideDir(baseDir, targetPath, pathLib = path) {
  const relative = pathLib.relative(baseDir, targetPath);
  return relative === "" || (!relative.startsWith("..") && !pathLib.isAbsolute(relative));
}

/**
 * @param {{ clientDir: string }} options
 */
export function createClientAppHandler({ clientDir }) {
  const safeClientDir = path.resolve(clientDir);
  const clientIndex = path.join(safeClientDir, "index.html");

  /**
   * @param {import("node:http").ServerResponse} res
   * @param {string} pathname
   */
  return function serveClientApp(res, pathname) {
    if (!fs.existsSync(clientIndex)) {
      text(res, 503, "Frontend build not found. Run `npm run build` first.");
      return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const requestedPath = path.resolve(safeClientDir, relativePath);

    if (!isPathInsideDir(safeClientDir, requestedPath)) {
      json(res, 403, { error: "Forbidden" });
      return;
    }

    fs.stat(requestedPath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveFile(res, requestedPath);
        return;
      }

      if (path.extname(relativePath)) {
        json(res, 404, { error: "Not found" });
        return;
      }

      serveFile(res, clientIndex);
    });
  };
}
