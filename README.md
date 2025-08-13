# McTrivia

A simple little trivia game you can play with friends and family.

## Features
- Host or join a game with a generated code
- Unlimited, untimed trivia questions from [The Trivia API](https://the-trivia-api.com/)
- Real-time multiplayer with **Socket.IO**
- Leaderboard to track scores
- Reconnect to a game as long as at least one player stays connected

## Tech Stack
- **Frontend:** React + TypeScript
- **Backend:** Node.js + Express
- **Real-time:** Socket.IO
- **Questions:** The Trivia API

## Run Locally
```bash
# From the repo root
# 1) Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install

# 2) Start both frontend & backend
cd ..
npm run dev
```

## Play Online
Live here: **https://mctrivia.onrender.com**  
*(Free tier on Render — it might take a minute to wake up.)*
