// Starts the website. Hostinger (and most Node hosts) set PORT for you.
require("dotenv").config();
const { createApp } = require("./src/app");

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => {
  console.log(`Freestyle Packing is running on http://localhost:${port}`);
});
