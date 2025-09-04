import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType> => {

    const redisUrl = process.env.REDIS_URL;
    console.log("Redis URL: ", redisUrl);

    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not set');
    }

    if (!client) {
        client = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 5) return new Error('Redis reconnect limit reached');
                    return Math.min(retries * 200, 2000);
                }
            }
        });

        client.on('error', (err) => console.error('Redis Client Error', err));
        await client.connect();
        console.log('Connected to Redis successfully');

         
    }
    return client;
};