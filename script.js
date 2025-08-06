let gridCount = 25;
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

const CANVAS_SIZE = 500;

// Hover animation state
let hoverTarget = { x: 0, y: 0, w: 0, h: 0, visible: false };
let hoverCurrent = { x: 0, y: 0, w: 0, h: 0 };

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
  const ease = 0.1; // ゆっくりに
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
      document.getElementById('colorPicker').value = c;
    });
    colorHistoryElement.appendChild(sw);
  });
}

gridElement.addEventListener('mouseleave', hideHoverBox);
document.addEventListener('mouseup', () => { isDrawing = false; });

document.getElementById('pen').onclick = () => tool = 'pen';
document.getElementById('eraser').onclick = () => tool = 'eraser';
document.getElementById('colorPicker').oninput = e => color = e.target.value;
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

document.getElementById('saveSvg').onclick = () => {
  const cellSize = 20; // px
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${gridSize * cellSize}" height="${gridSize * cellSize}">`;

  [...grid.children].forEach((cell, i) => {
    const color = cell.style.backgroundColor || 'white';
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    if (color !== 'white' && color !== '') {
      svgContent += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" />`;
    }
  });

  svgContent += '</svg>';

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pixel_art.svg';
  link.click();
};

initPixelData(gridCount);
renderGrid();
animateHoverBox();
