import { RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTimestamp, getParsedTimestamp } from '../lib/utils.js';
import { Task } from '../types/task.js';
import TaskQueue from './task-queue.js';


export class RedisTaskStore {
    private redis: RedisClientType;
    private taskQueue: TaskQueue | null = null;

    constructor(redisClient: RedisClientType) {
        this.redis = redisClient;
    }

    setTaskQueue(taskQueue: TaskQueue) {
        this.taskQueue = taskQueue;
    }


    private taskKey(task_id: string): string {
        return `task:${task_id}`;
    }

    private statusKey(user_id: string, status: string): string {
        return `tasks:${user_id}:status:${status}`;
    }

    private dueKey(user_id: string): string {
        return `tasks:${user_id}:due`;
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
        const task_id = uuidv4();
        const taskKey = this.taskKey(task_id);

        const parsedTimestamp = due_time ? getParsedTimestamp(due_time!) : "";

        const taskData = {
            id: task_id,
            user_id,
            description,
            status,
            due_time: due_time != undefined ? parsedTimestamp?.toString() : "",
            created_at: getCurrentTimestamp().toString(),
        };

        await this.redis.hSet(taskKey, taskData);
        await this.redis.sAdd(this.statusKey(user_id, status), task_id);

        if (due_time && due_time?.length > 0 && typeof parsedTimestamp === "number") {
            await this.redis.zAdd(this.dueKey(user_id), {
                value: task_id,
                score: parsedTimestamp,
            });

            // Schedule reminder if task is pending
            if (status === 'pending' && this.taskQueue) {
                const task = await this.getTask(task_id);
                if (task) {
                    await this.taskQueue.scheduleTaskReminder(task);
                }
            }
        }

        return task_id;
    }

    async createTasksBulk(user_id: string, tasks: any[]): Promise<string[]> {
        const taskIds: string[] = [];
        const now = getCurrentTimestamp();

        for (const task of tasks) {
            const task_id = uuidv4();
            taskIds.push(task_id);

            const due_time = task.due_time ? getParsedTimestamp(task.due_time) : undefined;
            const taskKey = this.taskKey(task_id);

            const taskData = {
                id: task_id,
                user_id: user_id,
                description: task.description,
                status: task.status || "pending",
                due_time: due_time ? due_time.toString() : "",
                created_at: now.toString(),
            };

            await this.redis.hSet(taskKey, taskData);
            await this.redis.sAdd(this.statusKey(user_id, task.status || "pending"), task_id);

            if (due_time) {
                await this.redis.zAdd(this.dueKey(user_id), {
                    value: task_id,
                    score: due_time,
                });

                // Schedule reminder if task is pending
                const task = await this.getTask(task_id);
                if (task && this.taskQueue) {
                    await this.taskQueue.scheduleTaskReminder(task);
                }
            }
        }

        return taskIds;
    }

    async getTask(task_id: string): Promise<Task | null> {
        const taskKey = this.taskKey(task_id);
        const task = await this.redis.hGetAll(taskKey);

        if (!task || Object.keys(task).length === 0) return null;

        return {
            ...task,
            due_time: task.due_time && task.due_time !== ""
                ? new Date(parseInt(task.due_time)).toISOString()
                : "",
            created_at: new Date(parseInt(task.created_at)).toISOString()
        } as Task;
    }

    async updateTask(user_id: string, task_id: string, updates: any): Promise<boolean> {
        const taskKey = this.taskKey(task_id);
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
                await this.redis.sRem(this.statusKey(user_id, oldStatus), task_id);
            }
            await this.redis.sAdd(this.statusKey(user_id, updates.status), task_id);
        }

        if (updates.due_time !== undefined) {
            if (oldDueTime) {
                await this.redis.zRem(this.dueKey(user_id), task_id);
            }
            if (newDueTime) {
                await this.redis.zAdd(this.dueKey(user_id), {
                    value: task_id,
                    score: newDueTime,
                });
            }
        }

        // Reschedule reminder if due time changed or status changed to pending
        if (updates.due_time !== undefined || (updates.status && updates.status === 'pending')) {
            const updatedTask = await this.getTask(task_id);
            if (updatedTask && this.taskQueue) {
                await this.taskQueue.rescheduleTaskReminder(updatedTask);
            }
        } else if (updates.status && updates.status !== 'pending' && this.taskQueue) {
            // Remove scheduled reminder if task is no longer pending
            await this.taskQueue.removeScheduledReminder(task_id);
        }

        return true;
    }

    async deleteTask(user_id: string, task_id: string): Promise<boolean> {
        const task = await this.getTask(task_id);
        if (!task) return false;

        if (task.status) {
            await this.redis.sRem(this.statusKey(user_id, task.status), task_id);
        }

        if (task.due_time && task.due_time !== "") {
            await this.redis.zRem(this.dueKey(user_id), task_id);
        }

        // Remove any scheduled reminder
        if(this.taskQueue) {
            await this.taskQueue.removeScheduledReminder(task_id);
        }


        await this.redis.del(this.taskKey(task_id));
        return true;
    }

    async getTasksByFilters(
        user_id: string,
        statuses: string[] = ["pending", "completed"],
        start?: string,
        end?: string
    ): Promise<Task[]> {
        let taskIds: string[] = [];

        if (statuses.length > 0) {
            for (const status of statuses) {
                const statusTaskIds = await this.redis.sMembers(this.statusKey(user_id, status));
                taskIds = [...taskIds, ...statusTaskIds];
            }
        }

        if (start !== undefined || end !== undefined) {
            const min = start !== undefined ? getParsedTimestamp(start) : "-inf";
            const max = end !== undefined ? getParsedTimestamp(end) : "+inf";
            const dueTaskIds = await this.redis.zRangeByScore(this.dueKey(user_id), min, max);

            if (taskIds.length > 0) {
                taskIds = taskIds.filter(id => dueTaskIds.includes(id));
            } else {
                taskIds = dueTaskIds;
            }
        }

        const tasks: Task[] = [];
        for (const task_id of taskIds) {
            const task = await this.getTask(task_id);
            if (task) tasks.push(task);
        }

        return tasks;
    }
}