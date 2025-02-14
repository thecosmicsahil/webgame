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

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Handle player joining
  socket.on('player-join', (playerData) => {
    players[socket.id] = {
      ...playerData,
      id: socket.id,
      x: 400,
      y: 300
    };
    io.emit('update-players', players);
  });

  // Handle player movement
  socket.on('player-move', (position) => {
    if (players[socket.id]) {
      players[socket.id].x = position.x;
      players[socket.id].y = position.y;
      io.emit('update-players', players);
    }
  });

  // Handle orders
  socket.on('select-order', (order) => {
    if (players[socket.id]) {
      players[socket.id].food = order.food;
      io.emit('update-players', players);
    }
  });
  
  socket.on('chat-message', (data) => {
    io.emit('chat-message', {
      player: data.player,
      message: data.message
    });
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update-players', players);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});