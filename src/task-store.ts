import { RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTimestamp, getParsedTimestamp } from './utils.js';

export interface Task {
    id: string;
    user_id: string;
    description: string;
    status: string;
    due_time: string;
    created_at: string;
}

export class RedisTaskStore {
    private redis: RedisClientType;

    constructor(redisClient: RedisClientType) {
        this.redis = redisClient;
    }

    private taskKey(taskId: string): string {
        return `task:${taskId}`;
    }

    private statusKey(userId: string, status: string): string {
        return `tasks:${userId}:status:${status}`;
    }

    private dueKey(userId: string): string {
        return `tasks:${userId}:due`;
    }

    async createTask({
        user_id,
        description,
        due_time,
        status = "pending"
    }: {
        user_id: string,
        description: string,
        status: string,
        due_time?: string
    }): Promise<string> {
        const taskId = uuidv4();
        const taskKey = this.taskKey(taskId);

        const parsedTimestamp = due_time ? getParsedTimestamp(due_time!) : "";

        const taskData = {
            id: taskId,
            user_id,
            description,
            status,
            due_time: due_time != undefined ? parsedTimestamp?.toString() : "",
            created_at: getCurrentTimestamp().toString(),
        };

        await this.redis.hSet(taskKey, taskData);
        await this.redis.sAdd(this.statusKey(user_id, status), taskId);

        if (due_time && due_time?.length > 0 && typeof parsedTimestamp === "number") {
            await this.redis.zAdd(this.dueKey(user_id), {
                value: taskId,
                score: parsedTimestamp,
            });
        }

        return taskId;
    }

    async createTasksBulk(userId: string, tasks: any[]): Promise<string[]> {
        const taskIds: string[] = [];
        const now = getCurrentTimestamp();

        for (const task of tasks) {
            const taskId = uuidv4();
            taskIds.push(taskId);

            const due_time = task.due_time ? getParsedTimestamp(task.due_time) : undefined;
            const taskKey = this.taskKey(taskId);

            const taskData = {
                id: taskId,
                user_id: userId,
                description: task.description,
                status: task.status || "pending",
                due_time: due_time ? due_time.toString() : "",
                created_at: now.toString(),
            };

            await this.redis.hSet(taskKey, taskData);
            await this.redis.sAdd(this.statusKey(userId, task.status || "pending"), taskId);

            if (due_time) {
                await this.redis.zAdd(this.dueKey(userId), {
                    value: taskId,
                    score: due_time,
                });
            }
        }

        return taskIds;
    }

    async getTask(taskId: string): Promise<Task | null> {
        const taskKey = this.taskKey(taskId);
        const task = await this.redis.hGetAll(taskKey);

        if (!task || Object.keys(task).length === 0) return null;

        return {
            ...task,
            due_time: task.due_time && task.due_time !== ""
                ? new Date(parseInt(task.due_time)).toISOString()
                : "",
            created_at : new Date(parseInt(task.created_at)).toISOString()
        } as Task;
    }

    async updateTask(userId: string, taskId: string, updates: any): Promise<boolean> {
        const taskKey = this.taskKey(taskId);
        const task = await this.redis.hGetAll(taskKey);

        if (!task || Object.keys(task).length === 0) return false;

        const oldStatus = task.status;
        const oldDueTime = task.due_time && task.due_time !== "" ? parseInt(task.due_time) : undefined;

        let newDueTime: number | undefined;
        if (updates?.due_time && updates.due_time !== undefined) {
            newDueTime = getParsedTimestamp(updates.due_time);
        } else {
            newDueTime = oldDueTime;
        }

        const updatedTask = { ...task };
        for (const [key, value] of Object.entries(updates)) {
            if (key === "due_time") {
                updatedTask[key] = newDueTime ? newDueTime.toString() : "";
            } else if (value !== undefined) {
                updatedTask[key] = value === null ? "" : String(value);
            }
        }

        await this.redis.hSet(taskKey, updatedTask);

        if (updates.status && updates.status !== oldStatus) {
            if (oldStatus) {
                await this.redis.sRem(this.statusKey(userId, oldStatus), taskId);
            }
            await this.redis.sAdd(this.statusKey(userId, updates.status), taskId);
        }

        if (updates.due_time !== undefined) {
            if (oldDueTime) {
                await this.redis.zRem(this.dueKey(userId), taskId);
            }
            if (newDueTime) {
                await this.redis.zAdd(this.dueKey(userId), {
                    value: taskId,
                    score: newDueTime,
                });
            }
        }

        return true;
    }

    async deleteTask(userId: string, taskId: string): Promise<boolean> {
        const task = await this.getTask(taskId);
        if (!task) return false;

        if (task.status) {
            await this.redis.sRem(this.statusKey(userId, task.status), taskId);
        }

        if (task.due_time && task.due_time !== "") {
            await this.redis.zRem(this.dueKey(userId), taskId);
        }

        await this.redis.del(this.taskKey(taskId));
        return true;
    }

    async getTasksByFilters(
        userId: string,
        statuses: string[] = ["pending", "completed"],
        start?: string,
        end?: string
    ): Promise<Task[]> {
        let taskIds: string[] = [];

        if (statuses.length > 0) {
            for (const status of statuses) {
                const statusTaskIds = await this.redis.sMembers(this.statusKey(userId, status));
                taskIds = [...taskIds, ...statusTaskIds];
            }
        }

        if (start !== undefined || end !== undefined) {
            const min = start !== undefined ? getParsedTimestamp(start) : "-inf";
            const max = end !== undefined ? getParsedTimestamp(end) : "+inf";
            const dueTaskIds = await this.redis.zRangeByScore(this.dueKey(userId), min, max);

            if (taskIds.length > 0) {
                taskIds = taskIds.filter(id => dueTaskIds.includes(id));
            } else {
                taskIds = dueTaskIds;
            }
        }

        const tasks: Task[] = [];
        for (const taskId of taskIds) {
            const task = await this.getTask(taskId);
            if (task) tasks.push(task);
        }

        return tasks;
    }
}