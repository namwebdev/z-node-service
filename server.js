const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 9000;

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

const server = app.listen(
  PORT,
  console.info(`Server is running on port ${PORT}`)
);

//socket
const io = require("socket.io")(server, {
  pingTimeOut: 10000,
  cors: {
    origin: process.env.FRONT_END_URL,
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (user_id) => {
    console.info(`${user_id}` + " joined");
  });

  app.post("/api/notification", (req, res) => {
    const { message } = req.body;
    setTimeout(() => {
      io.emit("noti", { message });
    }, 1000);
    res.send(200).json({ message: "ok" });
  });
});
