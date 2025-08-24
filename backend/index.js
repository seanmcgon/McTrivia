require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const { Redis } = require("@upstash/redis");

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

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// When server starts, mark all games as recovering and all players as disconnected
const recover = async () => {
  await redis.set("recovering", "1", { ex: 120 });

  const keys = await redis.keys("game:*"); // gets all game keys
  for (const key of keys) {
    const game = await redis.get(key);
    if (!game) continue;

    for (const playerId in game.players) {
      game.players[playerId].connected = false;
    }

    await redis.set(key, JSON.stringify(game));
  }
};
recover();
setTimeout(async () => {
  await redis.del("recovering");
  console.log("Server recovery finished");
}, 5000); // wait 5 seconds for reconnects

let socketToPlayerId = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  socket.emit("identify_yourself", async (code, id) => {
    const socketId = socket.id;

    // Lua script to safely update the player inside the game object
    const script = `
    local key = KEYS[1]
    local gameJson = redis.call("GET", key)
    if not gameJson then
      return nil
    end

    local game = cjson.decode(gameJson)

    if not game["players"] or not game["players"][ARGV[1]] then
      return nil
    end

    -- Update player
    game["players"][ARGV[1]]["connected"] = true
    game["players"][ARGV[1]]["socketId"] = ARGV[2]

    -- Save back
    redis.call("SET", key, cjson.encode(game), "EX", 7200)
    return game
    `;

    const updated = await redis.eval(script, [`game:${code}`], [id, socketId]);

    if (updated) {
      socketToPlayerId[socket.id] = id;
      socket.join(code);
      console.log(`Player ${id} reconnected to game ${code}`);
    } else {
      console.log(`Failed to reconnect player ${id} to game ${code}`);
    }
  });

  socket.on("create_game", async ({ name, playerId }, callback) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    console.log("Code generated: " + code);

    const game = {
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
    };

    await redis.set(`game:${code}`, JSON.stringify(game), {
      ex: 7200,
    });

    socketToPlayerId[socket.id] = playerId;

    socket.join(code);
    callback(code, game.players);
  });

  socket.on("join_game", async ({ code, name, playerId }, callback) => {
    let game = await redis.get(`game:${code}`);
    if (game) {
      let restart = false;
      if (game.players[playerId]) {
        game.players[playerId].connected = true;
        game.players[playerId].socketId = socket.id;
        restart = true;
      } else {
        game.players[playerId] = {
          name: name,
          score: 0,
          connected: true,
          socketId: socket.id,
        };
      }
      socketToPlayerId[socket.id] = playerId;

      await redis.set(`game:${code}`, JSON.stringify(game), {
        ex: 7200,
      });

      socket.join(code);
      io.to(code).emit("player_joined", game.players);
      callback({ success: true, players: game.players });
      if (restart) {
        io.to(code).emit("restart_game");
        setTimeout(() => io.to(code).emit("new_host", game.host), 500);
      }
    } else {
      callback({ success: false, error: "Game not found" });
    }
  });

  socket.on("next_question", async ({ code }) => {
    let locked = await redis.exists("recovering");
    if (locked) {
      return; // skip submission
    }

    // Try to acquire lock
    const gotLock = await redis.set(`game:${code}:lock`, 1, {
      NX: true,
      EX: 5,
    });
    if (!gotLock) return; // someone else is already updating

    io.to(code).emit("next_question_confirmed");

    let game = await redis.get(`game:${code}`);
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
        //     otherAs: [
        //       "South America",
        //       "France",
        //       "Mexico this is a long answer option to test the sizing of the buttons aaaaaaaaaaaahhhhhhhhhh",
        //     ],
        //   },
        //   {
        //     qText: "What Became America's 50th State On August 21st 1959?",
        //     correctA: "Hawaii",
        //     otherAs: ["Alaska", "Puerto Rico", "New Mexico"],
        //   },
        //   {
        //     qText:
        //       "Which country has the largest amount of timezones on its mainland?",
        //     correctA: "Russia",
        //     otherAs: ["China", "The USA", "Australia"],
        //   },
        // ];
        game.currentQ = 0;
      }

      console.log("Sending question to players");

      // Confirm that players' choices are reset to "" for new question
      for (const player of Object.keys(game.players)) {
        game.players[player].choice = "";
      }

      game.currentQ++;

      await redis.set(`game:${code}`, JSON.stringify(game), {
        ex: 7200,
      });

      io.to(code).emit("question_served", game.questions[game.currentQ - 1]);
    }

    // Remove lock
    await redis.del(`game:${code}:lock`);
  });

  socket.on("start_game", async ({ code }) => {
    let game = await redis.get(`game:${code}`);
    if (game) {
      io.to(code).emit("game_started");
    }
  });

  socket.on("submit_answer", async ({ code, id, choice }) => {
    // let result = null;
    // let updatedPlayers = {};
    // let reveal = false;

    // while (!result) {
    //   reveal = false;

    //   await redis.watch(`game:${code}`);
    //   let game = await redis.get(`game:${code}`);
    //   if (!game) return;

    //   game.players[id].choice = choice;

    //   // If every connected player had made a choice then reveal answers
    //   if (
    //     Object.values(game.players).every(
    //       (player) =>
    //         !player.connected || (player.connected && player.choice !== "")
    //     )
    //   ) {
    //     for (const player of Object.keys(game.players)) {
    //       if (
    //         game.players[player].choice ===
    //           game.questions[game.currentQ - 1].correctA &&
    //         game.players[player].connected
    //       ) {
    //         game.players[player].score++;
    //       }
    //     }
    //     updatedPlayers = game.players;
    //     reveal = true;

    //     for (const player of Object.keys(game.players)) {
    //       game.players[player].choice = "";
    //     }
    //   }

    //   const tx = redis.multi();
    //   tx.set(`game:${code}`, JSON.stringify(game), {
    //     ex: 7200,
    //   });
    //   result = await tx.exec();
    // }

    // if (reveal) io.to(code).emit("reveal_answers", updatedPlayers);

    const locked = await redis.exists("recovering");
    if (locked) {
      return; // skip submission
    }

    console.log("Processing an answer from " + id);

    const lua = `
    local key = KEYS[1]
    local id = ARGV[1]
    local choice = ARGV[2]
    local ttl = tonumber(ARGV[3])

    -- Fetch and decode the game
    local raw = redis.call("GET", key)
    if not raw then
      return nil
    end
    local game = cjson.decode(raw)

    -- Apply the player's choice
    game.players[id].choice = choice

    -- Check if all connected players have made a choice
    local allChosen = true
    for pid, player in pairs(game.players) do
      if player.connected and player.choice == "" then
        allChosen = false
        break
      end
    end

    local snapshot = nil

    if allChosen then
      -- Score updates
      local correctAnswer = game.questions[game.currentQ].correctA
      for pid, player in pairs(game.players) do
        if player.connected and player.choice == correctAnswer then
          player.score = player.score + 1
        end
      end

      -- Take snapshot BEFORE resetting choices
      snapshot = cjson.encode(game.players)

      -- Now reset choices
      for pid, player in pairs(game.players) do
        player.choice = ""
      end
    end

    -- Save back with TTL
    redis.call("SET", key, cjson.encode(game), "EX", ttl)

    -- Return snapshot (or nil if not ready)
    return snapshot
    `;

    const snapshot = await redis.eval(
      lua,
      (keys = [`game:${code}`]),
      (args = [id, choice, 7200])
    );

    socket.emit("submit_answer_confirmed", { choice });

    if (snapshot) {
      console.log("Revealing!");
      io.to(code).emit("reveal_answers", snapshot);
    }
  });

  socket.on("resend_question", async ({ code }, callback) => {
    console.log("Resending a question!");

    // First, check if a lock exists for this game
    const lock = await redis.get(`game:${code}:lock`);

    if (lock) {
      // Someone is updating the game (next_question in progress)
      console.log("Sike! we're transitioning rn");
      return; // ignore this resend request
    }

    // No lock — safe to resend the current question
    let game = await redis.get(`game:${code}`);
    if (game) {
      callback(game.questions[game.currentQ - 1]);
    }
  });

  socket.on("disconnecting", async () => {
    const playerId = socketToPlayerId[socket.id];
    delete socketToPlayerId[socket.id];

    // Loop through the rooms the socket was in
    for (const room of socket.rooms) {
      // Skip the socket's own room
      if (room === socket.id) continue;
      let game = await redis.get(`game:${room}`);
      if (!game || !game.players[playerId]) continue;

      game.players[playerId].connected = false;

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

      await redis.set(`game:${room}`, JSON.stringify(game), {
        ex: 7200,
      });
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
