export interface SignalingData {
    target: string;
    [key: string]: any;
}

export interface JoinRoomData {
    roomId: string;
    participantId: string;
}