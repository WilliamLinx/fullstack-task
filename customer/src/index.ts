import "dotenv/config";
import express from "express";

import taskRouter from "./routes/task";
import { connectToRabbitMQ } from "./utils/rabbitMQ";

const app = express();

// Register middleware
app.use(express.json());
// Register routes
app.use("/task", taskRouter);

// Start listing for incoming requests on the specified port after connected to RabbitMQ
const port = process.env.SERVER_PORT || 3000;
connectToRabbitMQ().then(() => app.listen(port, () => console.log(`Server is running on port ${port}`)));
