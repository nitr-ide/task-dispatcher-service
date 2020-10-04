const app = require("express")();
const amqp = require("amqplib/callback_api");
const mongoose = require("mongoose");
const Request = require("./request.model");
const xid = require("xid-js");
const cors = require("cors");

const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`dispatcher   |   ${req.method}, ${req.headers.language}`);
  next();
});

let amqpConf = {
  conn: null,
  chan: null,
  isMongoReady: false,
};

let queueNames = {
  cpp: "PROCESS_CPP",
  py: "PROCESS_PY",
};

app.post("/run", (req, res) => {
  if (
    amqpConf.conn === null ||
    amqpConf.chan === null ||
    amqpConf.isMongoReady
  ) {
    res.send("DECLINED. Please try again.");
    return;
  }

  console.log(req.body);

  if (!req.body.language) {
    res.send("DECLINED. 'language' missing in body. Valid values cpp/py");
    return;
  }

  const convertedBody = {
    id: xid.next().toString(),
    code: req.body.code,
    language: req.body.language,
  };

  let payload = Buffer.from(JSON.stringify(convertedBody));

  if (amqpConf.chan.sendToQueue(queueNames["cpp"], payload)) {
    console.log(
      `dispatcher   |   dispatched ${req.body.language} request to RabbitMQ.`
    );

    const dbUpdateBody = new Request(convertedBody);

    dbUpdateBody.save((err, doc) => {
      if (err) {
        res.send("FAILED");
        throw err;
      }

      console.log("dispatcher   |   Successfully added request to mongodb");

      res.send(doc);
    });
  } else {
    console.log(`dispatcher   |   failed to dispatched message to rabbitmq`);
    res.send("ERROR");
  }
});

amqp.connect("amqp://guest:guest@localhost:5672/", (err, connection) => {
  if (err) {
    throw err;
  }
  console.log("dispatcher   |   successfully connected to RabbitMQ:5672");
  amqpConf.conn = connection;

  connection.createChannel((err, ch) => {
    if (err) {
      throw err;
    }

    amqpConf.chan = ch;

    console.log("dispatcher   |   successfully created rabbitmq channel");

    Object.values(queueNames).forEach((queue) => {
      ch.assertQueue(
        queue,
        {
          durable: false,
        },
        (err, ok) => {
          if (err) {
            throw err;
          }

          console.log("dispatcher   |   created queue", ok);
        }
      );
    });
  });
});

mongoose
  .connect("mongodb://localhost:27017/ide", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("dispatcher   |   successfully connected to mongodb!");
  })
  .catch((err) => {
    throw err;
  });

app.listen("5000", () => {
  console.log("dispatcher   |   listening on port 5000");
});
