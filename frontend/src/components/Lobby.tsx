import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import type { PlayersDict } from "./Game";

const socket = io("http://localhost:3001");

interface JoinResponse {
  success: boolean;
  players: PlayersDict;
}

function getOrCreatePlayerId() {
  let id = localStorage.getItem("playerId");
  if (!id) {
    id = crypto.randomUUID(); // Or any method you prefer
    localStorage.setItem("playerId", id);
  }
  return id;
}

export default function Lobby({
  onJoin,
}: {
  onJoin: (
    name: string,
    code: string,
    socket: Socket,
    playerId: string,
    isHost: boolean,
    players: PlayersDict
  ) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [playerId, setPlayerId] = useState("");

  useEffect(() => {
    const id = getOrCreatePlayerId();
    setPlayerId(id);
  }, []);

  const joinGame = () => {
    socket.emit(
      "join_game",
      { code, name, playerId },
      (response: JoinResponse) => {
        if (response.success) {
          onJoin(name, code, socket, playerId, false, response.players);
        } else {
          alert("Game not found!");
        }
      }
    );
  };

  const createGame = () => {
    socket.emit("create_game", { name, playerId }, (newCode: string, players: PlayersDict) => {
      setCode(newCode);
      onJoin(name, newCode, socket, playerId, true, players);
    });
  };

  if (!playerId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full max-w-11/12">
      <div className="bg-indigo-900 rounded-xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6 text-white">Join Trivia Game</h1>
        <input
          className="mb-3 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
        <input
          className="mb-4 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          placeholder="Game Code"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          value={code}
        />
        <button
          className="w-full bg-purple-600 text-white font-semibold py-2 rounded hover:bg-purple-700 transition mb-2"
          onClick={joinGame}
        >
          Join
        </button>
        <p className="my-2 text-gray-300">or</p>
        <h2 className="text-xl font-bold mb-4 text-white">Create New Game</h2>
        <input
          className="mb-3 w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
          value={name}
        />
        <button
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
          onClick={createGame}
        >
          Create
        </button>
      </div>
    </div>
  );
}
