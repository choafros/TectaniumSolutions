// server/index.ts

import http from "http";
import { app } from "./api/routes";   // your Express app
// (no more vite.ts imports)

const port = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server is running in ${app.get("env")} mode on port ${port}`);
});
