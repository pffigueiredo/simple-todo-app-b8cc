import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type DeleteTodoInput } from '../schema';
import { deleteTodo } from '../handlers/delete_todo';
import { eq } from 'drizzle-orm';

describe('deleteTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing todo', async () => {
    // Create a test todo
    const createResult = await db.insert(todosTable)
      .values({
        description: 'Test todo to delete',
        status: 'pending'
      })
      .returning()
      .execute();

    const createdTodo = createResult[0];
    
    const input: DeleteTodoInput = {
      id: createdTodo.id
    };

    const result = await deleteTodo(input);

    // Should return success
    expect(result.success).toBe(true);

    // Verify todo is actually deleted from database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, createdTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should return false for non-existent todo', async () => {
    const input: DeleteTodoInput = {
      id: 999999 // Non-existent ID
    };

    const result = await deleteTodo(input);

    // Should return failure for non-existent todo
    expect(result.success).toBe(false);
  });

  it('should not affect other todos when deleting', async () => {
    // Create multiple test todos
    const createResults = await db.insert(todosTable)
      .values([
        {
          description: 'First todo',
          status: 'pending'
        },
        {
          description: 'Second todo',
          status: 'completed'
        },
        {
          description: 'Third todo',
          status: 'pending'
        }
      ])
      .returning()
      .execute();

    const todoToDelete = createResults[1]; // Delete the middle one
    
    const input: DeleteTodoInput = {
      id: todoToDelete.id
    };

    const result = await deleteTodo(input);

    // Should return success
    expect(result.success).toBe(true);

    // Verify only the specified todo was deleted
    const remainingTodos = await db.select()
      .from(todosTable)
      .execute();

    expect(remainingTodos).toHaveLength(2);
    
    const remainingIds = remainingTodos.map(todo => todo.id);
    expect(remainingIds).toContain(createResults[0].id);
    expect(remainingIds).toContain(createResults[2].id);
    expect(remainingIds).not.toContain(todoToDelete.id);
  });

  it('should handle completed todos correctly', async () => {
    // Create a completed todo
    const createResult = await db.insert(todosTable)
      .values({
        description: 'Completed todo to delete',
        status: 'completed'
      })
      .returning()
      .execute();

    const completedTodo = createResult[0];
    
    const input: DeleteTodoInput = {
      id: completedTodo.id
    };

    const result = await deleteTodo(input);

    // Should successfully delete completed todos
    expect(result.success).toBe(true);

    // Verify todo is deleted
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, completedTodo.id))
      .execute();

    expect(todos).toHaveLength(0);
  });

  it('should return consistent result structure', async () => {
    const input: DeleteTodoInput = {
      id: 999999 // Non-existent ID
    };

    const result = await deleteTodo(input);

    // Should have correct structure regardless of success/failure
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    expect(Object.keys(result)).toHaveLength(1);
  });
});