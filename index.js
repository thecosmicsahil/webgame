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

// Game state
let players = {};
const foodMenu = {
  '🍕 Pizza': 10,
  '🍷 Wine': 15,
  '🍰 Dessert': 8
};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle new player joining
  socket.on('join', (playerData) => {
    players[socket.id] = {
      id: socket.id,
      name: playerData.name.substring(0, 12),
      type: playerData.type,
      x: playerData.x,
      y: playerData.y,
      message: null,
      food: null,
      lastChat: Date.now(),
      color: playerData.type === 'sahil' ? '#6b8cff' : '#ff6b8c'
    };
    
    io.emit('players-update', players);
  });

  // Handle player movement
  socket.on('move', (posData) => {
    if (!players[socket.id]) return;
    
    const player = players[socket.id];
    player.x = posData.x;
    player.y = posData.y;
    
    io.emit('players-update', players);
  });

  // Handle chat messages
  socket.on('chat', (messageData) => {
    if (!players[socket.id]) return;
    
    const player = players[socket.id];
    const now = Date.now();
    
    // Prevent spamming (3 second cooldown)
    if (now - player.lastChat < 3000) return;
    
    player.lastChat = now;
    player.message = {
      text: messageData.message.text.substring(0, 30),
      timestamp: now
    };
    
    io.emit('chat', player);
    io.emit('players-update', players);
  });

  // Handle food orders
  socket.on('order', (item) => {
    if (!players[socket.id] || !foodMenu[item]) return;
    
    const player = players[socket.id];
    player.food = {
      item: item,
      price: foodMenu[item],
      timestamp: Date.now()
    };
    
    io.emit('order-update', player);
    io.emit('players-update', players);
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('players-update', players);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});