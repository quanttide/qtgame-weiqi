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
        aiIsLegal: "readonly",
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
        getNeighbors: "readonly",
        getGroup: "readonly",
        getStars: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
