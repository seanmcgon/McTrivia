import type { PlayersDict } from "./Game";

type LeaderboardArgs = {
  players: PlayersDict;
  close: () => void;
};

export default function Leaderboard({ players, close }: LeaderboardArgs) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000]"
      onClick={close}
    >
      <div
        className="
          fixed top-1/2 left-1/2 
          transform -translate-x-1/2 -translate-y-1/2
          bg-indigo-600 rounded-lg p-6
          shadow-lg
          max-w-[90vw] max-h-[80vh]
          overflow-y-auto
          z-[1001]
        "
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
        <ul>
          {Object.values(players).map((player) => (
            <li key={player.socketId}>
              {player.name}{" "}
              {player.connected ? "(connected)" : "(disconnected)"} - Score:{" "}
              {player.score}
            </li>
          ))}
        </ul>
        <button
          className="mt-4 px-4 py-2 bg-indigo-700 text-white rounded hover:bg-blue-700 transition"
          onClick={close}
        >
          Close
        </button>
      </div>
    </div>
  );
}
