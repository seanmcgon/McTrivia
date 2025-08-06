import { useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

interface ApiResponse {
      success: boolean;
}

export default function Lobby({ onJoin }: {onJoin: () => void}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const joinGame = () => {
    socket.emit("join_game", { code, name }, (response: ApiResponse) => {
      if (response.success) {
        onJoin();
      } else {
        alert("Game not found!");
      }
    });
  };

  return (
    <div>
      <h1>Join Trivia Game</h1>
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <input placeholder="Game Code" onChange={(e) => setCode(e.target.value)} />
      <button onClick={joinGame}>Join</button>
    </div>
  );
}
