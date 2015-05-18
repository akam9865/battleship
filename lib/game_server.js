var waitingUsers = [];
var rooms = {};
var io;


function createGameServer (server) {
  io = require('socket.io')(server);

  console.log('game server')
  io.on('connection', function (socket) {

    console.log('user connected')

    waitingUsers.push(socket);

    console.log(waitingUsers.length)

		socket.emit("CHANGE_STATE", {state: "WAITING_FOR_OPPONENT"});
		
    if (waitingUsers.length >= 2) {
      createGame(waitingUsers.splice(0, 2));
    }


    socket.on("MESSAGE", function (data) {
      console.log(data.message)
      io.to(rooms[data.id]).emit("MESSAGE", data);
    })
  })

}

function createGame (users) {
  var game = {
    name: 'game ' + users[0].id,
    players: users
  }

  var waitingForShips = users;
  console.log('created game');

  users.forEach(function (user) {
    joinRoom(user, game.name);
    user.emit('CHANGE_STATE', {state: "PLACE_SHIPS"});

    user.on('SHIPS_PLACED', function() {
      console.log("ships have been placed");
      waitingForShips.splice(waitingForShips.indexOf(user),1);
      if (waitingForShips.length === 1) {
        user.emit('CHANGE_STATE', {state: 'WAITING_FOR_OPPONENT_SHIPS'});
      } else (
        user.emit('CHANGE_STATE', {state: 'SHOOT'})
      )
    })


    var shootAt;
    var shooter;
    if (game.players[0] === user) {
      shooter = 1
      shootAt = game.players[1];
    } else {
      shooter = 2
      shootAt = game.players[0];
    }

    user.on('SHOT', function (data) {
      console.log('shot fired');

      shootAt.emit('SHOT', data);
      shootAt.emit('CHANGE_STATE', {state: 'SHOOT'});

      user.emit('CHANGE_STATE', {state: 'WAITING_TO_SHOOT'});
    })

    user.on('HIT', function (data) {
      data['response'] = 'hit';
      console.log("hit at: " + data);
      shootAt.emit('RESPONSE', data);
    })

    user.on('MISS', function (data) {
      data['response'] = 'miss';
      console.log("miss at: " + data);
      shootAt.emit('RESPONSE', data);
    })

    user.on('GAME_OVER', function(){
      console.log("hey game is over");
      shootAt.emit('CHANGE_STATE', {state: 'WINNER'});
      user.emit('CHANGE_STATE', {state:'LOSER'});
    });

  });
};

function joinRoom (socket, room) {
  var oldRoom = rooms[socket.id];
  socket.leave(oldRoom);
  socket.join(room);

  rooms[socket.id] = room;
}


exports.createGameServer = createGameServer;
