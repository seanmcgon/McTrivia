import { useState } from 'react'
import Lobby from "./components/Lobby.tsx";
import Game from "./components/Game.tsx";
import type { Socket } from 'socket.io-client';
import type { PlayersDict } from './components/Game.tsx';

function App() {
  const [inGame, setInGame] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [id, setId] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayersDict | null>(null);

  function onJoin(newName: string, newCode: string, gameSocket: Socket, playerId: string, isHost: boolean, players: PlayersDict) {
    setName(newName);
    setCode(newCode);
    setSocket(gameSocket);
    setId(playerId);
    setIsHost(isHost);
    setInGame(true);
    setPlayers(players)
  };

  return (
    <div className='App bg-indigo-950 min-h-screen text-white'>
      {inGame && socket && players
        ? <Game name={name} code={code} socket={socket} id={id} isHost={isHost} curPlayers={players}/>
        : <Lobby onJoin={onJoin} />}
    </div>
  );
}

export default App;
