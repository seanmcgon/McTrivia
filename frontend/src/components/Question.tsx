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
  const [numAnswered, setNumAnswered] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<Choice[]>([]);

  const getNextQ = useCallback(() => {
    socket.emit("next_question", { code });
  }, [code, socket]);

  useEffect(() => {
    getNextQ();
  }, [getNextQ]);

  useEffect(() => {
    // Combine correct + incorrect with metadata
    const allAnswers = [
      { text: correctAns, isCorrect: true },
      ...otherAns.map((text) => ({ text, isCorrect: false })),
    ];

    // Shuffle and store
    setShuffledAnswers(shuffleArray(allAnswers));
  }, [correctAns, otherAns]); // runs on new question

  useEffect(() => {
    if (!socket) return;

    const handleNewQuestion = (newQuestion: Q) => {
      setQuestion(newQuestion.qText);
      setCorrectAns(newQuestion.correctA);
      setOtherAns(newQuestion.otherAs);
    };

    socket.on("question_served", handleNewQuestion);

    return () => {
      socket.off("question_served", handleNewQuestion);
    };
  }, [socket]);

  const handleClick = (isCorrect: boolean) => {
    if (isCorrect) {
      alert("Correct!");
    } else {
      alert("Wrong answer!");
    }
  };

  if (!question) {
    return <div>Loading...</div>; // Avoid rendering until we have the question
  }

  return (
    <div>
      <h1>{question}</h1>
      {shuffledAnswers.map((answer, idx) => (
        <button key={idx} onClick={() => handleClick(answer.isCorrect)}>
          {answer.text}
        </button>
      ))}
    </div>
  );
}
