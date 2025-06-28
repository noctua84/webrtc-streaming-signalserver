import express, {Express, Request, Response} from "express";
import { config } from "./config.js";
import helmet from "helmet";
import cors from "cors";
import {createServer} from "http";
import {Server} from "socket.io";
import {SignalingService} from "./services/signaling.service.js";

const app: Express = express();

const cfg = config

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Required for WebRTC
}))

// CORS configuration
app.use(cors({
    origin: cfg.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: cfg.CORS_ORIGIN.split(','),
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: cfg.SOCKET_TIMEOUT,
    pingInterval: cfg.SOCKET_TIMEOUT / 2,
})

const signalingService = new SignalingService();

app.get('/health', async (req: Request, res: Response) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: cfg.NODE_ENV,
    });
})

app.get('/metrics', async (req: Request, res: Response) => {
    const roomIds = signalingService.getAllRooms()
    let participantCount = 0;

    for (const roomId of Object.keys(roomIds)) {
        participantCount += signalingService.getRoomParticipants(roomId).length;
    }

    res.json({
        success: true,
        metrics: {
            rooms: signalingService.getRoomCount(),
            participants: participantCount,
        },
    });
})

// Socket.IO connection handling
io.on('connection', (socket) => {
    signalingService.handleConnection(io, socket);
});

server.listen(cfg.PORT, () => {
    console.log("Server is running on http://localhost:" + cfg.PORT);
});