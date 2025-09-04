import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../db/redis-client.js';
import { RedisTaskStore } from './task-store.js';
// import { send_push_notification, makeVoiceCall } from './notification-service.js';
import { Task } from '../types/task.js';
import { send_push_notification } from '../services/notification-service.js';

class TaskQueue {
    private queue!: Queue;
    private worker!: Worker;
    private task_store: RedisTaskStore;

    constructor(task_store: RedisTaskStore) {
        this.task_store = task_store;
        this.initializeQueue();
    }

    private async initializeQueue() {
        const redisClient = await getRedisClient();

        this.queue = new Queue('taskReminders', {
            connection: { url: process.env.REDIS_URL! }
        });

        this.worker = new Worker('taskReminders', this.processJob.bind(this), {
            connection: { url: process.env.REDIS_URL! }
        });

        this.worker.on('completed', (job: Job) => {
            console.log(`Job ${job.id} completed`);
        });

        this.worker.on('failed', (job: Job | undefined, error: Error) => {
            console.error(`Job ${job?.id} failed:`, error);
        });
    }

    private async processJob(job: Job) {
        const { task_id, user_id } = job.data;

        try {
            // Get the latest task data
            const task = await this.task_store.getTask(task_id);
            if (!task || task.status !== 'pending') {
                return; // Task no longer exists or is already completed
            }

            // Send push notification
            await send_push_notification(user_id, task);

            //   // Initiate voice call
            //   await makeVoiceCall(user_id, task);

            // Mark as reminded to prevent duplicate reminders
            await this.task_store.updateTask(user_id, task_id, { status: 'reminded' });
        } catch (error) {
            // you may want to aggregate these in some analytics
            console.error('Error processing reminder job:', error);
            throw error;
        }
    }

    async scheduleTaskReminder(task: Task) {
        if (!task.due_time || task.status !== 'pending') {
            return;
        }

        const due_time = new Date(task.due_time).getTime();
        const now = Date.now();

        // Only schedule if due time is in the future
        if (due_time > now) {
            const delay = due_time - now;

            await this.queue.add(
                `task:${task.id}`,
                { task_id: task.id, user_id: task.user_id },
                { delay, jobId: `task_reminder_${task.id}` }
            );


            // you may want to aggregate these in some analytics
            console.log(`Scheduled reminder for task ${task.id} in ${delay}ms`);
        }
    }

    async removeScheduledReminder(task_id: string) {
        const job = await this.queue.getJob(`task_reminder_${task_id}`);
        if (job) {
            await job.remove();
            console.log(`Removed scheduled reminder for task ${task_id}`);
        }
    }

    async rescheduleTaskReminder(task: Task) {
        // Remove existing job
        await this.removeScheduledReminder(task.id);

        // Schedule new job if needed
        await this.scheduleTaskReminder(task);
    }
}

export default TaskQueue;