import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { useMediaQuery } from "react-responsive";
import { getSocketInstance } from "../socket";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { ImClipboard } from "react-icons/im";
import { GiFlyingFlag } from "react-icons/gi";

function GamePage() {
  const v6 = useMediaQuery({ query: "(max-width: 1224px)" });
  const v5 = useMediaQuery({ query: "(max-width: 1156px)" });
  const v4 = useMediaQuery({ query: "(max-width: 466px)" });
  const v3 = useMediaQuery({ query: "(max-width: 436px)" });
  const v2 = useMediaQuery({ query: "(max-width: 416px)" });
  const v1 = useMediaQuery({ query: "(max-width: 406px)" });
  const v7 = useMediaQuery({ query: "(max-width: 392px)" });
  const v8 = useMediaQuery({ query: "(max-width: 373px)" });
  const v9 = useMediaQuery({ query: "(max-width: 355px)" });

  const location = useLocation();
  let { color, clients, mySocketID, isCalling } = location.state;
  const { gameId } = useParams();
  const socketRef = useRef();
  const [fen, setFen] = useState("start");
  const [people, setPeople] = useState();
  const game = useRef(null);
  const [showNewgame, setShowNewGame] = useState(false);
  const localStream = useRef(null);
  const RemoteStream = useRef(null);
  const peerInstance = useRef(null);
  const captureAudioRef = useRef(null);
  const moveAudioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function xyz() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStream.current.srcObject = stream;
      localStream.current.play();
    }
    xyz();
  }, []);
  useEffect(() => {
    const peer = new Peer(mySocketID, {
      host: "handsome-colt-loincloth.cyclic.app",
      path: "/call",
      secure: true,
      port: 9000,
      config: {
        iceServers: [
          {
            urls: "stun:relay.metered.ca:80",
          },
          {
            urls: "turn:relay.metered.ca:80",
            username: "4935b824b9944fa19ccfee14",
            credential: "O7e3DvmO44qGTk6k",
          },
          {
            urls: "turn:relay.metered.ca:443",
            username: "4935b824b9944fa19ccfee14",
            credential: "O7e3DvmO44qGTk6k",
          },
          {
            urls: "turn:relay.metered.ca:443?transport=tcp",
            username: "4935b824b9944fa19ccfee14",
            credential: "O7e3DvmO44qGTk6k",
          },
        ],
      },
    });

    peer.on("call", (call) => {
      call.answer(localStream.current.srcObject);
      call.on("stream", (remoteStream) => {
        RemoteStream.current.srcObject = remoteStream;
        RemoteStream.current.addEventListener("loadedmetadata", () => {
          RemoteStream.current.play();
        });
      });
    });
    peer.on("error", (error) =>{
      console.log('er',error);
    } );



    peerInstance.current = peer;
  }, [mySocketID]);

  useEffect(() => {
    if (isCalling) {
      if (clients && clients.length === 2) {
        var anotherClient = clients.filter((client) => {
          return client.socketId !== mySocketID;
        });

        const getUserMedia =
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia;

        getUserMedia({ video: true, audio: true }, (mediaStream) => {
          const call = peerInstance.current.call(
            anotherClient[0].socketId,
            mediaStream
          );
          call.on("stream", (remoteStream) => {
            RemoteStream.current.srcObject = remoteStream;
            RemoteStream.current.addEventListener("loadedmetadata", () => {
              RemoteStream.current.play();
            });
          });
        });
      }
    }
  }, [clients]);

  useEffect(() => {
    game.current = new Chess();
  }, []);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await getSocketInstance();

      socketRef.current.on(
        "receiving move",
        (fen, sourceSquare, targetSquare) => {
          setFen(fen);
          game.current.move({
            from: sourceSquare,
            to: targetSquare,
          });
        }
      );

      socketRef.current.on("all", (clients) => {
        setPeople(clients);
      });

      socketRef.current.on("leaving_guys", (clients) => {
        toast.success("Other player Resigned");
        setPeople(clients);
        setShowNewGame(true);
      });
    };
    init();
  }, []);

  const resign = () => {
    socketRef.current.emit("leave_room", gameId);
    window.location.href = "https://chess-game-green.vercel.app";
  };

  const newGame = () => {
    window.location.href = "https://chess-game-green.vercel.app";
  };

  const onDrop = (sourceSquare, targetSquare) => {
    let move = game.current.move({
      from: sourceSquare,
      to: targetSquare,
    });
    if (move === null) return;
    setFen(game.current.fen());
    socketRef.current.emit(
      "new move",
      game.current.fen(),
      gameId,
      sourceSquare,
      targetSquare
    );

    if (move) {
      if (move.flags.includes("c")) {
        captureAudioRef.current.play();
      } else {
        moveAudioRef.current.play();
      }
    }
  };

  const resetGame = () => {
    game.current.clear();
    game.current.reset();
    setFen("start");
  };

  async function copyGameId() {
    try {
      await navigator.clipboard.writeText(gameId);
      toast.success("Game ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Game ID");
      console.error(err);
    }
  }

  return (
    <div className="App">
      <div className="img">
        <img
          src="/images/logo.png"
          alt=""
          onClick={() => {
            navigate("/");
          }}
        />
      </div>
      <div className="clipboard">
        <div className="div">
          <span>{gameId}</span>
          <button onClick={copyGameId}>
            {" "}
            <ImClipboard size={16} /> Copy to Clip-board
          </button>
          {(people && people.length && people.length === 2) ||
          (clients && clients.length && clients.length === 2) ? (
            <button
              className="resign"
              style={{ display: `${showNewgame && "none"}` }}
              onClick={resign}
            >
              {" "}
              <GiFlyingFlag size={16} /> Resign
            </button>
          ) : (
            ""
          )}
          {showNewgame && (
            <button className="new_game" onClick={newGame}>
              {" "}
              <GiFlyingFlag size={16} />
              new Game
            </button>
          )}
        </div>
      </div>
      <div className="constainer">
        <div className="left">
          <Chessboard
            boardWidth={
              v9
                ? 270
                : v8
                ? 290
                : v7
                ? 310
                : v6
                ? 330
                : v5
                ? 340
                : v4
                ? 350
                : v3
                ? 370
                : v2
                ? 400
                : v1
                ? 500
                : 550
            }
            position={fen}
            boardOrientation={color ? "white" : "black"}
            onPieceDrop={onDrop}
            customBoardStyle={{ boxShadow: "0 5px 15px rgba(0, 0, 0, 0.5 " }}
          />
          {game.current && game.current.game_over() ? (
            <div className="game_over">
              <div className="incenter">
                <h1>Game Over</h1>
                <button onClick={resetGame}>Play Again</button>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="right">
          <div className="wrapper">
            <div className="persons">
              <video autoPlay id="me" muted ref={localStream}></video>
            </div>
            <div className="persons">
              <video autoPlay id="him" controls ref={RemoteStream}></video>
            </div>
          </div>
        </div>
      </div>
      <audio
        ref={captureAudioRef}
        src="/capture.mp3"
        style={{ visibility: "hidden" }}
      />
      <audio
        ref={moveAudioRef}
        src="/move-self.mp3"
        style={{ visibility: "hidden" }}
      />
    </div>
  );
}

export default GamePage;
