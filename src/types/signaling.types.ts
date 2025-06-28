export interface SignalingData {
    target: string;
    [key: string]: any;
}

export interface RoomData {
    roomId: string;
    participantId: string;
}

export interface Participant {
    id: string;
    socketId: string;
    role: 'host' | 'participant';
    roomId: string;
}

export interface Room {
    id: string;
    hostId: string;
    participants: Map<string, Participant>;
    createdAt: Date;
    isActive: boolean;
}

// Response types that match frontend expectations
export interface CreateRoomResponse {
    success: boolean;
    roomId?: string;
    error?: string;
    role?: 'host' | 'participant';
}

export interface JoinRoomResponse {
    success: boolean;
    roomId?: string;
    role?: 'host' | 'participant';
    error?: string;
    participantCount?: number;
}

// WebRTC signaling data types
export interface OfferData {
    offer: RTCSessionDescriptionInit;
    roomId: string;
    targetId: string;
    participantId?: string;
}

export interface AnswerData {
    answer: RTCSessionDescriptionInit;
    roomId: string;
    targetId: string;
    participantId?: string;
}

export interface IceCandidateData {
    candidate: RTCIceCandidateInit;
    roomId: string;
    targetId: string;
    participantId?: string;
}

// Event data types
export interface ParticipantInfo {
    id: string;
    role: 'host' | 'participant';
    displayName?: string;
}

export interface ParticipantJoinedData {
    participant: ParticipantInfo;
    participantCount: number;
    roomId: string;
}

export interface ParticipantLeftData {
    participant: ParticipantInfo;
    participantCount: number;
    roomId: string;
}

export interface SessionEndedData {
    roomId: string;
    reason?: string;
    message: string;
}

export interface RoomUpdateData {
    roomId: string;
    participants: ParticipantInfo[];
    participantCount: number;
}

// Socket.io event map for type safety
export interface ServerToClientEvents {
    'participant-joined': (data: ParticipantJoinedData) => void;
    'participant-left': (data: ParticipantLeftData) => void;
    'session-ended': (data: SessionEndedData) => void;
    'room-update': (data: RoomUpdateData) => void;
    'offer': (data: OfferData) => void;
    'answer': (data: AnswerData) => void;
    'ice-candidate': (data: IceCandidateData) => void;
}

export interface ClientToServerEvents {
    'create-room': (callback: (response: CreateRoomResponse) => void) => void;
    'join-room': (data: { roomId: string }, callback: (response: JoinRoomResponse) => void) => void;
    'offer': (data: OfferData) => void;
    'answer': (data: AnswerData) => void;
    'ice-candidate': (data: IceCandidateData) => void;
    'leave-room': (data: { roomId: string }) => void;
    'end-session': (data: { roomId: string }) => void;
}