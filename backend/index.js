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

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create_game", (callback) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    games[code] = { host: socket.id, players: [], questions: [], currentQ: 0 };
    socket.join(code);
    callback(code);
  });

  socket.on("join_game", ({ code, name }, callback) => {
    if (games[code]) {
      games[code].players.push({ id: socket.id, name, score: 0 });
      socket.join(code);
      io.to(code).emit("player_joined", games[code].players);
      callback({ success: true });
    } else {
      callback({ success: false, error: "Game not found" });
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
