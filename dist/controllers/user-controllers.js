import { get_prisma_client } from '../db/prisma-client.js';
export async function updateUser(req, res) {
    try {
        const { user_id } = req.params;
        if (!user_id) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const updates = req.body;
        const prisma = await get_prisma_client();
        const updatedUser = await prisma.user.update({
            where: {
                id: user_id
            },
            data: updates
        });
        res.status(200).json({ data: updatedUser, message: 'User updated successfully' });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'An error occurred while updating the user' });
    }
}
