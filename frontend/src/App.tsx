import { useState } from 'react'
import Lobby from "./components/Lobby.tsx";
import Game from "./components/Game.tsx";
import type { Socket } from 'socket.io-client';

function App() {
  const [inGame, setInGame] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);

  function onJoin(newName: string, newCode: string, gameSocket: Socket) {
    setName(newName);
    setCode(newCode);
    setSocket(gameSocket);
    setInGame(true);
  };

  return (
    <div className='App bg-indigo-950 min-h-screen text-white'>
      {inGame && socket ? <Game name={name} code={code} socket={socket}/> : <Lobby onJoin={onJoin} />}
    </div>
  );
}

export default App;
