import { Router } from 'express';
import { getTasks, getTaskById, createTasks, updateTask, deleteTask } from '../controllers/task-controller.js';

const router = Router();

router.get('/', getTasks);
router.get('/:task_id', getTaskById);
router.post('/', createTasks);
router.put('/:task_id', updateTask);
router.delete('/:task_id', deleteTask);

export default router;
