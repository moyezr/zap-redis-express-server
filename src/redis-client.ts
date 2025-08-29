import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {
    if (!client) {
        client = createClient({
            socket: {
                host: '127.0.0.1',
                port: 6379,
            }
        });

        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect();
        console.log('Connected to Redis successfully');
    }
    return client;
};