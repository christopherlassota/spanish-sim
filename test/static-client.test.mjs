import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { isPathInsideDir } from "../src/static-client.mjs";

test("isPathInsideDir accepts files inside the client directory", () => {
  assert.equal(
    isPathInsideDir("C:\\repo\\dist", "C:\\repo\\dist\\assets\\index.js", path.win32),
    true
  );
});

test("isPathInsideDir rejects parent traversal targets", () => {
  assert.equal(
    isPathInsideDir("C:\\repo\\dist", "C:\\repo\\secrets\\token.txt", path.win32),
    false
  );
});

test("isPathInsideDir rejects sibling directories with the same prefix", () => {
  assert.equal(
    isPathInsideDir("C:\\repo\\dist", "C:\\repo\\dist2\\index.html", path.win32),
    false
  );
});
