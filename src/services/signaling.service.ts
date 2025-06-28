import { Server, Socket } from 'socket.io';
import {
    CreateRoomResponse,
    JoinRoomResponse,
    Participant,
    Room,
    RoomData,
    SignalingData
} from "../types/signaling.types.js";

export class SignalingService {
    private rooms: Map<string, Room>;
    private roomHosts: Map<string, string>;
    private participantToRoom: Map<string, string>;

    constructor() {
        this.rooms = new Map<string, Room>();
        this.roomHosts = new Map<string, string>();
        this.participantToRoom = new Map<string, string>();

        console.log('SignalingService initialized');
    }

    // Generate a random 6-character room ID
    private generateRoomId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Ensure room ID is unique
    private generateUniqueRoomId(): string {
        let roomId: string;
        do {
            roomId = this.generateRoomId();
        } while (this.rooms.has(roomId));
        return roomId;
    }

    handleConnection(io: Server, socket: Socket): void {
        console.log("User connected:", socket.id);

        // Handle room creation (host)
        socket.on('create-room', (callback: (response: CreateRoomResponse) => void) => {
            try {
                const roomId = this.generateUniqueRoomId();

                const room: Room = {
                    id: roomId,
                    hostId: socket.id,
                    participants: new Map(),
                    createdAt: new Date(),
                    isActive: true
                };

                const host: Participant = {
                    id: socket.id,
                    socketId: socket.id,
                    role: 'host',
                    roomId: roomId
                };

                room.participants.set(socket.id, host);
                this.rooms.set(roomId, room);
                this.participantToRoom.set(socket.id, roomId);

                // Join the socket to the room
                socket.join(roomId);

                console.log(`Room ${roomId} created by host ${socket.id}`);

                // Send success response
                callback({
                    success: true,
                    roomId: roomId,
                    role: 'host'
                });

            } catch (error) {
                console.error('Error creating room:', error);
                callback({
                    success: false,
                    error: 'Failed to create room'
                });
            }
        });

        // Handle room joining (participant)
        socket.on('join-room', (data: RoomData, callback: (response: JoinRoomResponse) => void) => {
            try {
                const roomId = data.roomId.toUpperCase();
                const room = this.rooms.get(roomId);

                if (!room || !room.isActive) {
                    callback({
                        success: false,
                        error: 'Room not found or no longer active'
                    });
                    return;
                }

                const participant: Participant = {
                    id: socket.id,
                    socketId: socket.id,
                    role: 'participant',
                    roomId: roomId
                };

                room.participants.set(socket.id, participant);
                this.participantToRoom.set(socket.id, roomId);

                // Join the socket to the room
                socket.join(roomId);

                console.log(`User ${socket.id} joined room ${roomId}`);

                // Notify others in the room about the new participant
                socket.to(roomId).emit('participant-joined', {
                    participant: {
                        id: socket.id,
                        role: 'participant'
                    },
                    participantCount: room.participants.size,
                    roomId: roomId
                });

                // Send success response
                callback({
                    success: true,
                    roomId: roomId,
                    role: 'participant',
                    participantCount: room.participants.size
                });

            } catch (error) {
                console.error('Error joining room:', error);
                callback({
                    success: false,
                    error: 'Failed to join room'
                });
            }
        });

        socket.on('offer', (data: SignalingData): void => {
            this.relayMessage(socket, 'offer', data)
        })

        socket.on('answer', (data: SignalingData) => {
            this.relayMessage(socket, 'answer', data);
        });

        socket.on('ice-candidate', (data: SignalingData) => {
            this.relayMessage(socket, 'ice-candidate', data);
        });

        socket.on('leave-room', (data: RoomData) => {
            this.handleLeaveRoom(socket, data.roomId, io);
        });

        socket.on('disconnect', () => {
            this.handleDisconnect(socket, io);
        });

    }


    private handleLeaveRoom(socket: Socket, roomId: string, io: Server): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        if (!participant) return;

        // Remove participant from room
        room.participants.delete(socket.id);
        this.participantToRoom.delete(socket.id);
        socket.leave(roomId);

        // Notify others in the room
        socket.to(roomId).emit('participant-left', {
            participant: {
                id: socket.id,
                role: participant.role
            },
            participantCount: room.participants.size,
            roomId: roomId
        });

        // If this was the host or room is empty, end the session
        if (participant.role === 'host' || room.participants.size === 0) {
            this.endRoom(roomId, io);
        }

        console.log(`User ${socket.id} left room ${roomId}`);
    }

    private handleEndSession(socket: Socket, roomId: string, io: Server): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const participant = room.participants.get(socket.id);
        if (!participant || participant.role !== 'host') {
            console.warn(`Non-host ${socket.id} attempted to end session ${roomId}`);
            return;
        }

        this.endRoom(roomId, io);
        console.log(`Host ${socket.id} ended session ${roomId}`);
    }

    private handleDisconnect(socket: Socket, io: Server): void {
        console.log(`User disconnected: ${socket.id}`);

        const roomId = this.participantToRoom.get(socket.id);
        if (roomId) {
            this.handleLeaveRoom(socket, roomId, io);
        }
    }

    private endRoom(roomId: string, io: Server): void {
        const room = this.rooms.get(roomId);
        if (!room) return;

        // Notify all participants that the session has ended
        io.to(roomId).emit('session-ended', {
            roomId: roomId,
            message: 'Session has been ended'
        });

        // Clean up
        room.participants.forEach((participant) => {
            this.participantToRoom.delete(participant.socketId);
            const socket = io.sockets.sockets.get(participant.socketId);
            if (socket) {
                socket.leave(roomId);
            }
        });

        this.rooms.delete(roomId);
        console.log(`Room ${roomId} ended and cleaned up`);
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

    private cleanupRoom(roomId: string): void {
        this.rooms.delete(roomId);
        this.roomHosts.delete(roomId);
        console.log(`Room ${roomId} cleaned up`);
    }

    // Utility methods for monitoring/debugging
    getRoomCount(): number {
        return this.rooms.size;
    }

    getRoomParticipants(roomId: string): string[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.participants.keys()) : [];
    }

    getAllRooms(): { [roomId: string]: string[] } {
        const result: { [roomId: string]: string[] } = {};
        this.rooms.forEach((room, roomId) => {
            result[roomId] = Array.from(room.participants.keys());
        });
        return result;
    }

    // Get total participant count across all rooms
    getTotalParticipants(): number {
        let total = 0;
        this.rooms.forEach(room => {
            total += room.participants.size;
        });
        return total;
    }
}