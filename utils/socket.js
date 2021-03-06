"use strict";
const winningCombination = require('./winningCombination');

class Socket {
  constructor(socket, redisDB) {
    this.io = socket;
    this.redisDB = redisDB;

    this.winCombination = winningCombination;

    redisDB.set("totalRoomCount", 1);
    redisDB.set(
      "allRooms",
      JSON.stringify({
        emptyRooms: [1],
        fullRooms: [],
      })
    );
  }

  socketEvents() {
    const IO = this.io;
    const redisDB = this.redisDB;

    IO.on("connection", (socket) => {
      socket.setMaxListeners(20);

      socket.on("create-room", (data) => {
        Promise.all(
          ["totalRoomCount", "allRooms"].map((key) => redisDB.getAsync(key))
        ).then((values) => {
          const allRooms = JSON.parse(values[1]);
          let totalRoomCount = values[0];
          let fullRooms = allRooms["fullRooms"];
          let emptyRooms = allRooms["emptyRooms"];
          /*Checking the if the room is empty.*/
          let isIncludes = emptyRooms.includes(totalRoomCount);
          if (!isIncludes) {
            totalRoomCount++;
            emptyRooms.push(totalRoomCount);
            socket.join("room-" + totalRoomCount);
            redisDB.set("totalRoomCount", totalRoomCount);
            redisDB.set(
              "allRooms",
              JSON.stringify({
                emptyRooms: emptyRooms,
                fullRooms: fullRooms,
              })
            );

            IO.emit("rooms-available", {
              totalRoomCount: totalRoomCount,
              fullRooms: fullRooms,
              emptyRooms: emptyRooms,
            });

            IO.sockets.in("room-" + totalRoomCount).emit("new-room", {
              totalRoomCount: totalRoomCount,
              fullRooms: fullRooms,
              emptyRooms: emptyRooms,
              roomNumber: totalRoomCount,
            });
          }
        });
      });

      socket.on("join-room", (data) => {
        const roomNumber = data.roomNumber;
        Promise.all(
          ["totalRoomCount", "allRooms"].map((key) => redisDB.getAsync(key))
        ).then((values) => {
          const allRooms = JSON.parse(values[1]);
          let totalRoomCount = values[0];
          let fullRooms = allRooms["fullRooms"];
          let emptyRooms = allRooms["emptyRooms"];
          let indexPos = emptyRooms.indexOf(roomNumber);
          if (indexPos > -1) {
            emptyRooms.splice(indexPos, 1);
            fullRooms.push(roomNumber);
          }

          socket.join("room-" + roomNumber);
          redisDB.set(
            "allRooms",
            JSON.stringify({
              emptyRooms: emptyRooms,
              fullRooms: fullRooms,
            })
          );

          /* Getting the room number from socket */
          const currentRoom = Object.keys(IO.sockets.adapter.sids[socket.id])
            .filter((item) => item != socket.id)[0]
            .split("-")[1];
          IO.emit("rooms-available", {
            totalRoomCount: totalRoomCount,
            fullRooms: fullRooms,
            emptyRooms: emptyRooms,
          });
          IO.sockets.in("room-" + roomNumber).emit("start-game", {
            totalRoomCount: totalRoomCount,
            fullRooms: fullRooms,
            emptyRooms: emptyRooms,
            roomNumber: currentRoom,
          });
        });
      });

      socket.on("send-move", (data) => {
        const playedGameGrid = data.playedGameGrid;
        const movesPlayed = data.movesPlayed;
        const roomNumber = data.roomNumber;
        let winner = null;
        
        this.winCombination.forEach((singleCombination) => {
          if (
            playedGameGrid[singleCombination[0]] !== undefined &&
            playedGameGrid[singleCombination[0]] !== null &&
            playedGameGrid[singleCombination[1]] !== undefined &&
            playedGameGrid[singleCombination[1]] !== null &&
            playedGameGrid[singleCombination[2]] !== undefined &&
            playedGameGrid[singleCombination[2]] !== null &&
            playedGameGrid[singleCombination[0]]["player"] ===
              playedGameGrid[singleCombination[1]]["player"] &&
            playedGameGrid[singleCombination[1]]["player"] ===
              playedGameGrid[singleCombination[2]]["player"]
          ) {
            winner = playedGameGrid[singleCombination[0]]["player"] + " Wins !";
          } else if (movesPlayed === 9) {
            winner = "Game Draw";
          }
          return false;
        });
        if (winner === null) {
          socket.broadcast.to("room-" + roomNumber).emit("receive-move", {
            position: data.position,
            playedText: data.playedText,
            winner: null,
          });
        } else {
          IO.sockets.in("room-" + roomNumber).emit("receive-move", {
            position: data.position,
            playedText: data.playedText,
            winner: winner,
          });
        }
      });

      socket.on("disconnecting", () => {
        const rooms = Object.keys(socket.rooms);
        const roomNumber =
          rooms[1] !== undefined && rooms[1] !== null
            ? rooms[1].split("-")[1]
            : null;
        if (rooms !== null) {
          Promise.all(
            ["totalRoomCount", "allRooms"].map((key) => redisDB.getAsync(key))
          ).then((values) => {
            const allRooms = JSON.parse(values[1]);
            let totalRoomCount = values[0];
            let fullRooms = allRooms["fullRooms"];
            let emptyRooms = allRooms["emptyRooms"];

            let fullRoomsPos = fullRooms.indexOf(parseInt(roomNumber));
            if (fullRoomsPos > -1) {
              fullRooms.splice(fullRoomsPos, 1);
            }
            if (totalRoomCount > 1) {
              totalRoomCount--;
            } else {
              totalRoomCount = 1;
            }
            redisDB.set("totalRoomCount", totalRoomCount);
            redisDB.set(
              "allRooms",
              JSON.stringify({
                emptyRooms: emptyRooms,
                fullRooms: fullRooms,
              })
            );
            IO.sockets
              .in("room-" + roomNumber)
              .emit("room-disconnect", { id: socket.id });
          });
        }
      });
    });
  }

  socketConfig() {
    this.socketEvents();
  }
}

module.exports = Socket;
