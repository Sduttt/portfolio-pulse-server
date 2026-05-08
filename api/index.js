import { connectDB } from "../src/db/index.js";
import { app } from "../src/app.js";

await connectDB();

export default app;
