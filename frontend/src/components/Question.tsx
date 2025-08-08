import { Socket } from "socket.io-client";
import { useState, useEffect, useCallback } from "react";
import type { PlayersDict } from "./Game";

type QuestionArgs = {
  name: string;
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
  name,
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

  const getNextQ = useCallback(() => {
    socket.emit("next_question", { code });
  }, [code, socket]);

  useEffect(() => {
    getNextQ();
  }, [getNextQ]);

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
        ans.text === choice.text ? { ...ans, chosen: true } : ans
      )
    );

    socket.emit("submit_answer", {
      code,
      id,
      correct: choice.isCorrect,
      choice: choice.text,
    });
  };

  if (!question) {
    return <div>Loading...</div>; // Avoid rendering until we have the question
  }

  return (
    <div>
      <h1>{name}</h1>
      <h1>{question}</h1>
      {shuffledAnswers.map((answer, idx) => {
        // --- Determine styling ---
        let className = "bg-gray-800"; // default
        if (!showAnswers) {
          if (answer.chosen) {
            className = "bg-yellow-300 font-bold";
          }
        } else {
          if (answer.isCorrect) {
            className = "bg-green-300 font-bold";
          } else if (answer.chosen) {
            className = "bg-red-300 font-bold";
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
            disabled={showAnswers} // optional: lock after showing answers
            className={`relative border rounded p-2 ${className}`}
          >
            {answer.text}

            {showAnswers && playerInitials.length > 0 && (
              <div className="absolute top-1 right-1 flex -space-x-1">
                {playerInitials.map((initial, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full bg-white text-xs flex items-center justify-center text-blue-700"
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
  );
}
