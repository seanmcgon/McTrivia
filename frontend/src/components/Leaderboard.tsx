import type { PlayersDict } from "./Game";

type LeaderboardArgs = {
  players: PlayersDict;
  close: () => void;
};

export default function Leaderboard({ players, close }: LeaderboardArgs) {
  // Find max score for scaling bars
  const scores = Object.values(players).map((p) => p.score);
  const maxScore = Math.max(...scores, 1);

  // Color palette for bars
  const barColors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[1000] flex items-center justify-center"
      onClick={close}
    >
      <div
        className="bg-gray-200 rounded-lg p-8 pt-4 shadow-lg max-w-[90vw] w-full sm:max-w-xl max-h-[80vh] overflow-y-auto z-[1001]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">Leaderboard</h2>
        <div className="space-y-4">
          {Object.values(players)
            .sort((a, b) => b.score - a.score)
            .map((player, idx) => {
              const percent = Math.round((player.score / maxScore) * 100);
              const color = player.connected ? barColors[idx % barColors.length] : "bg-gray-400";
              const nameColor = player.connected ? "text-gray-900 font-semibold" : "text-gray-400 font-semibold";
              return (
                <div key={player.socketId} className="flex flex-col sm:flex-row items-center gap-0 w-full">
                  <span className={`w-full sm:w-32 truncate ${nameColor}`}>{player.name}</span>
                  <div className="flex-1 w-full">
                    <div className={`h-8 rounded transition-all duration-300 flex items-center pl-3 ${color}`} style={{ width: `${percent}%`, minWidth: '2rem' }}>
                      <span className={`text-white text-sm font-bold drop-shadow`}>{player.score}</span>
                    </div>
                  </div>
                  {!player.connected && (
                    <span className="ml-2 text-xs text-gray-400">(disconnected)</span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
