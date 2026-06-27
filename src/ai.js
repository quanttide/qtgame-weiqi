// 启发式围棋 AI
// 不搜索、不学习、零依赖。用规则评价每步棋，选得分最高的落子。

// eslint-disable-next-line no-unused-vars
function checkAIMove() {
  if (!aiMode || currentPlayer !== AI_PLAYER) return;

  // 用计分器判断 AI 是否还有活棋 → 避免被全包围还在往里下
  if (moveRecord.length > 10 && typeof calculateScore === "function") {
    let aiOnBoard = 0;
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) if (board[y][x] === AI_PLAYER) aiOnBoard++;
    if (aiOnBoard >= 10) {
      const s = calculateScore();
      const aiAlive = AI_PLAYER === 1 ? s.blackStones : s.whiteStones;
      const aiTotal = AI_PLAYER === 1 ? s.blackTotal : s.whiteTotal;
      const oppTotal = AI_PLAYER === 1 ? s.whiteTotal : s.blackTotal;
      if (aiAlive < 5 || (aiTotal + 20 < oppTotal && aiAlive < 20)) {
        pass();
        return;
      }
    }
  }

  const st = document.getElementById("statusText");
  if (st) st.textContent = "AI 思考中...";
  setTimeout(() => {
    if (currentPlayer !== AI_PLAYER) return;
    const move = aiSuggestMove();
    if (move) placeStone(move.x, move.y);
    else pass();
  }, 200);
}

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

  if (candidates.length === 0) return null;

  // 没有好棋就 Pass（终局用）
  if (bestScore < 5 && moveRecord.length > 10) return null;

  // 同分随机选一个，增加变化
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function aiIsLegal(x, y) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return false;
  if (board[y][x] !== 0) return false;

  const nb = board.map((row) => [...row]);
  nb[y][x] = currentPlayer;
  const opp = currentPlayer === 1 ? 2 : 1;

  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 0) return true;
    }
  }

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

  // 提子
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 0) score += 100 * g.group.length;
    }
  }

  // 救活己方濒死棋串
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (board[ny][nx] === p) {
      const g = getGroup(nx, ny, board);
      if (g && g.liberties === 1) score += 90;
    }
  }

  // 打吃对方
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (nb[ny][nx] === opp) {
      const g = getGroup(nx, ny, nb);
      if (g && g.liberties === 1) score += 50 * g.group.length;
    }
  }

  // 位置质量
  const d = Math.min(x, y, SIZE - 1 - x, SIZE - 1 - y);
  if (totalMoves < 50) {
    if (d >= 3) score += 12;
    else if (d === 2) score += 8;
    else if (d === 1) score += 2;
  }

  // 靠近己方棋子的扩张
  let ownAdj = 0,
    ownDist2 = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      if (board[ny][nx] !== p) continue;
      if (Math.abs(dx) + Math.abs(dy) === 1) ownAdj++;
      else ownDist2++;
    }
  }
  score += Math.min(ownAdj * 6, 18);
  score += Math.min(ownDist2 * 3, 12);

  // 远离对方强棋
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      if (board[ny][nx] === opp) {
        const g = getGroup(nx, ny, board);
        if (g && g.liberties >= 4) score -= 20;
      }
    }
  }

  // 中盘后向中央
  if (totalMoves > 50) {
    const center = (SIZE - 1) / 2;
    score +=
      Math.max(0, SIZE - Math.abs(x - center) - Math.abs(y - center)) * 0.5;
  }

  return score;
}
