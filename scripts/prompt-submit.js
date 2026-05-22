#!/usr/bin/env node
import { readHookInput, emitSystemMessage } from "./lib/hook-input.js";
import { showChoice } from "./lib/dialog.js";
import { loadState, saveState, isProcessAlive } from "./lib/state.js";
import {
  ensureDaemon,
  resumeDaemon,
  pauseDaemon,
  shutdownDaemon,
} from "./lib/daemon-client.js";
import { sendDaemonCommand } from "./lib/ipc.js";

const input = await readHookInput();
const sessionId = input.session_id;
if (!sessionId) process.exit(0);

let state = loadState(sessionId);

if (state.optOut) {
  process.exit(0);
}

if (state.status === "playing" && state.ipcPort && isProcessAlive(state.daemonPid)) {
  const pong = await sendDaemonCommand(state.ipcPort, "ping");
  if (pong?.ok) {
    await sendDaemonCommand(state.ipcPort, "resume");
    process.exit(0);
  }
}

let choiceIdx;
if (state.status === "paused") {
  choiceIdx = showChoice("Claude Snake", "Claude is about to work. What do you want to do?", [
    "Continue",
    "New game",
    "Don't play",
  ]);
} else {
  choiceIdx = showChoice(
    "Claude Snake",
    "Claude is about to work. Play Snake while you wait?",
    ["Play Snake", "Don't play"]
  );
}

if (choiceIdx < 0) {
  process.exit(0);
}

if (state.status === "paused") {
  if (choiceIdx === 0) {
    await resumeDaemon(sessionId);
    emitSystemMessage("Snake: resumed in separate window.");
  } else if (choiceIdx === 1) {
    await ensureDaemon(sessionId, { reset: true });
    state = loadState(sessionId);
    if (state.ipcPort) await sendDaemonCommand(state.ipcPort, "reset");
    state.status = "playing";
    state.optOut = false;
    saveState(state);
    emitSystemMessage("Snake: new game started.");
  } else {
    state.optOut = true;
    saveState(state);
    await pauseDaemon(sessionId);
    emitSystemMessage("Snake: opted out for this session.");
  }
} else {
  if (choiceIdx === 0) {
    await ensureDaemon(sessionId);
    state = loadState(sessionId);
    if (state.ipcPort && state.status === "paused") {
      await sendDaemonCommand(state.ipcPort, "resume");
    }
    state.status = "playing";
    state.optOut = false;
    saveState(state);
    emitSystemMessage("Snake: game opened in a separate window.");
  } else {
    state.optOut = true;
    saveState(state);
    emitSystemMessage("Snake: opted out for this session.");
  }
}

process.exit(0);
