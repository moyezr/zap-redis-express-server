import { createClient } from 'redis';
let client = null;
export const getRedisClient = async () => {
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
