#!/usr/bin/env node
import { readHookInput, emitSystemMessage } from "./lib/hook-input.js";
import { showChoice } from "./lib/dialog.js";
import { loadState, saveState, resetGameState } from "./lib/state.js";
import { shutdownDaemon } from "./lib/daemon-client.js";

const input = await readHookInput();
const sessionId = input.session_id;
if (!sessionId) process.exit(0);

const source = input.source || "startup";
let state = loadState(sessionId);

if (source === "resume" && state.status === "paused") {
  const idx = showChoice(
    "Claude Snake",
    "You have a paused Snake game from a previous session.",
    ["Continue", "New game", "Don't play"]
  );

  if (idx === 0) {
    state.optOut = false;
    saveState(state);
    emitSystemMessage("Snake: paused game ready. Submit a prompt to continue playing.");
  } else if (idx === 1) {
    resetGameState(state);
    state.status = "idle";
    state.optOut = false;
    saveState(state);
    await shutdownDaemon(sessionId);
    emitSystemMessage("Snake: new game will start when you submit your next prompt.");
  } else {
    state.optOut = true;
    saveState(state);
    emitSystemMessage("Snake: opted out for this session.");
  }
}

process.exit(0);
