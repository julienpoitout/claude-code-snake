import fs from "node:fs";
import { createInitialGame } from "../../game/engine.js";
import { stateDir, statePath } from "./paths.js";

export function ensureStateDir() {
  fs.mkdirSync(stateDir(), { recursive: true });
}

export function loadState(sessionId) {
  ensureStateDir();
  const file = statePath(sessionId);
  if (!fs.existsSync(file)) {
    return defaultState(sessionId);
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return { ...defaultState(sessionId), ...raw, sessionId };
  } catch {
    return defaultState(sessionId);
  }
}

export function saveState(state) {
  ensureStateDir();
  const file = statePath(state.sessionId);
  fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
}

export function defaultState(sessionId) {
  const game = createInitialGame();
  return {
    sessionId,
    status: "idle",
    optOut: false,
    ipcPort: null,
    daemonPid: null,
    ...game,
  };
}

export function resetGameState(state) {
  const game = createInitialGame();
  Object.assign(state, game, { status: "idle", ipcPort: null, daemonPid: null });
  return state;
}

export function isProcessAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
