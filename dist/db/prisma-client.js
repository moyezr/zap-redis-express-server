import { PrismaClient } from '@prisma/client';
class PrismaClientSingleton {
    constructor() { }
    static getInstance() {
        if (!PrismaClientSingleton.instance) {
            PrismaClientSingleton.instance = new PrismaClient({
                log: ['query', 'info', 'warn', 'error'],
            });
        }
        return PrismaClientSingleton.instance;
    }
    static async disconnect() {
        if (PrismaClientSingleton.instance) {
            await PrismaClientSingleton.instance.$disconnect();
            PrismaClientSingleton.instance = null;
        }
    }
}
PrismaClientSingleton.instance = null;
export async function get_prisma_client() {
    const client = PrismaClientSingleton.getInstance();
    await client.$connect();
    return client;
}
export default PrismaClientSingleton;
