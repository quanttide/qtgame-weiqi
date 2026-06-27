// 启发式围棋 AI
// 不搜索、不学习、零依赖。用规则评价每步棋，选得分最高的落子。

// eslint-disable-next-line no-unused-vars
function aiSuggestMove() {
  let bestScore = -Infinity;
  let candidates = [];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!aiIsLegal(x, y)) continue;
      const score = aiEvaluate(x, y);
      if (score > bestScore) {
        bestScore = score;
        candidates = [{ x, y }];
      } else if (score === bestScore) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return null; // 无棋可下 → Pass

  // 同分随机选一个，增加变化
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function aiIsLegal(x, y) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return false;
  if (board[y][x] !== 0) return false;

  // 模拟落子后检查
  const nb = board.map((row) => [...row]);
  nb[y][x] = currentPlayer;
  const opp = currentPlayer === 1 ? 2 : 1;

  // 能提子 → 合法
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 0) return true;
    }
  }

  // 不能自杀
  const mg = getGroup(x, y, nb);
  return mg && mg.liberties > 0;
}

function aiEvaluate(x, y) {
  const p = currentPlayer;
  const opp = p === 1 ? 2 : 1;
  const nb = board.map((row) => [...row]);
  nb[y][x] = p;
  const totalMoves = moveRecord.length;
  let score = 0;

  // ---- 提子（最高优先） ----
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 0) score += 100 * g.group.length;
    }
  }

  // ---- 救活己方濒死棋串（1气） ----
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (board[ny][nx] === p) {
      const g = getGroup(nx, ny, board);
      if (g && g.liberties === 1) score += 90;
    }
  }

  // ---- 打吃对方（使其剩1气） ----
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 1) score += 50 * g.group.length;
    }
  }

  // ---- 开局占星位/小目（前40手） ----
  if (totalMoves < 40) {
    const stars = getStars(SIZE);
    if (stars.some(([sx, sy]) => sx === x && sy === y)) score += 30;
    // 小目（4-4 和 3-4 附近）
    if (
      (x === 3 && y === 3) ||
      (x === 3 && y === SIZE - 4) ||
      (x === SIZE - 4 && y === 3) ||
      (x === SIZE - 4 && y === SIZE - 4)
    )
      score += 25;
    if (
      (x === 3 && y === 4) ||
      (x === 4 && y === 3) ||
      (x === 3 && y === SIZE - 5) ||
      (x === 4 && y === SIZE - 4) ||
      (x === SIZE - 5 && y === 3) ||
      (x === SIZE - 4 && y === 4) ||
      (x === SIZE - 5 && y === SIZE - 4) ||
      (x === SIZE - 4 && y === SIZE - 5)
    )
      score += 20;
  }

  // ---- 靠近己方活棋扩张 ----
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (board[ny][nx] === p) {
      const g = getGroup(nx, ny, board);
      if (g && g.liberties >= 3) score += 10;
    }
  }

  // ---- 开局避免走一二路（前20手） ----
  if (totalMoves < 20) {
    if (x === 0 || x === SIZE - 1 || y === 0 || y === SIZE - 1) score -= 20;
    else if (x === 1 || x === SIZE - 2 || y === 1 || y === SIZE - 2) score -= 8;
  }

  // ---- 靠近对方强棋 → 送吃 ----
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (board[ny][nx] === opp) {
      const g = getGroup(nx, ny, board);
      if (g && g.liberties >= 4) score -= 25;
    }
  }

  return score;
}
