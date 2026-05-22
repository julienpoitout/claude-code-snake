export async function readHookInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function emitSystemMessage(message) {
  const payload = {
    systemMessage: message,
  };
  process.stdout.write(JSON.stringify(payload));
}
