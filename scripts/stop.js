#!/usr/bin/env node
import { readHookInput } from "./lib/hook-input.js";
import { loadState } from "./lib/state.js";
import { pauseDaemon } from "./lib/daemon-client.js";

const input = await readHookInput();
if (input.stop_hook_active) {
  process.exit(0);
}

const sessionId = input.session_id;
if (!sessionId) process.exit(0);

const state = loadState(sessionId);
if (state.status === "playing" && state.ipcPort) {
  await pauseDaemon(sessionId);
}

process.exit(0);
