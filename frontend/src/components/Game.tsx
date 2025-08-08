import { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import Question from "./Question";

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
  choice: string;
};

export type PlayersDict = Record<string, Player>;

export default function Game({
  name,
  code,
  socket,
  id,
  isHost,
  curPlayers,
}: GameArgs) {
  const [started, setStarted] = useState(false);
  const [players, setPlayers] = useState(curPlayers);
  const [host, setHost] = useState(isHost);

  const startGame = () => {
    socket.emit("start_game", { code });
  };

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

    const handleGameStart = () => {
      setStarted(true);
    };

    const handleGameRestart = () => {
      setStarted(false);
    };

    socket.on("player_joined", handlePlayerJoined);
    socket.on("player_left", handlePlayerLeft);
    socket.on("new_host", handleNewHost);
    socket.on("game_started", handleGameStart);
    socket.on("restart_game", handleGameRestart);

    // Clean up listeners when component unmounts or socket changes
    return () => {
      socket.off("player_joined", handlePlayerJoined);
      socket.off("player_left", handlePlayerLeft);
      socket.off("new_host", handleNewHost);
      socket.off("game_started", handleGameStart);
      socket.off("restart_game", handleGameRestart);
    };
  }, [socket, setPlayers, id]);

  return (
    <div>
      <h1>
        Welcome {name}!{host ? " (host)" : ""}
      </h1>
      <h2>Game code: {code}</h2>
      {started ? (
        <Question
          name={name}
          socket={socket}
          id={id}
          isHost={host}
          curPlayers={players}
          code={code}
        />
      ) : (
        <div>
          <h3>Players:</h3>
          <ul>
            {Object.values(players).map((player) => (
              <li key={player.socketId}>
                {player.name}{" "}
                {player.connected ? "(connected)" : "(disconnected)"}
              </li>
            ))}
          </ul>
          {host && <button onClick={startGame}>Start Game</button>}
        </div>
      )}
    </div>
  );
}
