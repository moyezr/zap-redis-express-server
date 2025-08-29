import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getRedisClient } from './redis-client.js';
import { RedisTaskStore } from './task-store.js';
import { getParsedTimestamp } from './utils.js';
import { RedisClientType } from 'redis';

const app = express();
app.use(express.json());
app.use(cors());

let taskStore: RedisTaskStore;

// Initialize Redis connection
getRedisClient().then((client: RedisClientType) => {
  taskStore = new RedisTaskStore(client);
});

// Middleware to ensure taskStore is initialized
const ensureStore = (req: Request, res: Response, next: NextFunction) => {
  if (!taskStore) {
    return res.status(500).json({ error: 'Redis store not initialized' });
  }
  next();
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/tasks', ensureStore, async (req, res) => {
  try {
    const { user_id, statuses, start_time, end_time }: { user_id?: string, statuses?: string[], start_time?: string, end_time?: string } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const statusArray: string[] = statuses
      ? (Array.isArray(statuses) ? statuses.map(s => s?.toString()) : [statuses])
      : ['pending', 'completed'];


    const tasks = await taskStore.getTasksByFilters(
      user_id as string,
      statusArray,
      start_time,
      end_time
    );

    res.json(tasks);
  } catch (error) {
    console.error('ERROR FETCHING TASKS:', error);
    res.status(500).json({ error: 'Error retrieving tasks' });
  }
});

app.get('/task/:taskId', ensureStore, async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }
    const task = await taskStore.getTask(taskId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('ERROR FETCHING TASK:', error);
    res.status(500).json({ error: 'Error retrieving task' });
  }
});

app.post('/tasks', ensureStore, async (req, res) => {
  try {
    const { user_id, tasks } = req.body;



    if (!user_id || !tasks) {
      return res.status(400).json({ error: 'user_id and tasks are required' });
    }

    const taskIds = await taskStore.createTasksBulk(user_id, tasks);
    res.status(201).json(taskIds);
  } catch (error) {
    console.error('ERROR CREATING TASKS:', error);
    res.status(500).json({ error: 'Error creating tasks' });
  }
});

app.put('/tasks/:taskId', ensureStore, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const updates = req.body;

    if (!updates.user_id || !taskId) {
      return res.status(400).json({ error: 'user_id and taskId are required' });
    }

    const success = await taskStore.updateTask(updates.user_id, taskId, updates);

    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('ERROR UPDATING TASK:', error);
    res.status(500).json({ error: 'Error updating task' });
  }
});

app.delete('/tasks/:taskId', ensureStore, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { user_id } = req.query;

    if (!user_id || !taskId) {
      return res.status(400).json({ error: 'user_id and taskId are required' });
    }

    const success = await taskStore.deleteTask(user_id as string, taskId);

    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('ERROR DELETING TASK:', error);
    res.status(500).json({ error: 'Error deleting task' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});