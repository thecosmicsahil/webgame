const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "https://saya17.vercel.app", // Allow all origins in development
    methods: ["GET", "POST"]
  }
});

// Game state
let players = {};
const gameState = {
  tableReserved: false,
  musicPlaying: false,
  candleLit: false
};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle player joining
  socket.on('player-join', (playerData) => {
    players[playerData.character] = {
      name: playerData.name,
      character: playerData.character,
      food: null,
      x: playerData.x,
      y: playerData.y
    };
    
    io.emit('update-players', players);
  });

  // Handle player movement
  socket.on('player-move', (posData) => {
    const player = Object.values(players).find(p => p.name === socket.player);
    if (!player) return;
    
    player.x = posData.x;
    player.y = posData.y;
    
    io.emit('update-players', players);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    // Broadcast the chat message to all clients
    io.emit('chat-message', {
      player: data.player,
      message: data.message
    });
  });

  // Handle food orders
  socket.on('select-order', (data) => {
    if (players[data.character]) {
      players[data.character].food = data.food;
      io.emit('update-order', {
        character: data.character,
        food: data.food
      });
      io.emit('update-players', players);
    }
  });

  // Handle ambience updates
  socket.on('ambience-update', (data) => {
    switch(data.type) {
      case 'music':
        gameState.musicPlaying = data.state;
        break;
      case 'candle':
        gameState.candleLit = data.state;
        break;
      case 'table':
        gameState.tableReserved = data.state;
        break;
    }
    io.emit('update-gameState', gameState);
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    // Find and remove the disconnected player
    const playerChar = Object.entries(players).find(([char, p]) => p.name === socket.player);
    if (playerChar) {
      delete players[playerChar[0]];
      io.emit('update-players', players);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Valentine's Date Simulator server running on port ${PORT}`);
});