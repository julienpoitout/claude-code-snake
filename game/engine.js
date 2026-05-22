const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 12;

const DELTAS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const OPPOSITE = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function createInitialGame(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  const midX = Math.floor(width / 2);
  const midY = Math.floor(height / 2);
  return {
    grid: { width, height },
    snake: [
      [midX, midY],
      [midX - 1, midY],
      [midX - 2, midY],
    ],
    direction: "right",
    nextDirection: "right",
    food: placeFood(width, height, [
      [midX, midY],
      [midX - 1, midY],
      [midX - 2, midY],
    ]),
    score: 0,
  };
}

function placeFood(width, height, snake) {
  const occupied = new Set(snake.map(([x, y]) => `${x},${y}`));
  const free = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) free.push([x, y]);
    }
  }
  if (free.length === 0) return [0, 0];
  return free[Math.floor(Math.random() * free.length)];
}

export function setDirection(state, dir) {
  if (!DELTAS[dir]) return state;
  if (OPPOSITE[state.direction] === dir) return state;
  state.nextDirection = dir;
  return state;
}

export function tick(state) {
  state.direction = state.nextDirection;
  const [dx, dy] = DELTAS[state.direction];
  const head = state.snake[0];
  const newHead = [head[0] + dx, head[1] + dy];
  const { width, height } = state.grid;

  if (newHead[0] < 0 || newHead[0] >= width || newHead[1] < 0 || newHead[1] >= height) {
    return { ...state, gameOver: true };
  }
  const body = state.snake.slice(0, -1);
  if (body.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
    return { ...state, gameOver: true };
  }

  const newSnake = [newHead, ...state.snake];
  let score = state.score;
  let food = state.food;

  if (newHead[0] === food[0] && newHead[1] === food[1]) {
    score += 1;
    food = placeFood(width, height, newSnake);
  } else {
    newSnake.pop();
  }

  return {
    ...state,
    snake: newSnake,
    food,
    score,
    gameOver: false,
  };
}

export function exportGameState(state) {
  return {
    grid: state.grid,
    snake: state.snake,
    direction: state.direction,
    nextDirection: state.nextDirection ?? state.direction,
    food: state.food,
    score: state.score,
  };
}

export function importGameState(saved) {
  return {
    ...createInitialGame(saved.grid?.width, saved.grid?.height),
    ...saved,
    nextDirection: saved.nextDirection ?? saved.direction,
    gameOver: false,
  };
}
