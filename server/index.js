const express = require("express");
const app = express();
require("dotenv").config();

const routes = require("./routes/routes");
const cookieParser = require("cookie-parser");

const database = require("./config/database");
const cors = require("cors");

const PORT = process.env.PORT || 4000;

// connect to db
database.connectToDB();

app.use(express.json());
app.use(cookieParser());

console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN); // Debug log
app.use(
  cors({
    origin: '*', // Temporarily allow all origins for debugging
    credentials: true,
    maxAge: 14400,
  })
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Your server is up and running...",
  });
});

app.use("/api/v1/", routes);

// activate server
app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
