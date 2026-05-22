export function renderFrame(state, { paused = false, gameOver = false } = {}) {
  const { width, height } = state.grid;
  const lines = [];
  const border = "+" + "-".repeat(width + 2) + "+";
  lines.push(border);

  const snakeSet = new Set(state.snake.map(([x, y]) => `${x},${y}`));
  const head = state.snake[0];
  const headKey = `${head[0]},${head[1]}`;

  for (let y = 0; y < height; y++) {
    let row = "| ";
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (key === headKey) row += "@";
      else if (snakeSet.has(key)) row += "o";
      else if (state.food[0] === x && state.food[1] === y) row += "*";
      else row += " ";
    }
    row += " |";
    lines.push(row);
  }
  lines.push(border);

  const status = paused
    ? "PAUSED — Claude finished. Submit another prompt to continue."
    : gameOver
      ? "GAME OVER — press R to restart"
      : "Arrow keys to move · P pause";
  lines.push(`Score: ${state.score}  |  ${status}`);

  return lines.join("\n");
}

/** Full-frame clear (ANSI). */
export function clearScreen() {
  return "\x1b[2J\x1b[H";
}

/**
 * Tracks frame height so we can redraw in-place when full clear is flaky.
 */
export function createScreen() {
  let previousLineCount = 0;

  return {
    write(frame) {
      const lineCount = frame.split("\n").length;
      let prefix = clearScreen();
      if (previousLineCount > 0) {
        prefix += `\x1b[${previousLineCount}A\x1b[G`;
      }
      process.stdout.write(prefix + frame + "\n");
      previousLineCount = lineCount;
    },
    reset() {
      previousLineCount = 0;
      process.stdout.write(clearScreen());
    },
  };
}
