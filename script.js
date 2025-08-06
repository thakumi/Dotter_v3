// =========================================
// 基本変数
// =========================================
let gridCount = 10;
let tool = 'pen';
let dotSize = 1;
let color = '#000000';
let isDrawing = false;
let undoStack = [];
let redoStack = [];
let pixelData = [];
let colorHistory = [];

const gridElement = document.getElementById('grid');
const hoverBox = document.getElementById('hoverBox');
const gridCountInput = document.getElementById('gridCount');
const gridCountLabel = document.getElementById('gridCountLabel');
const colorHistoryElement = document.getElementById('colorHistory');
const hiddenColorPicker = document.getElementById('colorPicker');
const colorPickerBtn = document.getElementById('colorPickerBtn');
const importSvgInput = document.getElementById('importSvg');
const importSvgBtn = document.getElementById('importSvgBtn');

const CANVAS_SIZE = 500;

// Hover animation state
let hoverTarget = { x: 0, y: 0, w: 0, h: 0, visible: false };
let hoverCurrent = { x: 0, y: 0, w: 0, h: 0 };

// =========================================
// SVGアイコン読み込み（CSSボタンサイズに合わせて自動フィット）
// =========================================
function loadSVG(buttonId, svgPath) {
  fetch(svgPath)
    .then(res => res.text())
    .then(svgText => {
      const wrapper = document.getElementById(buttonId);
      wrapper.innerHTML = svgText;

      const svgEl = wrapper.querySelector('svg');
      if (svgEl) {
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');

        if (!svgEl.getAttribute('viewBox')) {
          try {
            const bbox = svgEl.getBBox();
            svgEl.setAttribute(
              'viewBox',
              `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
            );
          } catch (e) {
            console.warn(`BBox取得失敗: ${svgPath}`);
          }
        }

        const btnSize = wrapper.getBoundingClientRect().width;
        svgEl.style.width = `${btnSize * 1}px`;
        svgEl.style.height = `${btnSize * 1}px`;
        svgEl.style.display = 'block';

        // ====== ここから Hover アニメーション設定 ======
        wrapper.addEventListener('mouseenter', () => {
          const rects = Array.from(svgEl.querySelectorAll('rect'));
          if (rects.length === 0) return;

          // 一旦全部非表示（透明）
          rects.forEach(r => r.style.opacity = 0);

          // ランダム順に並び替え
          const shuffled = rects.sort(() => Math.random() - 0.5);

          // 順番に表示
          shuffled.forEach((rect, i) => {
            setTimeout(() => {
              rect.style.transition = 'opacity 0.01s ease';
              rect.style.opacity = 1;
            }, i * 9); // 50ms間隔で1つずつ
          });
        });
        // ====== ここまで ======
      }
    })
    .catch(err => console.error(`SVG読み込み失敗: ${svgPath}`, err));
}


// アイコン設定
const iconMap = {
  pen: 'icons/pen.svg',
  eraser: 'icons/eraser.svg',
  dotSize: 'icons/size.svg',
  colorPickerBtn: 'icons/color.svg',
  undo: 'icons/undo.svg',
  redo: 'icons/redo.svg',
  clear: 'icons/clear.svg',
  saveSvg: 'icons/save.svg',
   importSvgBtn: 'icons/load.svg' // ← 追加
};

// ページ読み込み時に全アイコン読込
window.addEventListener('DOMContentLoaded', () => {
  Object.entries(iconMap).forEach(([id, path]) => loadSVG(id, path));
});

// =========================================
// 基本関数
// =========================================
function initPixelData(count) {
  pixelData = Array.from({ length: count }, () => Array(count).fill('white'));
}

function resizePixelDataCenter(newCount) {
  let newData = Array.from({ length: newCount }, () => Array(newCount).fill('white'));
  let oldCount = pixelData.length;
  let offset = Math.floor((newCount - oldCount) / 2);
  for (let r = 0; r < oldCount; r++) {
    for (let c = 0; c < oldCount; c++) {
      let nr = r + offset, nc = c + offset;
      if (nr >= 0 && nr < newCount && nc >= 0 && nc < newCount) {
        newData[nr][nc] = pixelData[r][c];
      }
    }
  }
  pixelData = newData;
}

// =========================================
// SAVE SVG
// =========================================
document.getElementById('saveSvg').onclick = () => {
  const cellSize = CANVAS_SIZE / gridCount;
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}">`;

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const fill = pixelData[r][c];
      if (fill !== 'white' && fill !== '') {
        svgContent += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="${fill}" />`;
      }
    }
  }

  svgContent += '</svg>';

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pixel_art.svg';
  link.click();
};

// =========================================
// IMPORT SVG（gridCount自動反映）
// =========================================
importSvgBtn.addEventListener('click', () => {
  importSvgInput.click();
});

importSvgInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(reader.result, 'image/svg+xml');
    const rects = svgDoc.querySelectorAll('rect');

    if (rects.length === 0) {
      alert('このSVGにはrect要素が見つかりません。');
      return;
    }

    // rectサイズからgridCount計算
    let cellSize = parseFloat(rects[0].getAttribute('width')) || 1;
    let newGridCount = Math.round(CANVAS_SIZE / cellSize);

    // gridCount反映
    gridCount = newGridCount;
    gridCountInput.value = newGridCount;
    gridCountLabel.textContent = newGridCount;

    // pixelData初期化
    pixelData = Array.from({ length: gridCount }, () => Array(gridCount).fill('white'));

    // rect情報反映
    rects.forEach(rect => {
      const x = parseFloat(rect.getAttribute('x'));
      const y = parseFloat(rect.getAttribute('y'));
      const fill = rect.getAttribute('fill') || '#000';
      const col = Math.round(x / cellSize);
      const row = Math.round(y / cellSize);
      if (row >= 0 && row < gridCount && col >= 0 && col < gridCount) {
        pixelData[row][col] = fill;
      }
    });

    renderGrid();
  };

  reader.readAsText(file);
});

// =========================================
// グリッド描画
// =========================================
function renderGrid() {
  gridElement.innerHTML = '';
  gridElement.style.width = `${CANVAS_SIZE}px`;
  gridElement.style.height = `${CANVAS_SIZE}px`;
  gridElement.style.gridTemplateColumns = `repeat(${gridCount}, 1fr)`;
  gridElement.style.gridTemplateRows = `repeat(${gridCount}, 1fr)`;

  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      if (pixelData[r][c] !== 'white') {
        cell.classList.add('filled');
        cell.style.backgroundColor = pixelData[r][c];
      }
      cell.dataset.row = r;
      cell.dataset.col = c;

      cell.addEventListener('mousedown', () => {
        saveHistory();
        draw(r, c);
        isDrawing = true;
      });

      cell.addEventListener('mouseover', () => {
        if (isDrawing) draw(r, c);
        updateHoverTarget(r, c);
      });

      gridElement.appendChild(cell);
    }
  }
}

// =========================================
// 描画処理
// =========================================
function draw(row, col) {
  const startRow = row - Math.floor(dotSize / 2);
  const startCol = col - Math.floor(dotSize / 2);
  for (let r = startRow; r < startRow + dotSize; r++) {
    for (let c = startCol; c < startCol + dotSize; c++) {
      if (r >= 0 && r < gridCount && c >= 0 && c < gridCount) {
        pixelData[r][c] = (tool === 'pen') ? color : 'white';
        const idx = r * gridCount + c;
        const cell = gridElement.children[idx];
        cell.style.backgroundColor = pixelData[r][c];
        if (pixelData[r][c] === 'white') {
          cell.classList.remove('filled');
        } else {
          cell.classList.add('filled');
        }
      }
    }
  }
  if (tool === 'pen') updateColorHistory();
}

// =========================================
// Undo / Redo
// =========================================
function saveHistory() {
  undoStack.push(JSON.stringify(pixelData));
  redoStack = [];
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(JSON.stringify(pixelData));
    pixelData = JSON.parse(undoStack.pop());
    renderGrid();
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(JSON.stringify(pixelData));
    pixelData = JSON.parse(redoStack.pop());
    renderGrid();
  }
}

// =========================================
// Hover Box
// =========================================
function updateHoverTarget(row, col) {
  const rect = gridElement.getBoundingClientRect();
  const cellSize = rect.width / gridCount;
  const startRow = row - Math.floor(dotSize / 2);
  const startCol = col - Math.floor(dotSize / 2);
  let w = cellSize * dotSize, h = cellSize * dotSize;
  let l = Math.max(0, startCol) * cellSize;
  let t = Math.max(0, startRow) * cellSize;
  if (startCol + dotSize > gridCount) w = (gridCount - startCol) * cellSize;
  if (startRow + dotSize > gridCount) h = (gridCount - startRow) * cellSize;
  hoverTarget = { x: l, y: t, w, h, visible: true };
}

function animateHoverBox() {
  const ease = 0.1;
  hoverCurrent.x += (hoverTarget.x - hoverCurrent.x) * ease;
  hoverCurrent.y += (hoverTarget.y - hoverCurrent.y) * ease;
  hoverCurrent.w += (hoverTarget.w - hoverCurrent.w) * ease;
  hoverCurrent.h += (hoverTarget.h - hoverCurrent.h) * ease;

  if (hoverTarget.visible) {
    hoverBox.style.display = 'block';
    hoverBox.style.left = `${hoverCurrent.x}px`;
    hoverBox.style.top = `${hoverCurrent.y}px`;
    hoverBox.style.width = `${hoverCurrent.w}px`;
    hoverBox.style.height = `${hoverCurrent.h}px`;
  } else {
    hoverBox.style.display = 'none';
  }
  requestAnimationFrame(animateHoverBox);
}

function hideHoverBox() {
  hoverTarget.visible = false;
}

// =========================================
// カラー履歴
// =========================================
function updateColorHistory() {
  if (!colorHistory.includes(color)) {
    colorHistory.unshift(color);
    if (colorHistory.length > 10) colorHistory.pop();
    renderColorHistory();
  }
}

function renderColorHistory() {
  colorHistoryElement.innerHTML = '';
  colorHistory.forEach(c => {
    const sw = document.createElement('div');
    sw.style.backgroundColor = c;
    sw.addEventListener('click', () => {
      color = c;
      hiddenColorPicker.value = c;
    });
    colorHistoryElement.appendChild(sw);
  });
}

// =========================================
// イベント
// =========================================
gridElement.addEventListener('mouseleave', hideHoverBox);
document.addEventListener('mouseup', () => { isDrawing = false; });

document.getElementById('pen').onclick = () => tool = 'pen';
document.getElementById('eraser').onclick = () => tool = 'eraser';
document.getElementById('dotSize').onclick = () => {
  dotSize = dotSize % 5 + 1;
  document.getElementById('dotSize').innerText = dotSize + 'x';
};
document.getElementById('undo').onclick = undo;
document.getElementById('redo').onclick = redo;
document.getElementById('clear').onclick = () => {
  saveHistory();
  pixelData = pixelData.map(r => r.map(() => 'white'));
  renderGrid();
};

// カラーピッカー
colorPickerBtn.addEventListener('click', () => {
  hiddenColorPicker.click();
});

hiddenColorPicker.addEventListener('input', e => {
  color = e.target.value;

  // color.svgアイコンの塗りを変更
  const svgEl = document.querySelector('#colorPickerBtn svg');
  if (svgEl) {
    svgEl.querySelectorAll('[fill]').forEach(el => {
      el.setAttribute('fill', color);
    });
  }
});

// グリッドサイズ変更
gridCountInput.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
});
gridCountInput.addEventListener('change', () => {
  let newCount = parseInt(gridCountInput.value);
  if (isNaN(newCount) || newCount < 1 || newCount > 100) return;
  gridCountLabel.textContent = newCount;
  resizePixelDataCenter(newCount);
  gridCount = newCount;
  undoStack = [];
  redoStack = [];
  renderGrid();
});

// =========================================
// 初期化
// =========================================
initPixelData(gridCount);
renderGrid();
animateHoverBox();
