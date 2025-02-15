const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://www.sahilarya.shop",
    methods: ["GET", "POST"]
  }
});

let players = {};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Send current players to new connection
  socket.emit('update-players', players);

  // Handle player joining game
  socket.on('player-join', (data) => {
    players[socket.id] = {
      id: socket.id,
      character: data.character,
      x: data.x,
      y: data.y,
      food: null,
      lastUpdated: Date.now()
    };
    io.emit('update-players', players);
  });

  
  // Handle player movement
  socket.on('player-move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].lastUpdated = Date.now();
      io.emit('update-players', players);
    }
  });

  // Handle food orders
  socket.on('select-order', (data) => {
    if (players[socket.id]) {
      players[socket.id].food = data.food;
      io.emit('update-players', players);
    }
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    io.emit('chat-message', {
      player: players[socket.id].character,
      message: data.message
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update-players', players);
    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
