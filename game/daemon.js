import net from "node:net";
import readline from "node:readline";
import {
  createInitialGame,
  exportGameState,
  importGameState,
  setDirection,
  tick,
} from "./engine.js";
import { createScreen, renderFrame } from "./render.js";
import { loadState, saveState } from "../scripts/lib/state.js";

function parseArgs() {
  const args = process.argv.slice(2);
  let sessionId = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) sessionId = args[++i];
  }
  if (!sessionId) {
    console.error("Usage: node daemon.js --session <session_id>");
    process.exit(1);
  }
  return { sessionId };
}

function keyToDirection(key) {
  const map = {
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  return map[key.name] || map[key.sequence] || null;
}

async function main() {
  const { sessionId } = parseArgs();
  let session = loadState(sessionId);
  let game = importGameState(session);
  let paused = session.status === "paused";
  let gameOver = false;
  let tickHandle = null;
  const screen = createScreen();

  const draw = () => {
    screen.write(renderFrame(game, { paused, gameOver }));
  };

  const persist = (extra = {}) => {
    session = {
      ...session,
      ...exportGameState(game),
      status: paused ? "paused" : gameOver ? "idle" : "playing",
      ...extra,
    };
    saveState(session);
  };

  const startLoop = () => {
    if (tickHandle) return;
    tickHandle = setInterval(() => {
      if (paused || gameOver) return;
      game = tick(game);
      if (game.gameOver) {
        gameOver = true;
        stopLoop();
      }
      draw();
      persist();
    }, 120);
  };

  const stopLoop = () => {
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  };

  function reply(socket, body) {
    if (socket.destroyed || socket.writableEnded) return;
    const payload = JSON.stringify(body) + "\n";
    socket.write(payload, () => {
      socket.end();
    });
  }

  function handleCommand(msg, socket) {
    try {
      switch (msg.command) {
        case "ping":
          reply(socket, { ok: true, status: session.status });
          break;
        case "pause":
          paused = true;
          stopLoop();
          draw();
          persist({ status: "paused" });
          reply(socket, { ok: true });
          break;
        case "resume":
          if (!paused && !gameOver && tickHandle) {
            reply(socket, { ok: true, alreadyPlaying: true });
            break;
          }
          paused = false;
          gameOver = false;
          startLoop();
          draw();
          persist({ status: "playing" });
          reply(socket, { ok: true });
          break;
        case "reset":
          game = createInitialGame();
          paused = false;
          gameOver = false;
          screen.reset();
          startLoop();
          draw();
          persist({ status: "playing" });
          reply(socket, { ok: true });
          break;
        case "shutdown":
          stopLoop();
          persist({ status: "idle", daemonPid: null, ipcPort: null });
          reply(socket, { ok: true });
          setTimeout(() => process.exit(0), 100);
          break;
        case "sync":
          if (msg.state) {
            game = importGameState({ ...exportGameState(game), ...msg.state });
            draw();
            persist();
          }
          reply(socket, { ok: true });
          break;
        default:
          reply(socket, { ok: false, error: "unknown command" });
      }
    } catch (err) {
      reply(socket, { ok: false, error: String(err) });
    }
  }

  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buf = "";

    socket.on("error", () => {
      socket.destroy();
    });

    socket.on("data", (chunk) => {
      buf += chunk;
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        try {
          handleCommand(JSON.parse(line), socket);
        } catch {
          reply(socket, { ok: false, error: "invalid json" });
        }
      }
    });
  });

  server.on("error", (err) => {
    console.error("IPC server error:", err.message);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      session.ipcPort = port;
      session.daemonPid = process.pid;
      if (session.status !== "paused") {
        session.status = "playing";
        paused = false;
      }
      saveState(session);
      resolve(port);
    });
  });

  if (process.stdin.isTTY) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    process.stdin.on("keypress", (_str, key) => {
      if (key.ctrl && key.name === "c") {
        stopLoop();
        persist({ status: "idle", daemonPid: null, ipcPort: null });
        process.exit(0);
      }
      if (key.name === "r" || key.sequence === "r") {
        game = createInitialGame();
        gameOver = false;
        paused = false;
        screen.reset();
        startLoop();
        draw();
        persist({ status: "playing" });
        return;
      }
      if (key.name === "p") {
        paused = !paused;
        if (paused) stopLoop();
        else startLoop();
        draw();
        persist({ status: paused ? "paused" : "playing" });
        return;
      }
      const dir = keyToDirection(key);
      if (dir) setDirection(game, dir);
    });
  }

  screen.reset();
  draw();
  if (!paused && !gameOver) startLoop();

  process.on("SIGINT", () => {
    stopLoop();
    persist({ status: "paused" });
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
