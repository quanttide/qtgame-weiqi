const GLOBALS = {
  document: "readonly",
  window: "readonly",
  console: "readonly",
  requestAnimationFrame: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
};

export default [
  {
    files: ["src/main.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...GLOBALS,
        aiSuggestMove: "readonly",
        checkAIMove: "readonly",
        calculateScore: "readonly",
        canvas: "writable",
        ctx: "writable",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["src/ai.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...GLOBALS,
        board: "writable",
        SIZE: "writable",
        currentPlayer: "writable",
        moveRecord: "writable",
        AI_PLAYER: "writable",
        aiMode: "writable",
        aiSuggestMove: "readonly",
        getNeighbors: "readonly",
        getGroup: "readonly",
        getStars: "readonly",
        pass: "readonly",
        placeStone: "readonly",
        calculateScore: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
  {
    files: ["src/score.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...GLOBALS,
        board: "writable",
        SIZE: "writable",
        blackCaptured: "readonly",
        whiteCaptured: "readonly",
        KOMI: "readonly",
        getNeighbors: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
