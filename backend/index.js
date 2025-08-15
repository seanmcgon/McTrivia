const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

// Serve static files from the client build
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Serve frontend for all other routes
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

let games = {}; // Temporary in-memory store
let socketToPlayerId = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("create_game", ({ name, playerId }, callback) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    console.log("Code generated: " + code);

    games[code] = {
      host: playerId,
      players: {
        [playerId]: {
          name: name,
          score: 0,
          connected: true,
          socketId: socket.id,
          choice: "",
        },
      },
      questions: [],
      currentQ: 0,
      connectionCount: 1,
      numSubmitted: 0,
    };
    socketToPlayerId[socket.id] = playerId;

    socket.join(code);
    callback(code, games[code].players);
  });

  socket.on("join_game", ({ code, name, playerId }, callback) => {
    if (games[code]) {
      let restart = false;
      if (games[code].players[playerId]) {
        games[code].players[playerId].connected = true;
        games[code].players[playerId].socketId = socket.id;
        restart = true;
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
      if (restart) {
        io.to(code).emit("restart_game");
      }
    } else {
      callback({ success: false, error: "Game not found" });
    }
  });

  socket.on("next_question", async ({ code }) => {
    const game = games[code];
    if (game) {
      if (game.currentQ >= game.questions.length) {
        const response = await fetch("https://the-trivia-api.com/v2/questions");
        if (!response.ok) {
          console.error(
            "Failed to fetch new questions:",
            response.status,
            response.statusText
          );
          io.to(code).emit("question_error", [
            response.status,
            response.statusText,
          ]);
          return;
        }
        const newQuestions = await response.json();
        const formattedQs = newQuestions.map((question) => {
          return {
            qText: question["question"]["text"],
            correctA: question["correctAnswer"],
            otherAs: question["incorrectAnswers"],
          };
        });
        console.log(formattedQs);
        game.questions = formattedQs;
        // game.questions = [
        //   {
        //     qText: "Where Does Key Lime Pie Come From?",
        //     correctA: "Florida ",
        //     otherAs: ["South America", "France", "Mexico this is a long answer option to test the sizing of the buttons aaaaaaaaaaaahhhhhhhhhh"],
        //   },
        // {
        //   qText: "What Became America's 50th State On August 21st 1959?",
        //   correctA: "Hawaii",
        //   otherAs: ["Alaska", "Puerto Rico", "New Mexico"],
        // },
        // {
        //   qText:
        //     "Which country has the largest amount of timezones on its mainland?",
        //   correctA: "Russia",
        //   otherAs: ["China", "The USA", "Australia"],
        // },
        // ];
        game.currentQ = 0;
      }
    }
    console.log("Sending question to " + game.connectionCount + " players");

    // Confirm that players' choices are reset to "" for new question
    for (const player of Object.keys(game.players)) {
      game.players[player].choice = "";
    }

    io.to(code).emit("question_served", game.questions[game.currentQ]);
    game.currentQ++;
  });

  socket.on("start_game", ({ code }) => {
    const game = games[code];
    if (game) {
      io.to(code).emit("game_started");
    }
  });

  socket.on("submit_answer", ({ code, id, correct, choice }) => {
    const game = games[code];
    if (game) {
      // if (correct) {
      //   game.players[id].score++;
      // }

      // Don't increment numSubmitted if player has already made a prior choice
      // if (!game.players[id].choice) {
      //   game.numSubmitted++;
      // }

      game.players[id].choice = choice;

      // If every connected player had made a choice then reveal answers
      if (
        Object.values(game.players).every(
          (player) =>
            !player.connected || (player.connected && player.choice !== "")
        )
      ) {
        for (const player of Object.keys(game.players)) {
          if (
            game.players[player].choice ===
              game.questions[game.currentQ - 1].correctA &&
            game.players[player].connected
          ) {
            game.players[player].score++;
          }
        }
        io.to(code).emit("reveal_answers", game.players);
        // game.numSubmitted = 0;
        for (const player of Object.keys(game.players)) {
          game.players[player].choice = "";
        }
      }
    }
  });

  socket.on("resend_question", ({ code }, callback) => {
    const game = games[code];
    if (game) {
      callback(game.questions[game.currentQ - 1]);
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
