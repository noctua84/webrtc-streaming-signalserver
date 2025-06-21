import express, {Express} from "express";

const server: Express = express();


server.listen(8080, () => {
    console.log("Server is running on http://localhost:8080");
});