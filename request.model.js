const mongoose = require("mongoose");

// type Request struct {
// 	ID          string    `json:"id"`
// 	Code        string    `json:"code"`
// 	Language    string    `json:"language"`
// 	Filename    string    `json:"-"`
// 	Outfile     string    `json:"-"`
// 	Output      string    `json:"output"`
// 	StartedAt   time.Time `json:"startedAt"`
// 	CompletedAt time.Time `json:"completedAt"`
// }

const schema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  output: {
    type: String,
    default: "",
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  status: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("request", schema);
