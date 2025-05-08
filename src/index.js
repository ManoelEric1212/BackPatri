const express = require("express");
const app = express();
app.use(express.json());

const conferenciasRoute = require("./routes/conferencias");
app.use("/conferencias", conferenciasRoute);

app.listen(3000, () => console.log("API rodando na porta 3000"));
