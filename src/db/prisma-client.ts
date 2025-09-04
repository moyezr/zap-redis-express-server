import { PrismaClient } from '@prisma/client';

class PrismaClientSingleton {
  private static instance: PrismaClient | null = null;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    return PrismaClientSingleton.instance;
  }

  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect();
      PrismaClientSingleton.instance = null;
    }
  }
}

export async function get_prisma_client() {
    const client = PrismaClientSingleton.getInstance();
    await client.$connect();
    return client;  
}

export default PrismaClientSingleton;
