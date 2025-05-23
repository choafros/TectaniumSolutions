import { VercelRequest, VercelResponse } from "@vercel/node";
import app from "./routes"; // Import the Express app directly

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    app(req, res); // Pass the request and response to the Express app
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}