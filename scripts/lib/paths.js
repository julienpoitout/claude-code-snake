import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    return process.env.CLAUDE_PLUGIN_ROOT;
  }
  return path.resolve(__dirname, "../..");
}

export function stateDir() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return path.join(home, ".claude", "claude-snake", "state");
}

export function statePath(sessionId) {
  return path.join(stateDir(), `${sessionId}.json`);
}

export function daemonScriptPath() {
  return path.join(pluginRoot(), "game", "daemon.js");
}
