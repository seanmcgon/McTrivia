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
      //TODO: change the callback to provide the full list of players as well, and pass that to onjoin
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
    return <div>Loading...</div>; // Avoid rendering the app until we have the ID
  }

  return (
    <div>
      <h1>Join Trivia Game</h1>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input
        placeholder="Game Code"
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button onClick={joinGame}>Join</button>
      <p>or</p>
      <h1>Create New Game</h1>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <button onClick={createGame}>Create</button>
    </div>
  );
}
