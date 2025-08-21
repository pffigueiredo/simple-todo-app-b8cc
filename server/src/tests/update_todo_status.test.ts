import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type UpdateTodoStatusInput } from '../schema';
import { updateTodoStatus } from '../handlers/update_todo_status';
import { eq } from 'drizzle-orm';

describe('updateTodoStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test todo directly in the database
  const createTestTodo = async (description: string) => {
    const result = await db.insert(todosTable)
      .values({
        description,
        status: 'pending'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update todo status from pending to completed', async () => {
    // Create a test todo directly
    const createdTodo = await createTestTodo('Test todo for status update');

    // Update the todo status to completed
    const updateInput: UpdateTodoStatusInput = {
      id: createdTodo.id,
      status: 'completed'
    };

    const result = await updateTodoStatus(updateInput);

    // Verify the returned todo has updated status
    expect(result.id).toEqual(createdTodo.id);
    expect(result.description).toEqual('Test todo for status update');
    expect(result.status).toEqual('completed');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(createdTodo.created_at);
  });

  it('should update todo status from completed to pending', async () => {
    // Create a test todo and set it to completed initially
    const result = await db.insert(todosTable)
      .values({
        description: 'Test todo for reverse status update',
        status: 'completed'
      })
      .returning()
      .execute();
    const createdTodo = result[0];

    // Update back to pending
    const updateInput: UpdateTodoStatusInput = {
      id: createdTodo.id,
      status: 'pending'
    };

    const updatedResult = await updateTodoStatus(updateInput);

    // Verify the status was updated back to pending
    expect(updatedResult.id).toEqual(createdTodo.id);
    expect(updatedResult.description).toEqual('Test todo for reverse status update');
    expect(updatedResult.status).toEqual('pending');
    expect(updatedResult.created_at).toBeInstanceOf(Date);
  });

  it('should persist status update in database', async () => {
    // Create a test todo
    const createdTodo = await createTestTodo('Test todo for database persistence');

    // Update the todo status
    const updateInput: UpdateTodoStatusInput = {
      id: createdTodo.id,
      status: 'completed'
    };

    await updateTodoStatus(updateInput);

    // Query the database directly to verify persistence
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, createdTodo.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].status).toEqual('completed');
    expect(todos[0].description).toEqual('Test todo for database persistence');
    expect(todos[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when todo does not exist', async () => {
    const updateInput: UpdateTodoStatusInput = {
      id: 999, // Non-existent todo ID
      status: 'completed'
    };

    await expect(updateTodoStatus(updateInput))
      .rejects.toThrow(/todo with id 999 not found/i);
  });

  it('should handle multiple status updates correctly', async () => {
    // Create multiple test todos
    const todo1 = await createTestTodo('First todo');
    const todo2 = await createTestTodo('Second todo');

    // Update both todos to completed
    await updateTodoStatus({ id: todo1.id, status: 'completed' });
    await updateTodoStatus({ id: todo2.id, status: 'completed' });

    // Verify both todos were updated correctly
    const updatedTodos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.status, 'completed'))
      .execute();

    expect(updatedTodos).toHaveLength(2);
    const todoIds = updatedTodos.map(todo => todo.id);
    expect(todoIds).toContain(todo1.id);
    expect(todoIds).toContain(todo2.id);
  });

  it('should preserve other todo fields when updating status', async () => {
    // Create a test todo
    const createdTodo = await createTestTodo('Todo with important description');

    // Store original values
    const originalDescription = createdTodo.description;
    const originalCreatedAt = createdTodo.created_at;

    // Update only the status
    const result = await updateTodoStatus({
      id: createdTodo.id,
      status: 'completed'
    });

    // Verify other fields remain unchanged
    expect(result.description).toEqual(originalDescription);
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.id).toEqual(createdTodo.id);
    // Only status should change
    expect(result.status).toEqual('completed');
  });

  it('should handle status toggle correctly', async () => {
    // Create a test todo
    const createdTodo = await createTestTodo('Toggle test todo');

    // First update: pending -> completed
    const completedResult = await updateTodoStatus({
      id: createdTodo.id,
      status: 'completed'
    });
    expect(completedResult.status).toEqual('completed');

    // Second update: completed -> pending
    const pendingResult = await updateTodoStatus({
      id: createdTodo.id,
      status: 'pending'
    });
    expect(pendingResult.status).toEqual('pending');

    // Third update: pending -> completed again
    const completedAgainResult = await updateTodoStatus({
      id: createdTodo.id,
      status: 'completed'
    });
    expect(completedAgainResult.status).toEqual('completed');
  });
});