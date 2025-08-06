import { useState } from "react";
import { io, Socket } from "socket.io-client";

const socket = io("http://localhost:3001");

interface ApiResponse {
      success: boolean;
}

export default function Lobby({ onJoin }: {onJoin: (name: string, code: string, socket: Socket) => void}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const joinGame = () => {
    socket.emit("join_game", { code, name }, (response: ApiResponse) => {
      if (response.success) {
        onJoin(name, code, socket);
      } else {
        alert("Game not found!");
      }
    });
  };

  const createGame = () => {
    socket.emit("create_game", {name}, (newCode: string) => {
      setCode(newCode);
      onJoin(name, newCode, socket);
    })
  };

  return (
    <div>
      <h1>Join Trivia Game</h1>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input placeholder="Game Code" onChange={(e) => setCode(e.target.value.toUpperCase())} />
      <button onClick={joinGame}>Join</button>
      <p>or</p>
      <h1>Create New Game</h1>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <button onClick={createGame}>Create</button>
    </div>
  );
}
