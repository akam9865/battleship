var http = require("http"),
  nodeStatic = require("node-static");
  gameServer = require("./game_server")

var file = new nodeStatic.Server("./public");

var server = http.createServer(function (req, res) {
  req.addListener('end', function () {
    file.serve(req, res);
  }).resume();
});


gameServer.createGameServer(server);
server.listen(process.env.PORT || 8000);

// watchify public/javascripts/battleship.js public/javascripts/battleshipUI.js public/javascripts/ship.js public/javascripts/game_states.js -o public/javascripts/bundle.js