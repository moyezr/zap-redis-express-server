import { RedisClientType } from 'redis';
export interface Task {
    id: string;
    user_id: string;
    description: string;
    status: string;
    due_time: string;
    created_at: string;
}
export declare class RedisTaskStore {
    private redis;
    constructor(redisClient: RedisClientType);
    private taskKey;
    private statusKey;
    private dueKey;
    createTask({ user_id, description, due_time, status }: {
        user_id: string;
        description: string;
        status: string;
        due_time?: string;
    }): Promise<string>;
    createTasksBulk(userId: string, tasks: any[]): Promise<string[]>;
    getTask(taskId: string): Promise<Task | null>;
    updateTask(userId: string, taskId: string, updates: any): Promise<boolean>;
    deleteTask(userId: string, taskId: string): Promise<boolean>;
    getTasksByFilters(userId: string, statuses?: string[], start?: number, end?: number): Promise<Task[]>;
}
//# sourceMappingURL=task-store.d.ts.map