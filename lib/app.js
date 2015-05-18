var http = require("http"),
  static = require("node-static");
  gameServer = require("./game_server")

var file = new static.Server("./public");

var server = http.createServer(function (req, res) {
  req.addListener('end', function () {
    file.serve(req, res);
  }).resume();
});


gameServer.createGameServer(server);
server.listen(process.env.PORT || 8000);