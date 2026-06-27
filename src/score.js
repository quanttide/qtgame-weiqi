// 终局计分（中国规则数子法）
// 包含死子判定、领地计算、贴目

// eslint-disable-next-line no-unused-vars
function calculateScore() {
  // 复制棋盘以免修改原状态
  const b = board.map(row => [...row]);

  // ---- 1. 标记所有棋串 ----
  const groups = [];       // { color, stones: [[x,y],...], liberties: Set(key) }
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const groupOf = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (b[y][x] === 0 || visited[y][x]) continue;
      const color = b[y][x];
      const stones = [];
      const liberties = new Set();
      const q = [[x, y]];
      visited[y][x] = true;
      while (q.length) {
        const [cx, cy] = q.shift();
        stones.push([cx, cy]);
        for (const [nx, ny] of getNeighbors(cx, cy)) {
          if (b[ny][nx] === 0) liberties.add(`${nx},${ny}`);
          else if (b[ny][nx] === color && !visited[ny][nx]) {
            visited[ny][nx] = true;
            q.push([nx, ny]);
          }
        }
      }
      const g = { color, stones, liberties, alive: true };
      groups.push(g);
      for (const [sx, sy] of stones) groupOf[sy][sx] = g;
    }
  }

  // ---- 2. 死子判定 ----
  // 贪心迭代：不断移除被判定为死的棋串，直到稳定
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of groups) {
      if (!g.alive) continue;

      // 2a. 0 气 → 死
      if (g.liberties.size === 0) { g.alive = false; changed = true; continue; }

      // 2b. 数真眼：本方棋子完全包围的空点（4 个正交邻位都是本方颜色或棋盘边缘）
      const eyes = new Set();
      for (const [sx, sy] of g.stones) {
        for (const [nx, ny] of getNeighbors(sx, sy)) {
          if (b[ny][nx] !== 0) continue;
          const key = `${nx},${ny}`;
          if (eyes.has(key)) continue;
          // 检查这个空点是否被 g.color 完全包围
          const allAround = getNeighbors(nx, ny).every(([ax, ay]) => {
            if (b[ay][ax] === g.color) return true;
            // 如果是对方的子，检查对方棋串是否已判死
            if (b[ay][ax] !== 0) return !groupOf[ay][ax]?.alive;
            return false; // 邻接另一个空点 → 不是真眼（除非是 2×2 大眼的一部分…简化不处理大眼）
          });
          if (allAround) eyes.add(key);
        }
      }

      // 2c. ≥ 2 只真眼 → 活棋
      if (eyes.size >= 2) continue;

      // 2d. 0 眼 + 所有气口的相邻对方棋串都活着 → 死棋
      const allLibsToAlive = Array.from(g.liberties).every(key => {
        const [lx, ly] = key.split(",").map(Number);
        for (const [nx, ny] of getNeighbors(lx, ly)) {
          if (b[ny][nx] === 0 || b[ny][nx] === g.color) continue;
          const opp = groupOf[ny][nx];
          if (opp && opp.alive) return true;
        }
        return false;
      });
      if (eyes.size === 0 && allLibsToAlive) {
        g.alive = false;
        changed = true;
        continue;
      }
    }
  }

  // ---- 3. 移除死子，替换为对方领地标记 ----
  for (const g of groups) {
    if (g.alive) continue;
    const capturer = g.color === 1 ? 2 : 1;
    for (const [sx, sy] of g.stones) {
      b[sy][sx] = capturer === 1 ? -1 : -2; // -1 = 黑方领地内的死白子, -2 = 白方领地内的死黑子
    }
  }

  // ---- 4. 数空（Flood fill 空白区域） ----
  const territoryVisited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let blackTerritory = 0, whiteTerritory = 0;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (b[y][x] !== 0 || territoryVisited[y][x]) continue;
      const region = [];
      const borders = new Set();
      const q = [[x, y]];
      territoryVisited[y][x] = true;
      while (q.length) {
        const [cx, cy] = q.shift();
        region.push([cx, cy]);
        for (const [nx, ny] of getNeighbors(cx, cy)) {
          if (b[ny][nx] === 0 && !territoryVisited[ny][nx]) {
            territoryVisited[ny][nx] = true;
            q.push([nx, ny]);
          } else if (b[ny][nx] === 1 || b[ny][nx] === -2) borders.add("b");
          else if (b[ny][nx] === 2 || b[ny][nx] === -1) borders.add("w");
        }
      }
      if (borders.size === 1) {
        if (borders.has("b")) blackTerritory += region.length;
        else whiteTerritory += region.length;
      }
    }
  }

  // ---- 5. 数子 ----
  let blackStones = 0, whiteStones = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (b[y][x] === 1) blackStones++;
      else if (b[y][x] === 2) whiteStones++;
    }
  }

  // ---- 6. 总分 ----
  const blackTotal = blackStones + blackTerritory + blackCaptured;
  const whiteTotal = whiteStones + whiteTerritory + whiteCaptured + KOMI;

  return {
    blackTotal, whiteTotal,
    blackStones, blackTerritory,
    whiteStones, whiteTerritory,
  };
}
