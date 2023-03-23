const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server);
const cors = require('cors');
require('dotenv').config()

app.use(cors({
    origin: '*'
}));

const userSocketMap = {};

function getAllConnectedClients(gameId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(gameId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {

    

    socket.on("join", ({ gameId, username }) => {
        userSocketMap[socket.id] = username;
        
        var room = io.sockets.adapter.rooms.get(gameId)

        if(!room){
            socket.emit('status' , 1 );
            socket.join(gameId)
        }
        if(room){
            if(room.size<2){
                socket.join(gameId)
                socket.emit('status' , 2 );

            }else{
                socket.emit('status' , 3 );
            }
        }


        const clients = getAllConnectedClients(gameId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit("joined", {
                clients,
                username,
                socketId: socket.id,
            });
        });

        io.in(gameId).emit("all", clients)

    });

    socket.on("leave_room",(gameId)=>{
        const clients = getAllConnectedClients(gameId);
        socket.leave(gameId);
        io.to(gameId).emit("leaving_guys", {
            clients,
        });

    })


    socket.on("new move" , (fen,gameId,sourceSquare, targetSquare)=>{
        // socket.to(gameId).emit("receiving move", fen);
        io.in(gameId).emit("receiving move", fen,sourceSquare, targetSquare)
    })

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit("dis_connect", {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });


});


app.get("/xxx",(req,res)=>{
    res.send("working")
})

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
