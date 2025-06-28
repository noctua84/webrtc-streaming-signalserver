export interface Config {
    PORT: number;
    NODE_ENV: 'development' | 'production';
    CORS_ORIGIN: string;
    SOCKET_TIMEOUT: number;
    MAX_PARTICIPANTS: number;
    STATS_INTERVAL: number;
}


export const config: Config = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production',
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    SOCKET_TIMEOUT: parseInt(process.env.SOCKET_TIMEOUT || '60000', 10), // 60 seconds
    MAX_PARTICIPANTS: parseInt(process.env.MAX_PARTICIPANTS || '100', 10),
    STATS_INTERVAL: parseInt(process.env.STATS_INTERVAL || '60000', 10), // 60 seconds
    // Additional configurations can be added here
    // For example, database connection strings, API keys, etc.

};