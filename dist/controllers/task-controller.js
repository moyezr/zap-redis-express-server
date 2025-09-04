let taskStore = null;
let taskQueue = null; // reserved for future enhancements
export const setTaskDependencies = (store, queue) => {
    taskStore = store;
    taskQueue = queue;
};
const ensureDeps = () => {
    if (!taskStore)
        throw new Error('Task store not initialized');
};
export const getTasks = async (req, res) => {
    try {
        ensureDeps();
        const { user_id, statuses, start_time, end_time } = req.query;
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        const statusArray = statuses
            ? (Array.isArray(statuses) ? statuses.map(s => s?.toString()) : [statuses.toString()])
            : ['pending', 'completed'];
        const tasks = await taskStore.getTasksByFilters(user_id, statusArray, start_time, end_time);
        res.json(tasks);
    }
    catch (error) {
        console.error('ERROR FETCHING TASKS:', error);
        res.status(500).json({ error: 'Error retrieving tasks' });
    }
};
export const getTaskById = async (req, res) => {
    try {
        ensureDeps();
        const { task_id } = req.params;
        if (!task_id) {
            return res.status(400).json({ error: 'task_id is required' });
        }
        const task = await taskStore.getTask(task_id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    }
    catch (error) {
        console.error('ERROR FETCHING TASK:', error);
        res.status(500).json({ error: 'Error retrieving task' });
    }
};
export const createTasks = async (req, res) => {
    try {
        ensureDeps();
        const { user_id, tasks } = req.body;
        if (!user_id || !tasks) {
            return res.status(400).json({ error: 'user_id and tasks are required' });
        }
        const taskIds = await taskStore.createTasksBulk(user_id, tasks);
        res.status(201).json(taskIds);
    }
    catch (error) {
        console.error('ERROR CREATING TASKS:', error);
        res.status(500).json({ error: 'Error creating tasks' });
    }
};
export const updateTask = async (req, res) => {
    try {
        ensureDeps();
        const task_id = req.params.task_id;
        const updates = req.body;
        if (!updates.user_id || !task_id) {
            return res.status(400).json({ error: 'user_id and task_id are required' });
        }
        const success = await taskStore.updateTask(updates.user_id, task_id, updates);
        if (!success) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task updated successfully' });
    }
    catch (error) {
        console.error('ERROR UPDATING TASK:', error);
        res.status(500).json({ error: 'Error updating task' });
    }
};
export const deleteTask = async (req, res) => {
    try {
        ensureDeps();
        const { task_id } = req.params;
        const { user_id } = req.query;
        if (!user_id || !task_id) {
            return res.status(400).json({ error: 'user_id and task_id are required' });
        }
        const success = await taskStore.deleteTask(user_id, task_id);
        if (!success) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    }
    catch (error) {
        console.error('ERROR DELETING TASK:', error);
        res.status(500).json({ error: 'Error deleting task' });
    }
};
