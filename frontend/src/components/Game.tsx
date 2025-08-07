import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";

type GameArgs = {
  name: string;
  code: string;
  socket: Socket;
  id: string;
  isHost: boolean;
  curPlayers: PlayersDict;
};

export type Player = {
  name: string;
  score: number;
  connected: boolean;
  socketId: string;
};

export type PlayersDict = Record<string, Player>;

export default function Game({ name, code, socket, id, isHost, curPlayers }: GameArgs) {
  const [started, setStarted] = useState(false);
  const [players, setPlayers] = useState(curPlayers);
  const [host, setHost] = useState(isHost);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerJoined = (newPlayers: PlayersDict) => {
      setPlayers(newPlayers);
    };

    const handlePlayerLeft = (newPlayers: PlayersDict) => {
      setPlayers(newPlayers);
    };

    const handleNewHost = (hostId: string) => {
      if (hostId === id) {
        setHost(true);
      }
    };

    socket.on("player_joined", handlePlayerJoined);
    socket.on("player_left", handlePlayerLeft);
    socket.on("new_host", handleNewHost);

    // Clean up listeners when component unmounts or socket changes
    return () => {
      socket.off("player_joined", handlePlayerJoined);
      socket.off("player_left", handlePlayerLeft);
      socket.off("new_host", handleNewHost);
    };
  }, [socket, setPlayers, id]);

  return (
    <div>
      <h1>Welcome {name}!{host ? " (host)" : ""}</h1>
      <h2>Game code: {code}</h2>
      <h3>Players:</h3>
      <ul>
        {Object.values(players).map((player) => (
          <li key={player.socketId}>
            {player.name} {player.connected ? "(connected)" : "(disconnected)"} - Score: {player.score}
          </li>
        ))}
      </ul>
    </div>
  );
}
