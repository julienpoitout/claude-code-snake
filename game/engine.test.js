import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitialGame, setDirection, tick } from "./engine.js";

describe("engine", () => {
  it("creates initial snake", () => {
    const g = createInitialGame(10, 8);
    assert.equal(g.snake.length, 3);
    assert.equal(g.score, 0);
    assert.ok(g.food);
  });

  it("moves snake forward", () => {
    let g = createInitialGame(10, 8);
    const headBefore = [...g.snake[0]];
    g = tick(g);
    assert.notDeepEqual(g.snake[0], headBefore);
  });

  it("prevents reverse direction", () => {
    let g = createInitialGame(10, 8);
    g = setDirection(g, "left");
    assert.equal(g.nextDirection, "right");
  });

  it("detects wall collision", () => {
    let g = createInitialGame(5, 5);
    g.snake = [[0, 0]];
    g.direction = "left";
    g.nextDirection = "left";
    g = tick(g);
    assert.equal(g.gameOver, true);
  });
});
