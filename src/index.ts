import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getRedisClient } from './db/redis-client.js';
import { RedisTaskStore } from './services/task-store.js';
import { RedisClientType } from 'redis';
import TaskQueue from './services/task-queue.js';
import taskRoutes from './routes/task-routes.js';
import userRoutes from './routes/user-routes.js';
import { setTaskDependencies } from './controllers/task-controller.js';

const app = express();
app.use(express.json());
app.use(cors());

let task_store: RedisTaskStore | null = null;
let taskQueue: TaskQueue | null = null;
// Initialize Redis connection
getRedisClient().then((client: RedisClientType) => {
  task_store = new RedisTaskStore(client);
  taskQueue = new TaskQueue(task_store);
  task_store.setTaskQueue(taskQueue);
  setTaskDependencies(task_store, taskQueue);
});

// Middleware to ensure task_store is initialized
const ensureStore = (req: Request, res: Response, next: NextFunction) => {
  if (!task_store) {
    return res.status(500).json({ error: 'Redis store not initialized' });
  }

  if (!taskQueue) {
    return res.status(500).json({ error: 'Task queue not initialized' });
  }
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount task routes (collection + resource)
app.use('/tasks', ensureStore, taskRoutes);
// Backwards compatibility singular path
app.use('/task', ensureStore, taskRoutes);

app.use('/user', userRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});