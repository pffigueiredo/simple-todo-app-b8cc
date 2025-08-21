import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteTodo(input: DeleteTodoInput): Promise<{ success: boolean }> {
  try {
    // Delete the todo item by ID
    const result = await db.delete(todosTable)
      .where(eq(todosTable.id, input.id))
      .returning()
      .execute();

    // Return success if a row was actually deleted
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Todo deletion failed:', error);
    throw error;
  }
}