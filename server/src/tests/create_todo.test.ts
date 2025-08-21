import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { type CreateTodoInput } from '../schema';
import { createTodo } from '../handlers/create_todo';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTodoInput = {
  description: 'Complete the project'
};

describe('createTodo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a todo with pending status by default', async () => {
    const result = await createTodo(testInput);

    // Basic field validation
    expect(result.description).toEqual('Complete the project');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save todo to database', async () => {
    const result = await createTodo(testInput);

    // Query using proper drizzle syntax
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos).toHaveLength(1);
    expect(todos[0].description).toEqual('Complete the project');
    expect(todos[0].status).toEqual('pending');
    expect(todos[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple todos with unique IDs', async () => {
    const input1: CreateTodoInput = { description: 'First todo' };
    const input2: CreateTodoInput = { description: 'Second todo' };

    const todo1 = await createTodo(input1);
    const todo2 = await createTodo(input2);

    expect(todo1.id).not.toEqual(todo2.id);
    expect(todo1.description).toEqual('First todo');
    expect(todo2.description).toEqual('Second todo');
    expect(todo1.status).toEqual('pending');
    expect(todo2.status).toEqual('pending');
  });

  it('should handle special characters in description', async () => {
    const specialInput: CreateTodoInput = {
      description: 'Todo with "quotes" & special chars: @#$%'
    };

    const result = await createTodo(specialInput);

    expect(result.description).toEqual('Todo with "quotes" & special chars: @#$%');
    expect(result.status).toEqual('pending');

    // Verify it was saved correctly in database
    const todos = await db.select()
      .from(todosTable)
      .where(eq(todosTable.id, result.id))
      .execute();

    expect(todos[0].description).toEqual('Todo with "quotes" & special chars: @#$%');
  });

  it('should handle long descriptions', async () => {
    const longDescription = 'A'.repeat(1000); // 1000 character description
    const longInput: CreateTodoInput = {
      description: longDescription
    };

    const result = await createTodo(longInput);

    expect(result.description).toEqual(longDescription);
    expect(result.description.length).toBe(1000);
    expect(result.status).toEqual('pending');
  });

  it('should set created_at timestamp correctly', async () => {
    const beforeCreation = new Date();
    const result = await createTodo(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });
});