import test from "node:test";
import assert from "node:assert/strict";
import { getLlmConfig, hasApiConfig } from "../src/llm.mjs";

function withEnv(vars, fn) {
  const prev = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    if (vars[key] == null) delete process.env[key];
    else process.env[key] = vars[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      if (prev[key] == null) delete process.env[key];
      else process.env[key] = prev[key];
    }
  }
}

test("defaults to openai provider", () => {
  withEnv(
    {
      LLM_PROVIDER: null,
      OPENAI_MODEL: null,
      OPENAI_BASE_URL: null
    },
    () => {
      const cfg = getLlmConfig();
      assert.equal(cfg.provider, "openai");
      assert.equal(cfg.model, "gpt-4o-mini");
      assert.equal(cfg.baseUrl, "https://api.openai.com/v1");
    }
  );
});

test("uses minimax provider config when selected", () => {
  withEnv(
    {
      LLM_PROVIDER: "minimax",
      MINIMAX_API_KEY: "mini-key",
      MINIMAX_MODEL: "MiniMax-M2.5",
      MINIMAX_BASE_URL: "https://api.minimax.io/v1"
    },
    () => {
      const cfg = getLlmConfig();
      assert.equal(cfg.provider, "minimax");
      assert.equal(cfg.apiKey, "mini-key");
      assert.equal(cfg.model, "MiniMax-M2.5");
      assert.equal(cfg.baseUrl, "https://api.minimax.io/v1");
      assert.equal(hasApiConfig(), true);
    }
  );
});

