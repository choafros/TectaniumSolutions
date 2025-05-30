import { VercelRequest, VercelResponse } from "@vercel/node";
import { app } from "./routes"; // Correctly import the 'app' (Express instance)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // The Express app instance will handle the request
    app(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}