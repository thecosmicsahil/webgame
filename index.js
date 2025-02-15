const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://saya17.vercel.app"], // Your Vercel URL
    methods: ["GET", "POST"]
  }
});

// Game constants
const MAP_WIDTH = 320;
const MAP_HEIGHT = 180;
const PLAYER_SPEED = 2;
const PLAYER_SIZE = 16;

// Game state
let players = {};
let chatMessages = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle new player joining
  socket.on('join', (playerData) => {
    players[socket.id] = {
      id: socket.id,
      name: playerData.name.substring(0, 12),
      color: playerData.color || '#ff69b4',
      x: MAP_WIDTH/2 - PLAYER_SIZE/2,
      y: MAP_HEIGHT - PLAYER_SIZE*2,
      velocityX: 0,
      direction: 1,
      lastChat: 0,
      currentMessage: ''
    };
    
    io.emit('update', players);
  });

  // Handle player movement
  socket.on('move', (direction) => {
    if (!players[socket.id]) return;

    const player = players[socket.id];
    player.velocityX = direction * PLAYER_SPEED;
    
    // Update direction for sprite orientation
    if (direction !== 0) {
      player.direction = direction;
    }
  });

  // Handle chat messages
  socket.on('chat', (message) => {
    if (!players[socket.id]) return;
    
    const player = players[socket.id];
    const now = Date.now();
    
    // Prevent spamming
    if (now - player.lastChat < 3000) return;
    
    player.lastChat = now;
    player.currentMessage = message.substring(0, 30);
    io.emit('chat', { id: socket.id, message: player.currentMessage });
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update', players);
  });
});

// Game loop
setInterval(() => {
  const now = Date.now();
  
  // Update player positions
  Object.values(players).forEach(player => {
    // Apply movement
    player.x += player.velocityX;
    
    // Keep within map bounds
    player.x = Math.max(0, Math.min(MAP_WIDTH - PLAYER_SIZE, player.x));
    
    // Clear old chat messages
    if (now - player.lastChat > 3000) {
      player.currentMessage = '';
    }
  });

  // Broadcast game state
  io.emit('update', players);
}, 1000/60);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});