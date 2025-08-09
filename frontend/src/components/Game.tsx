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
    <div className="flex items-center justify-center w-full max-w-11/12">
      <div className="bg-indigo-900 rounded-xl shadow-lg p-4 pb-2 w-full max-w-3xl flex flex-col items-center relative">
        <h1 className="text-2xl font-bold mb-1 text-blue-300">
          {name}
          {host ? " (host)" : ""}
        </h1>
        <h2 className="text-md font-semibold text-green-400 absolute top-4 right-6">{code}</h2>
        {started ? (
          <Question
            socket={socket}
            id={id}
            isHost={host}
            curPlayers={players}
            code={code}
          />
        ) : (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-md font-bold mb-2 text-gray-100">Players:</h3>
            <ul className="mb-4">
              {Object.values(players).map((player) => (
                <li
                  key={player.socketId}
                  className={`py-1 px-2 rounded transition font-medium inline-block mx-1 mb-2 ${
                    player.connected
                      ? "text-blue-600 bg-purple-100"
                      : "text-gray-400 bg-gray-100"
                  }`}
                >
                  {player.name} {player.connected ? "" : "(disconnected)"}
                </li>
              ))}
            </ul>
            {host && (
              <button
                className="w-1/2 bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
