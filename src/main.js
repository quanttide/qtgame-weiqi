// ============= 围棋核心 =============
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

let SIZE = 19;
let cellSize = 0;
let margin = 0;
let board = [];
let currentPlayer = 1; // 1=黑 2=白
let history = [];
let lastMove = null;
let koPoint = null;
let blackCaptured = 0;
let whiteCaptured = 0;
let blackMoves = 0;
let whiteMoves = 0;
let moveRecord = [];
let hoverPos = null;
let animatingMove = null;
let snapshots = [];
let viewingIdx = 0;
let aiMode = true;
let AI_PLAYER = 2; // AI 执白
let consecutivePasses = 0;
let gameOver = false;
const KOMI = 7.5;

function getState() {
  return {
    board: board.map((row) => [...row]),
    currentPlayer,
    lastMove: lastMove ? { ...lastMove } : null,
    koPoint: koPoint ? { ...koPoint } : null,
    blackCaptured,
    whiteCaptured,
    blackMoves,
    whiteMoves,
    moveRecord: [...moveRecord],
  };
}

function saveSnapshot() {
  if (viewingIdx < snapshots.length - 1) {
    snapshots = snapshots.slice(0, viewingIdx + 1);
    history = history.slice(0, viewingIdx);
  }
  snapshots.push(getState());
  viewingIdx = snapshots.length - 1;
  updateNavUI();
}

function goToSnapshot(idx) {
  if (idx < 0 || idx >= snapshots.length) return;
  const s = snapshots[idx];
  board = s.board.map((row) => [...row]);
  currentPlayer = s.currentPlayer;
  lastMove = s.lastMove ? { ...s.lastMove } : null;
  koPoint = s.koPoint ? { ...s.koPoint } : null;
  blackCaptured = s.blackCaptured;
  whiteCaptured = s.whiteCaptured;
  blackMoves = s.blackMoves;
  whiteMoves = s.whiteMoves;
  moveRecord = [...s.moveRecord];
  viewingIdx = idx;
  updateUI();
  draw();
  updateNavUI();
}

function updateNavUI() {
  const prevBtn = document.getElementById("recordPrevBtn");
  const nextBtn = document.getElementById("recordNextBtn");
  if (prevBtn) prevBtn.disabled = viewingIdx <= 0;
  if (nextBtn) nextBtn.disabled = viewingIdx >= snapshots.length - 1;
}

function newGame() {
  initBoard(SIZE);
  showToast(aiMode ? "新对局（AI 执白）" : "新对局");
  if (aiMode && currentPlayer === AI_PLAYER) checkAIMove();
}

// ============= 计算结果 =============
function showResult(score) {
  gameOver = true;
  const winner = score.blackTotal > score.whiteTotal ? "黑" : "白";
  const diff = Math.abs(score.blackTotal - score.whiteTotal);
  const el = document.getElementById("resultOverlay");
  document.getElementById("resultText").textContent =
    `${winner}方胜 ${diff.toFixed(1)} 目`;
  document.getElementById("resultDetail").textContent =
    `黑 ${score.blackTotal.toFixed(1)} = 子${score.blackStones} + 空${score.blackTerritory} + 提${blackCaptured}  |  白 ${score.whiteTotal.toFixed(1)} = 子${score.whiteStones} + 空${score.whiteTerritory} + 提${whiteCaptured} + 贴${KOMI}`;
  el.classList.remove("hidden");
}

function endGame() {
  const score = calculateScore();
  showResult(score);
}

// ============= 工具函数 =============
function getStars(size) {
  if (size === 19) {
    const pts = [3, 9, 15];
    return pts.flatMap((x) => pts.map((y) => [x, y]));
  } else if (size === 13) {
    return [
      [3, 3],
      [3, 9],
      [9, 3],
      [9, 9],
      [6, 6],
    ];
  } else if (size === 9) {
    return [
      [2, 2],
      [2, 6],
      [6, 2],
      [6, 6],
      [4, 4],
    ];
  }
  return [];
}

function getNeighbors(x, y) {
  const r = [];
  if (x > 0) r.push([x - 1, y]);
  if (x < SIZE - 1) r.push([x + 1, y]);
  if (y > 0) r.push([x, y - 1]);
  if (y < SIZE - 1) r.push([x, y + 1]);
  return r;
}

// 获取棋串及气数
function getGroup(x, y, b) {
  const color = b[y][x];
  if (color === 0) return null;
  const group = [];
  const liberties = new Set();
  const visited = new Set();
  const queue = [[x, y]];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    const key = `${cx},${cy}`;
    if (visited.has(key)) continue;
    visited.add(key);
    group.push([cx, cy]);
    for (const [nx, ny] of getNeighbors(cx, cy)) {
      if (b[ny][nx] === 0) {
        liberties.add(`${nx},${ny}`);
      } else if (b[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
        queue.push([nx, ny]);
      }
    }
  }
  return { group, liberties: liberties.size };
}

