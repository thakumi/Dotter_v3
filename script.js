let gridSize = 25;
let tool = 'pen';
let dotSize = 1;
let color = '#000000';
let isDrawing = false;
let history = []; // 履歴管理用

const grid = document.getElementById('grid');

function saveHistory() {
  const state = [...grid.children].map(cell => cell.style.backgroundColor || 'white');
  history.push(state);
  if (history.length > 50) history.shift(); // メモリ節約
}

function createGrid(size) {
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${size}, 20px)`;
  grid.style.gridTemplateRows = `repeat(${size}, 20px)`;
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.style.width = '20px';
    cell.style.height = '20px';
    cell.addEventListener('mousedown', () => { saveHistory(); draw(cell); isDrawing = true; });
    cell.addEventListener('mouseover', () => { if (isDrawing) draw(cell); });
    grid.appendChild(cell);
  }
}

function draw(cell) {
  if (tool === 'pen') {
    const index = [...grid.children].indexOf(cell);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    for (let r = row; r < row + dotSize && r < gridSize; r++) {
      for (let c = col; c < col + dotSize && c < gridSize; c++) {
        grid.children[r * gridSize + c].style.backgroundColor = color;
      }
    }
  } else if (tool === 'eraser') {
    cell.style.backgroundColor = 'white';
  }
}

function restoreState(state) {
  if (!state) return;
  [...grid.children].forEach((cell, i) => {
    cell.style.backgroundColor = state[i];
  });
}

document.body.addEventListener('mouseup', () => { isDrawing = false; });

document.getElementById('pen').onclick = () => tool = 'pen';
document.getElementById('eraser').onclick = () => tool = 'eraser';
document.getElementById('colorPicker').oninput = e => color = e.target.value;

document.getElementById('dotSize').onclick = () => {
  dotSize = dotSize % 5 + 1;
  document.getElementById('dotSize').innerText = dotSize + 'x';
};

document.getElementById('sizeBtn').onclick = () => {
  const newSize = parseInt(prompt('キャンバスサイズを入力（例: 25）', gridSize));
  if (!isNaN(newSize) && newSize > 0 && newSize <= 100) {
    gridSize = newSize;
    document.getElementById('sizeBtn').innerText = `${gridSize} × ${gridSize}`;
    createGrid(gridSize);
    history = [];
  }
};

document.getElementById('undo').onclick = () => {
  const prevState = history.pop();
  restoreState(prevState);
};

document.getElementById('clear').onclick = () => {
  saveHistory();
  [...grid.children].forEach(cell => cell.style.backgroundColor = 'white');
};

createGrid(gridSize);
