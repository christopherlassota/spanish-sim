import test from "node:test";
import assert from "node:assert/strict";
import { generateCharacterReply, getLlmConfig, hasApiConfig } from "../src/llm.mjs";
import { scenarios } from "../src/scenarios.mjs";

function withEnv(vars, fn) {
  const prev = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
    if (vars[key] == null) delete process.env[key];
    else process.env[key] = vars[key];
  }
  const restore = () => {
    for (const key of Object.keys(vars)) {
      if (prev[key] == null) delete process.env[key];
      else process.env[key] = prev[key];
    }
  };

  try {
    const result = fn();
    if (result && typeof result.then === "function") return result.finally(restore);
    restore();
  } catch (error) {
    restore();
    throw error;
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

test("minimax requests split reasoning so content stays clean", async () => {
  const prevFetch = global.fetch;
  let requestBody = null;

  global.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "Bienvenido, tome asiento.",
              reasoning_details: [{ text: "internal reasoning" }]
            }
          }
        ]
      })
    };
  };

  try {
    await withEnv(
      {
        LLM_PROVIDER: "minimax",
        MINIMAX_API_KEY: "mini-key"
      },
      async () => {
        const scenario = scenarios.restaurant;
        const reply = await generateCharacterReply({
          scenario,
          stage: "greeting",
          speakerKey: "waiter",
          speaker: scenario.characters.waiter,
          userText: "Hola",
          history: [{ role: "user", content: "Hola" }],
          difficulty: "standard"
        });

        assert.equal(requestBody.reasoning_split, true);
        assert.equal(reply, "Bienvenido, tome asiento.");
      }
    );
  } finally {
    global.fetch = prevFetch;
  }
});

test("strips think blocks from provider responses before sanitization", async () => {
  const prevFetch = global.fetch;

  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: "<think>The user wants a greeting.</think>\n\nHola, bienvenido."
          }
        }
      ]
    })
  });

  try {
    await withEnv(
      {
        LLM_PROVIDER: "openai",
        OPENAI_API_KEY: "openai-key"
      },
      async () => {
        const scenario = scenarios.restaurant;
        const reply = await generateCharacterReply({
          scenario,
          stage: "greeting",
          speakerKey: "waiter",
          speaker: scenario.characters.waiter,
          userText: "Hola",
          history: [{ role: "user", content: "Hola" }],
          difficulty: "standard"
        });

        assert.equal(reply, "Hola, bienvenido.");
      }
    );
  } finally {
    global.fetch = prevFetch;
  }
});
