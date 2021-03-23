"use strict";
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

const socketEvents = require("./utils/socket");
const routes = require("./utils/routes");
const redisDB = require("./utils/db").connectDB();

class Server {
  constructor() {
    this.port = 4000;
    this.host = "localhost";

    this.app = express();
    this.http = http.Server(this.app);
    this.socket = socketio(this.http);
  }

  appConfig() {
    this.app.use(bodyParser.json());
    this.app.use(cors());
  }

  appExecute() {
    this.appConfig();

    new routes(this.app, redisDB).routesConfig();
    new socketEvents(this.socket, redisDB).socketConfig();

    this.http.listen(this.port, this.host, () => {
      console.log(`Listening on http://${this.host}:${this.port}`);
    });
  }
}

const app = new Server();
app.appExecute();
