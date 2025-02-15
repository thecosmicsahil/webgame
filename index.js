const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://saya17.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game state
const gameState = {
  players: {},
  waiter: { x: 10, y: 3 },
  chatMessages: {},
  mapSize: { width: 20, height: 15 }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Send initial game state
  socket.emit('initial-state', {
    state: gameState,
    playerId: socket.id
  });

  // Player join handler
  socket.on('player-join', (playerData) => {
    gameState.players[socket.id] = {
      id: socket.id,
      character: playerData.character,
      x: playerData.x,
      y: playerData.y,
      item: null
    };
    broadcastGameState();
  });

  // Player movement handler
  socket.on('player-move', (newPos) => {
    if (gameState.players[socket.id]) {
      // Validate movement within map bounds
      newPos.x = Math.max(0, Math.min(gameState.mapSize.width - 1, newPos.x));
      newPos.y = Math.max(0, Math.min(gameState.mapSize.height - 1, newPos.y));
      
      gameState.players[socket.id].x = newPos.x;
      gameState.players[socket.id].y = newPos.y;
      broadcastGameState();
    }
  });

  // Chat message handler
  socket.on('chat-message', ({ playerId, message }) => {
    gameState.chatMessages[playerId] = message.substring(0, 30);
    io.emit('chat-message', { playerId, message: gameState.chatMessages[playerId] });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      delete gameState.chatMessages[playerId];
      io.emit('chat-remove', playerId);
    }, 3000);
  });

  // Order selection handler
  socket.on('select-order', ({ playerId, item }) => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].item = item;
      broadcastGameState();
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    delete gameState.players[socket.id];
    delete gameState.chatMessages[socket.id];
    broadcastGameState();
    console.log('User disconnected:', socket.id);
  });

  function broadcastGameState() {
    io.emit('update-state', gameState);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});