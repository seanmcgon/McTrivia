import { useState } from 'react'
import Lobby from "./components/Lobby.tsx";
import Game from "./components/Game.tsx";

function App() {
  const [inGame, setInGame] = useState(false);

  return (
    <div className='App bg-indigo-950 min-h-screen text-white'>
      {inGame ? <Game /> : <Lobby onJoin={() => setInGame(true)} />}
    </div>
  );
}

export default App;
