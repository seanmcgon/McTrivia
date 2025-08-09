import { Socket } from "socket.io-client";
import { useState, useEffect, useCallback } from "react";
import Leaderboard from "./Leaderboard";
import type { PlayersDict } from "./Game";

type QuestionArgs = {
  socket: Socket;
  id: string;
  isHost: boolean;
  curPlayers: PlayersDict;
  code: string;
};

type Q = {
  qText: string;
  correctA: string;
  otherAs: string[];
};

type Choice = {
  text: string;
  isCorrect: boolean;
  chosen: boolean;
};

const shuffleArray = (array: Choice[]) => {
  return [...array].sort(() => Math.random() - 0.5);
};

export default function Question({
  socket,
  id,
  isHost,
  curPlayers,
  code,
}: QuestionArgs) {
  const [question, setQuestion] = useState("");
  const [correctAns, setCorrectAns] = useState("");
  const [otherAns, setOtherAns] = useState<string[]>([]);
  const [shuffledAnswers, setShuffledAnswers] = useState<Choice[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [players, setPlayers] = useState(curPlayers);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const getNextQ = useCallback(() => {
    if (isHost) {
      socket.emit("next_question", { code });
    }
  }, [code, socket, isHost]);

  useEffect(() => {
    if (isHost) {
      getNextQ();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← runs once on mount

  useEffect(() => {
    setPlayers(curPlayers);
  }, [curPlayers]);

  useEffect(() => {
    // Combine correct + incorrect with metadata
    const allAnswers = [
      { text: correctAns, isCorrect: true, chosen: false },
      ...otherAns.map((text) => ({ text, isCorrect: false, chosen: false })),
    ];

    // Shuffle and store
    setShuffledAnswers(shuffleArray(allAnswers));
  }, [correctAns, otherAns]); // runs on new question

  useEffect(() => {
    if (!socket) return;

    const handleNewQuestion = (newQuestion: Q) => {
      setShowLeaderboard(false);
      setShowAnswers(false);
      setQuestion(newQuestion.qText);
      setCorrectAns(newQuestion.correctA);
      setOtherAns(newQuestion.otherAs);
    };

    const handleShowAnswers = (updatedPlayers: PlayersDict) => {
      setPlayers(updatedPlayers);
      setShowAnswers(true);
    };

    socket.on("question_served", handleNewQuestion);
    socket.on("reveal_answers", handleShowAnswers);

    return () => {
      socket.off("question_served", handleNewQuestion);
      socket.off("reveal_answers", handleShowAnswers);
    };
  }, [socket]);

  const handleClick = (choice: Choice) => {
    setShuffledAnswers((prev) =>
      prev.map((ans) =>
        ans.text === choice.text ? { ...ans, chosen: true } : { ...ans, chosen: false }
      )
    );

    socket.emit("submit_answer", {
      code,
      id,
      correct: choice.isCorrect,
      choice: choice.text,
    });
  };

  const nextClick = () => {
    setQuestion("");
    setCorrectAns("");
    setOtherAns([]);
    setShuffledAnswers([]);
    setShowAnswers(false);
    getNextQ();
  };

  if (!question) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="pb-0 sm:p-8 pt-4 sm:pb-4 w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-white text-center break-words">{question}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-6 w-full">
          {shuffledAnswers.map((answer, idx) => {
            // --- Determine styling ---
            let className = "bg-gray-800 text-white hover:bg-gray-700"; // default
            if (!showAnswers) {
              if (answer.chosen) {
                className = "bg-yellow-200 text-gray-900 font-bold";
              }
            } else {
              if (answer.isCorrect) {
                className = "bg-green-300 text-gray-900 font-bold";
              } else if (answer.chosen) {
                className = "bg-red-300 text-gray-900 font-bold";
              }
            }

            // --- Get initials for players who chose this answer ---
            const playerInitials = Object.values(players)
              .filter((p) => p.choice === answer.text)
              .map((p) => p.name.charAt(0).toUpperCase());

            return (
              <button
                key={idx}
                onClick={() => handleClick(answer)}
                disabled={showAnswers}
                className={`relative border-2 border-gray-300 rounded-xl p-6 w-full h-5/12 sm:h-36 flex items-center justify-center text-lg sm:text-xl transition-all duration-200 shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 ${className}`}
              >
                <span className="break-words text-center w-full">{answer.text}</span>

                {showAnswers && playerInitials.length > 0 && (
                  <div className="absolute top-2 right-2 flex -space-x-1">
                    {playerInitials.map((initial, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full bg-white text-sm font-bold flex items-center justify-center text-blue-700 border border-blue-300 shadow"
                      >
                        {initial}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {showAnswers && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full justify-center sm:mt-4">
            {isHost && (
              <button
                className="bg-blue-600 text-white font-semibold py-2 px-6 rounded hover:bg-blue-700 transition w-full sm:w-auto"
                onClick={nextClick}
              >
                Next Question
              </button>
            )}
            <button
              className="bg-purple-600 text-white font-semibold py-2 px-6 rounded hover:bg-purple-700 transition w-full sm:w-auto"
              onClick={() => setShowLeaderboard(true)}
            >
              Leaderboard
            </button>
          </div>
        )}
        {showLeaderboard && (
          <Leaderboard
            players={players}
            close={() => setShowLeaderboard(false)}
          />
        )}
      </div>
    </div>
  );
}
