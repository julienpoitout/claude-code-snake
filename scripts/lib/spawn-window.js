import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { daemonScriptPath, pluginRoot } from "./paths.js";

/**
 * Spawn snake daemon in a new terminal window (detached).
 * @param {string} sessionId
 * @returns {{ pid: number }}
 */
export function spawnDaemonWindow(sessionId) {
  const node = process.execPath;
  const script = daemonScriptPath();

  if (process.platform === "win32") {
    return spawnWindows(node, script, sessionId);
  }
  if (process.platform === "darwin") {
    return spawnMac(node, script, sessionId);
  }
  return spawnLinux(node, script, sessionId);
}

function spawnEnv() {
  return { ...process.env, CLAUDE_PLUGIN_ROOT: pluginRoot() };
}

function escapePsSingle(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Windows Terminal mangles inline -Command strings that contain &.
 * Use a launcher .ps1 file and invoke with -File instead.
 */
function writeWindowsLauncher(node, script, sessionId) {
  const root = pluginRoot();
  const launcherPath = path.join(os.tmpdir(), `claude-snake-${sessionId}.ps1`);
  const content = [
    "$ErrorActionPreference = 'Stop'",
    `Set-Location -LiteralPath '${escapePsSingle(root)}'`,
    `& '${escapePsSingle(node)}' '${escapePsSingle(script)}' '--session' '${escapePsSingle(sessionId)}'`,
    "",
  ].join("\r\n");
  fs.writeFileSync(launcherPath, content, "utf8");
  return launcherPath;
}

function spawnWindows(node, script, sessionId) {
  const launcherPath = writeWindowsLauncher(node, script, sessionId);
  const psArgs = [
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    launcherPath,
  ];

  const wt = findExecutable("wt.exe");
  if (wt) {
    const child = spawn(wt, ["new-tab", "powershell.exe", ...psArgs], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: spawnEnv(),
    });
    child.unref();
    return { pid: child.pid ?? 0 };
  }

  const child = spawn(
    "cmd.exe",
    ["/c", "start", "Claude Snake", "powershell.exe", ...psArgs],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env: spawnEnv(),
    }
  );
  child.unref();
  return { pid: child.pid ?? 0 };
}

function spawnMac(node, script, sessionId) {
  const root = pluginRoot();
  const cmd = `cd '${root.replace(/'/g, "'\\''")}' && '${node.replace(/'/g, "'\\''")}' '${script.replace(/'/g, "'\\''")}' --session '${sessionId.replace(/'/g, "'\\''")}'`;
  const scriptText = `tell application "Terminal" to do script "${cmd.replace(/"/g, '\\"')}"`;
  const child = spawn("osascript", ["-e", scriptText], {
    detached: true,
    stdio: "ignore",
    env: spawnEnv(),
  });
  child.unref();
  return { pid: child.pid ?? 0 };
}

function spawnLinux(node, script, sessionId) {
  const root = pluginRoot();
  const child = spawn(
    "x-terminal-emulator",
    [
      "-e",
      `bash -lc 'cd "${root.replace(/"/g, '\\"')}" && exec "${node.replace(/"/g, '\\"')}" "${script.replace(/"/g, '\\"')}" --session "${sessionId.replace(/"/g, '\\"')}"'`,
    ],
    {
      detached: true,
      stdio: "ignore",
      env: spawnEnv(),
    }
  );
  child.unref();
  return { pid: child.pid ?? 0 };
}

function findExecutable(name) {
  const r = spawnSync("where", [name], { encoding: "utf8", shell: true });
  if (r.status === 0 && r.stdout.trim()) {
    return r.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}
