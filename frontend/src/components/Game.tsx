import { useState } from "react";
import { Socket } from "socket.io-client";

type GameArgs = {
  name: string;
  code: string;
  socket: Socket;
};

export default function Game({ name, code, socket }: GameArgs) {

  return (
    <div>
        <h1>Welcome {name}!</h1>
        <h2>Game code: {code}</h2>
    </div>
  );
}