// ============= 初始化 =============
function initBoard(size) {
  SIZE = size;
  document.getElementById("sizeLabel").textContent = `${size}×${size}`;
  board = Array(SIZE)
    .fill()
    .map(() => Array(SIZE).fill(0));
  currentPlayer = 1;
  history = [];
  lastMove = null;
  koPoint = null;
  blackCaptured = 0;
  whiteCaptured = 0;
  blackMoves = 0;
  whiteMoves = 0;
  moveRecord = [];
  animatingMove = null;
  consecutivePasses = 0;
  gameOver = false;
  document.getElementById("resultOverlay").classList.add("hidden");

  const boardPixelSize = canvas.width;
  margin = boardPixelSize / (SIZE + 1.5);
  cellSize = (boardPixelSize - margin * 2) / (SIZE - 1);

  updateUI();
  draw();
  snapshots = [getState()];
  viewingIdx = 0;
  updateNavUI();
}

// ============= 绘制 =============
function draw() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 木纹底色
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#dcb277");
  grad.addColorStop(0.5, "#c8954d");
  grad.addColorStop(1, "#a87b3a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 木纹纹理
  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = i % 2 ? "#3a2010" : "#6a4020";
    ctx.lineWidth = Math.random() * 1.5 + 0.3;
    ctx.beginPath();
    const y = Math.random() * h;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      w / 3,
      y + (Math.random() - 0.5) * 30,
      (2 * w) / 3,
      y + (Math.random() - 0.5) * 30,
      w,
      y + (Math.random() - 0.5) * 20,
    );
    ctx.stroke();
  }
  ctx.restore();

  // 棋盘格线
  ctx.strokeStyle = "rgba(30, 18, 8, 0.85)";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  for (let i = 0; i < SIZE; i++) {
    const pos = margin + i * cellSize;
    ctx.beginPath();
    ctx.moveTo(margin, pos);
    ctx.lineTo(margin + (SIZE - 1) * cellSize, pos);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos, margin);
    ctx.lineTo(pos, margin + (SIZE - 1) * cellSize);
    ctx.stroke();
  }
  // 边框加粗
  ctx.strokeStyle = "rgba(30, 18, 8, 0.95)";
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, (SIZE - 1) * cellSize, (SIZE - 1) * cellSize);

  // 星位
  ctx.fillStyle = "rgba(30, 18, 8, 0.9)";
  getStars(SIZE).forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(
      margin + x * cellSize,
      margin + y * cellSize,
      Math.max(2.5, cellSize * 0.09),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });

  // 坐标标签
  ctx.fillStyle = "rgba(60, 35, 15, 0.55)";
  ctx.font = `${Math.max(9, cellSize * 0.32)}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const letters = "ABCDEFGHJKLMNOPQRST";
  for (let i = 0; i < SIZE; i++) {
    const pos = margin + i * cellSize;
    ctx.fillText(letters[i], pos, margin / 2);
    ctx.fillText(letters[i], pos, h - margin / 2);
    const num = SIZE - i;
    ctx.fillText(num, margin / 2, pos);
    ctx.fillText(num, w - margin / 2, pos);
  }

  // 劫争禁着点
  if (koPoint) {
    const kx = margin + koPoint.x * cellSize;
    const ky = margin + koPoint.y * cellSize;
    ctx.strokeStyle = "rgba(201, 56, 56, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(kx, ky, cellSize * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(kx - cellSize * 0.18, ky - cellSize * 0.18);
    ctx.lineTo(kx + cellSize * 0.18, ky + cellSize * 0.18);
    ctx.stroke();
  }

  // 棋子
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] !== 0) {
        const isAnim =
          animatingMove && animatingMove.x === x && animatingMove.y === y;
        drawStone(x, y, board[y][x], isAnim);
      }
    }
  }

  // 最后一手标记
  if (
    lastMove &&
    !(
      animatingMove &&
      animatingMove.x === lastMove.x &&
      animatingMove.y === lastMove.y
    )
  ) {
    const lx = margin + lastMove.x * cellSize;
    const ly = margin + lastMove.y * cellSize;
    ctx.strokeStyle = lastMove.color === 1 ? "#f5ede0" : "#c93838";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(lx, ly, cellSize * 0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 鼠标悬停预览
  if (hoverPos && board[hoverPos.y][hoverPos.x] === 0) {
    const isKo =
      koPoint && koPoint.x === hoverPos.x && koPoint.y === hoverPos.y;
    if (!isKo) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      drawStone(hoverPos.x, hoverPos.y, currentPlayer, false);
      ctx.restore();
    }
  }
}

function drawStone(x, y, color, isAnim) {
  const cx = margin + x * cellSize;
  const cy = margin + y * cellSize;
  let r = cellSize * 0.46;

  // 落子动画：弹性缩放
  if (isAnim) {
    const elapsed = Date.now() - animatingMove.startTime;
    const duration = 320;
    if (elapsed >= duration) {
      animatingMove = null;
    } else {
      const t = elapsed / duration;
      let scale;
      if (t < 0.65) {
        scale = (t / 0.65) * 1.18;
      } else {
        scale = 1.18 - ((t - 0.65) / 0.35) * 0.18;
      }
      r *= scale;
    }
  }

  r = Math.max(2, r);

  // 阴影
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = r * 0.4;
  ctx.shadowOffsetX = r * 0.08;
  ctx.shadowOffsetY = r * 0.15;

  if (color === 1) {
    // 黑子
    const g = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.1,
      cx,
      cy,
      r,
    );
    g.addColorStop(0, "#5a4530");
    g.addColorStop(0.35, "#2a1f15");
    g.addColorStop(0.7, "#0d0805");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
  } else {
    // 白子
    const g = ctx.createRadialGradient(
      cx - r * 0.35,
      cy - r * 0.35,
      r * 0.1,
      cx,
      cy,
      r,
    );
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, "#f5ede0");
    g.addColorStop(0.85, "#d8c8a8");
    g.addColorStop(1, "#a89878");
    ctx.fillStyle = g;
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 高光
  ctx.save();
  ctx.globalAlpha = 0.35;
  const hg = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.4,
    0,
    cx - r * 0.35,
    cy - r * 0.4,
    r * 0.4,
  );
  hg.addColorStop(0, color === 1 ? "#a08868" : "#ffffff");
  hg.addColorStop(
    1,
    color === 1 ? "rgba(160,136,104,0)" : "rgba(255,255,255,0)",
  );
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 边缘暗影
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = color === 1 ? "#000" : "#7a6850";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function animateFrame() {
  if (!animatingMove) return;
  draw();
  if (animatingMove) {
    requestAnimationFrame(animateFrame);
  }
}

// ============= 落子逻辑 =============
function placeStone(x, y) {
  if (gameOver) return false;
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return false;
  if (board[y][x] !== 0) {
    showToast("此处已有棋子", "error");
    return false;
  }
  if (koPoint && koPoint.x === x && koPoint.y === y) {
    showToast("劫争禁着 · 不可即提", "error");
    return false;
  }

  // 临时落子
  const newBoard = board.map((row) => [...row]);
  newBoard[y][x] = currentPlayer;

  // 检查对方棋串是否被提
  const opponent = currentPlayer === 1 ? 2 : 1;
  const captured = [];
  for (const [nx, ny] of getNeighbors(x, y)) {
    if (newBoard[ny][nx] === opponent) {
      const result = getGroup(nx, ny, newBoard);
      if (result.liberties === 0) {
        for (const [gx, gy] of result.group) {
          if (!captured.some(([cx, cy]) => cx === gx && cy === gy)) {
            captured.push([gx, gy]);
          }
        }
      }
    }
  }
  // 移除被提子
  for (const [cx, cy] of captured) {
    newBoard[cy][cx] = 0;
  }

  // 检查自杀
  const myGroup = getGroup(x, y, newBoard);
  if (myGroup.liberties === 0) {
    showToast("禁着点 · 不可自杀", "error");
    return false;
  }

  // 保存历史
  history.push({
    board: board.map((row) => [...row]),
    currentPlayer,
    lastMove: lastMove ? { ...lastMove } : null,
    koPoint: koPoint ? { ...koPoint } : null,
    blackCaptured,
    whiteCaptured,
    blackMoves,
    whiteMoves,
    moveRecord: [...moveRecord],
  });

  // 应用新状态
  board = newBoard;
  if (currentPlayer === 1) blackCaptured += captured.length;
  else whiteCaptured += captured.length;

  // 劫争点判断
  if (
    captured.length === 1 &&
    myGroup.group.length === 1 &&
    myGroup.liberties === 1
  ) {
    koPoint = { x: captured[0][0], y: captured[0][1] };
  } else {
    koPoint = null;
  }

  lastMove = { x, y, color: currentPlayer };
  if (currentPlayer === 1) blackMoves++;
  else whiteMoves++;

  // 棋谱记录
  const letters = "ABCDEFGHJKLMNOPQRST";
  moveRecord.push({
    player: currentPlayer,
    notation: `${currentPlayer === 1 ? "B" : "W"}${letters[x]}${SIZE - y}`,
  });

  if (captured.length > 0) {
    showToast(`提 ${captured.length} 子`, "success");
  }

  // 启动动画
  animatingMove = {
    x,
    y,
    color: lastMove.color,
    startTime: Date.now(),
  };
  requestAnimationFrame(animateFrame);

  currentPlayer = opponent;
  updateUI();
  draw();
  saveSnapshot();
  consecutivePasses = 0;
  checkAIMove();
  return true;
}

function pass() {
  if (gameOver) return;
  history.push({
    board: board.map((row) => [...row]),
    currentPlayer,
    lastMove: lastMove ? { ...lastMove } : null,
    koPoint: koPoint ? { ...koPoint } : null,
    blackCaptured,
    whiteCaptured,
    blackMoves,
    whiteMoves,
    moveRecord: [...moveRecord],
  });
  moveRecord.push({
    player: currentPlayer,
    notation: `${currentPlayer === 1 ? "B" : "W"}Pass`,
  });
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  lastMove = null;
  koPoint = null;
  showToast(
    currentPlayer === 1 ? "白方虚着 · 现黑方落子" : "黑方虚着 · 现白方落子",
  );
  updateUI();
  draw();
  saveSnapshot();
  consecutivePasses++;
  if (consecutivePasses >= 2) {
    endGame();
    return;
  }
  checkAIMove();
}

// ============= UI 更新 =============
function updateUI() {
  document.getElementById("moveNum").textContent = moveRecord.length;
  document.getElementById("blackCaptured").textContent = blackCaptured;
  document.getElementById("whiteCaptured").textContent = whiteCaptured;
  document.getElementById("blackMoves").textContent = blackMoves;
  document.getElementById("whiteMoves").textContent = whiteMoves;
  document
    .getElementById("blackIndicator")
    .classList.toggle("active", currentPlayer === 1);
  document
    .getElementById("whiteIndicator")
    .classList.toggle("active", currentPlayer === 2);
  const st = document.getElementById("statusText");
  if (st) st.textContent = currentPlayer === 1 ? "黑方" : "白方";
  const dot = document.getElementById("currentDot");
  if (dot)
    dot.className = `w-1.5 h-1.5 rounded-full ${currentPlayer === 1 ? "bg-amber-900" : "bg-amber-100"}`;

  const recordEl = document.getElementById("record");
  document.getElementById("recordCount").textContent =
    `${moveRecord.length} 手`;
  if (moveRecord.length === 0) {
    recordEl.innerHTML =
      '<span class="text-amber-200/30 text-xs">尚无落子，请黑方先行...</span>';
  } else {
    recordEl.innerHTML = moveRecord
      .map(
        (m, i) =>
          `<span class="move-tag ${m.player === 1 ? "b" : "w"}">${i + 1}. ${m.notation}</span>`,
      )
      .join("");
    recordEl.scrollTop = recordEl.scrollHeight;
  }

  // 实时计分
  if (typeof calculateScore === "function" && moveRecord.length > 0) {
    const s = calculateScore();
    document.getElementById("blackScore").textContent = Math.round(
      s.blackTotal,
    );
    document.getElementById("whiteScore").textContent = Math.round(
      s.whiteTotal,
    );
  }
}

// ============= Toast =============
let toastTimer = null;
function showToast(msg, type = "info") {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  if (toastTimer) clearTimeout(toastTimer);
  requestAnimationFrame(() => toast.classList.add("show"));
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

// ============= 事件绑定 =============
function getCanvasCoord(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;
  return {
    x: Math.round((mx - margin) / cellSize),
    y: Math.round((my - margin) / cellSize),
  };
}

canvas.addEventListener("mousemove", (e) => {
  const { x, y } = getCanvasCoord(e);
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    if (!hoverPos || hoverPos.x !== x || hoverPos.y !== y) {
      hoverPos = { x, y };
      draw();
    }
  } else if (hoverPos) {
    hoverPos = null;
    draw();
  }
});

canvas.addEventListener("mouseleave", () => {
  if (hoverPos) {
    hoverPos = null;
    draw();
  }
});

canvas.addEventListener("click", (e) => {
  const { x, y } = getCanvasCoord(e);
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
    placeStone(x, y);
  }
});

// 触摸支持
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = getCanvasCoord(touch);
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
      placeStone(x, y);
    }
  },
  { passive: false },
);

document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById("passBtn").addEventListener("click", pass);
document
  .getElementById("recordPrevBtn")
  .addEventListener("click", () => goToSnapshot(viewingIdx - 1));
document
  .getElementById("recordNextBtn")
  .addEventListener("click", () => goToSnapshot(viewingIdx + 1));

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  const k = e.key.toLowerCase();
  if (k === "n") newGame();
  else if (k === "p") pass();
  else if (k === "arrowleft") goToSnapshot(viewingIdx - 1);
  else if (k === "arrowright") goToSnapshot(viewingIdx + 1);
});

// 启动
initBoard(19);
