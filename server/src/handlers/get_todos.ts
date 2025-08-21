import { db } from '../db';
import { todosTable } from '../db/schema';
import { type Todo } from '../schema';
import { desc } from 'drizzle-orm';

export const getTodos = async (): Promise<Todo[]> => {
  try {
    // Fetch all todos ordered by creation date (newest first)
    const results = await db.select()
      .from(todosTable)
      .orderBy(desc(todosTable.created_at))
      .execute();

    // Return the results as-is since no numeric columns need conversion
    return results;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
    throw error;
  }
};