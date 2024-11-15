const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', 
  }
});

let board = null;
const players = { 'red': null, 'yellow': null };
let player = 'red';

function reset() {
  board = Array(6).fill(0).map(() => Array(8).fill('white')); 
  players['red'] = null;
  players['yellow'] = null; 
  player = 'red'; 
}

function checkVictory(i, j) {
  const c = board[i][j];

  let count = 0;
  
  for (let k = 1; k < 4; ++k) {
    if (j - k < 0) break;
    if (board[i][j - k] !== c) break;
    count++;
  }
  
  for (let k = 1; k < 4; ++k) {
    if (j + k > 7) break;
    if (board[i][j + k] !== c) break;
    count++;
  }
  if (count > 2) return true;

  count = 0;
  for (let k = 1; k < 4; ++k) {
    if (i - k < 0) break;
    if (board[i - k][j] !== c) break;
    count++;
  }
 
  for (let k = 1; k < 4; ++k) {
    if (i + k > 5) break;
    if (board[i + k][j] !== c) break;
    count++;
  }

  if (count > 2) return true;

  count = 0;

  for (let k = 1; k < 4; ++k) {
    if (i - k < 0 || j - k < 0) break;
    if (board[i - k][j - k] !== c) break;
    count++;
  }

  for (let k = 1; k < 4; ++k) {
    if (i + k > 5 || j + k > 7) break;
    if (board[i + k][j + k] !== c) break;
    count++;
  }

  if (count > 2) return true;

  count = 0;

  for (let k = 1; k < 4; ++k) {
    if (i + k > 5 || j - k < 0) break;
    if (board[i + k][j - k] !== c) break;
    count++;
  }

  for (let k = 1; k < 4; ++k) {
    if (i - k < 0 || j + k > 7) break;
    if (board[i - k][j + k] !== c) break;
    count++;
  }

  return count > 2;
}

io.on('connection', function (socket) {

  console.log(`Player connected: ${socket.id}`);

  if (players['red'] == null) {
    players['red'] = socket;
    socket.emit('color', 'red');
  } else if (players['yellow'] == null) {
    players['yellow'] = socket;
    socket.emit('color', 'yellow');
    io.emit('turn', 'red');
  } else {
    console.log('Game is full. Disconnecting extra player.');
    socket.disconnect();
  }

  socket.on('disconnect', function () {
    console.log(`Player disconnected: ${socket.id}`);
    if (players['red'] === socket) {
      players['red'] = null;
    } else if (players['yellow'] === socket) {
      players['yellow'] = null;
    }
    reset();
  });

  socket.on('click', function (column) {
    if (players[player] !== socket) {
      console.log(`Click from wrong player: ${player === 'red' ? 'yellow' : 'red'}`);
      return;
    }

    if (board[0][column] !== 'white') {
      console.log(`Click on full column: ${column}`);
      return;
    }

    if ((players['red'] == null) || (players['yellow'] == null)) {
      console.log('Click before all players are connected');
      return;
    }

    let row = -1;
    for (row = 5; row >= 0; --row) {
      if (board[row][column] === 'white') {
        board[row][column] = player;
        break;
      }
    }

    io.emit('board', board);

    if (checkVictory(row, column)) {
      io.emit('victory', player);
      reset();
      return;
    }

    player = player === 'red' ? 'yellow' : 'red';
    io.emit('turn', player);
  });
});

reset();
const port = process.env.PORT || 1337
httpServer.listen(port, () => {
  console.log('Listening on port ' + port + '...');
});


app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});