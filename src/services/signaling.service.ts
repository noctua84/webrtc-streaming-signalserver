import { Server, Socket } from 'socket.io';
import {JoinRoomData, SignalingData} from "../types/signaling.types.js";

export class SignalingService {
    private rooms: Map<any, Set<string>>;

    constructor() {
        this.rooms = new Map();
    }

    handleConnection(io: Server, socket: Socket): void {
        console.log("User connected:", socket.id);

        socket.on('join-room', (data: string | JoinRoomData):any => {
            const roomId: string = typeof data === 'string' ? data : data.roomId;
            this.joinRoom(socket, roomId, io);
        })

        socket.on('offer', (data: SignalingData): void => {
            this.relayMessage(socket, 'offer', data)
        })

        socket.on('answer', (data: SignalingData) => {
            this.relayMessage(socket, 'answer', data);
        });

        socket.on('ice-candidate', (data: SignalingData) => {
            this.relayMessage(socket, 'ice-candidate', data);
        });

        socket.on('leave-room', (roomId: string) => {
            this.leaveRoom(socket, roomId);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket, io);
        });
    }

    private joinRoom(socket: Socket, roomId: string, io: Server): void {
        socket.join(roomId);

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
            userId: socket.id,
            roomId
        });

        // Track room membership
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)!.add(socket.id);

        console.log(`User ${socket.id} joined room ${roomId}`);
    }

    private leaveRoom(socket: Socket, roomId: string): void {
        socket.leave(roomId);

        // Remove from tracking
        const roomParticipants = this.rooms.get(roomId);
        if (roomParticipants) {
            roomParticipants.delete(socket.id);

            // Clean up empty rooms
            if (roomParticipants.size === 0) {
                this.rooms.delete(roomId);
            }
        }

        // Notify others
        socket.to(roomId).emit('user-left', {
            userId: socket.id,
            roomId
        });

        console.log(`User ${socket.id} left room ${roomId}`);
    }

    private relayMessage(socket: Socket, event: string, data: SignalingData): void {
        if (!data.target) {
            console.warn(`Missing target for ${event} message from ${socket.id}`);
            return;
        }

        socket.to(data.target).emit(event, {
            ...data,
            from: socket.id
        });
    }

    private handleDisconnect(socket: Socket, io: Server): void {
        console.log(`User disconnected: ${socket.id}`);

        // Clean up from all rooms
        this.rooms.forEach((participants, roomId) => {
            if (participants.has(socket.id)) {
                participants.delete(socket.id);

                // Notify others in the room
                socket.to(roomId).emit('user-left', {
                    userId: socket.id,
                    roomId
                });

                // Clean up empty rooms
                if (participants.size === 0) {
                    this.rooms.delete(roomId);
                }
            }
        });
    }

    // Utility methods for monitoring/debugging
    getRoomCount(): number {
        return this.rooms.size;
    }

    getRoomParticipants(roomId: string): string[] {
        const participants = this.rooms.get(roomId);
        return participants ? Array.from(participants) : [];
    }

    getAllRooms(): { [roomId: string]: string[] } {
        const result: { [roomId: string]: string[] } = {};
        this.rooms.forEach((participants, roomId) => {
            result[roomId] = Array.from(participants);
        });
        return result;
    }
}