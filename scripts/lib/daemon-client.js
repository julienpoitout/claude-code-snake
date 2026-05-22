import { spawnDaemonWindow } from "./spawn-window.js";
import { sendDaemonCommand } from "./ipc.js";
import {
  loadState,
  saveState,
  resetGameState,
  isProcessAlive,
  defaultState,
} from "./state.js";

const POLL_MS = 100;
const POLL_MAX = 30;

export async function waitForIpcPort(sessionId) {
  for (let i = 0; i < POLL_MAX; i++) {
    const state = loadState(sessionId);
    if (state.ipcPort) {
      const pong = await sendDaemonCommand(state.ipcPort, "ping");
      if (pong?.ok) return state;
    }
    await sleep(POLL_MS);
  }
  return loadState(sessionId);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function ensureDaemon(sessionId, { reset = false } = {}) {
  let state = loadState(sessionId);
  if (reset) {
    resetGameState(state);
    if (state.ipcPort && isProcessAlive(state.daemonPid)) {
      await sendDaemonCommand(state.ipcPort, "shutdown");
    }
    state = loadState(sessionId);
  }

  if (state.ipcPort && isProcessAlive(state.daemonPid)) {
    const pong = await sendDaemonCommand(state.ipcPort, "ping");
    if (pong?.ok) return state;
  }

  state.ipcPort = null;
  state.daemonPid = null;
  saveState(state);

  spawnDaemonWindow(sessionId, 0);
  state = await waitForIpcPort(sessionId);
  return state;
}

export async function pauseDaemon(sessionId) {
  const state = loadState(sessionId);
  if (!state.ipcPort) {
    state.status = "paused";
    saveState(state);
    return state;
  }
  await sendDaemonCommand(state.ipcPort, "pause");
  state.status = "paused";
  saveState(state);
  return state;
}

export async function resumeDaemon(sessionId) {
  let state = await ensureDaemon(sessionId);
  if (state.ipcPort) {
    await sendDaemonCommand(state.ipcPort, "resume");
  }
  state.status = "playing";
  state.optOut = false;
  saveState(state);
  return state;
}

export async function shutdownDaemon(sessionId) {
  const state = loadState(sessionId);
  if (state.ipcPort) {
    await sendDaemonCommand(state.ipcPort, "shutdown");
  }
  const fresh = defaultState(sessionId);
  fresh.optOut = state.optOut;
  saveState(fresh);
  return fresh;
}
