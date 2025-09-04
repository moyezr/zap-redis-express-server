import { Router } from 'express';
import { updateUser } from '../controllers/user-controllers.js';

const router = Router();

// router.get('/:user_id', getTasks);
// router.get('/:user_id', getTaskById);
// router.post('/', createTasks);
router.put('/:user_id', updateUser);
// router.delete('/:user_id', deleteTask);

export default router;
