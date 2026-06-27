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

  // ---- 位置质量：距离边界的层数 ----
  const d = Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y);
  if (totalMoves < 50) {
    // d=0 一路，d=1 二路，d=2 三路，d=3 四路 ...
    if (d >= 3)
      score += 12; // 四路及以上：好位置
    else if (d === 2)
      score += 8; // 三路：不错
    else if (d === 1) score += 2; // 二路：可接受
    // d === 0 不给加分也不减分（靠其他评分决定）
  }

  // ---- 靠近己方棋子（扩张/连接） ----
  let ownAdj = 0;
  let ownDist2 = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      if (board[ny][nx] !== p) continue;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist === 1) ownAdj++;
      else ownDist2++;
    }
  }
  // 紧邻己方棋子：+6/子，但最多 +18（鼓励但不重复）
  score += Math.min(ownAdj * 6, 18);
  // 间隔一格的己方棋子：+3/子，鼓励扩张而非过度聚集
  score += Math.min(ownDist2 * 3, 12);

  // ---- 远离对方强棋 ----
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      if (board[ny][nx] === opp) {
        const g = getGroup(nx, ny, board);
        if (g && g.liberties >= 4) score -= 20; // 对方强棋附近
      }
    }
  }

  // ---- 中盘后向中央发展 ----
  if (totalMoves > 50) {
    const center = (SIZE - 1) / 2;
    const distFromCenter = Math.abs(x - center) + Math.abs(y - center);
    score += Math.max(0, (SIZE - distFromCenter) * 0.5);
  }

  return score;
}
