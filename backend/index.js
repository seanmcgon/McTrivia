const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

let games = {}; // Temporary in-memory store
let socketToPlayerId = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create_game", ({ name, playerId }, callback) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    console.log("Code generated: " + code);

    games[code] = {
      host: playerId,
      players: {
        [playerId]: {
          name: name,
          score: 0,
          connected: true,
          socketId: socket.id,
        },
      },
      questions: [],
      currentQ: 0,
      connectionCount: 1,
    };
    socketToPlayerId[socket.id] = playerId;

    socket.join(code);
    callback(code, games[code].players);
  });

  socket.on("join_game", ({ code, name, playerId }, callback) => {
    if (games[code]) {
      if (games[code].players[playerId]) {
        games[code].players[playerId].connected = true;
        games[code].players[playerId].socketId = socket.id;
      } else {
        games[code].players[playerId] = {
          name: name,
          score: 0,
          connected: true,
          socketId: socket.id,
        };
      }
      socketToPlayerId[socket.id] = playerId;

      games[code].connectionCount++;
      socket.join(code);
      io.to(code).emit("player_joined", games[code].players);
      callback({ success: true, players: games[code].players });
    } else {
      callback({ success: false, error: "Game not found" });
    }
  });

  socket.on("disconnecting", () => {
    const playerId = socketToPlayerId[socket.id];
    delete socketToPlayerId[socket.id];

    // Loop through the rooms the socket was in
    for (const room of socket.rooms) {
      // Skip the socket's own room
      if (room === socket.id) continue;
      const game = games[room];
      if (!game || !game.players[playerId]) continue;

      game.players[playerId].connected = false;
      game.connectionCount--;

      if (game.connectionCount <= 0) {
        delete games[room];
      } else {
        io.to(room).emit("player_left", game.players);

        // Host reassignment
        if (playerId === game.host) {
          for (const id in game.players) {
            if (game.players[id].connected) {
              game.host = id;
              io.to(room).emit("new_host", id);
              break;
            }
          }
        }
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    // Cleanup logic here if desired
  });
});

server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
