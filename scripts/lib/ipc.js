import net from "node:net";

/**
 * @param {number} port
 * @param {string} command
 * @param {object} [payload]
 * @returns {Promise<object|null>}
 */
export function sendDaemonCommand(port, command, payload = {}) {
  if (!port) return Promise.resolve(null);
  return new Promise((resolve) => {
    const client = net.createConnection({ host: "127.0.0.1", port });
    let buf = "";
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    client.setEncoding("utf8");
    client.setTimeout(2000);

    client.on("connect", () => {
      client.write(JSON.stringify({ command, ...payload }) + "\n");
    });

    client.on("data", (chunk) => {
      buf += chunk;
      if (!buf.includes("\n")) return;
      try {
        finish(JSON.parse(buf.trim()));
      } catch {
        finish({ ok: true });
      }
      client.end();
    });

    client.on("error", () => finish(null));

    client.on("timeout", () => {
      client.end();
      finish(null);
    });

    client.on("close", () => {
      if (!settled) finish(null);
    });
  });
}
