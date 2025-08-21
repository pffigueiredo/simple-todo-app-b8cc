import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { todosTable } from '../db/schema';
import { getTodos } from '../handlers/get_todos';

describe('getTodos', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no todos exist', async () => {
    const result = await getTodos();

    expect(result).toEqual([]);
  });

  it('should fetch all todos from database', async () => {
    // Insert test todos
    await db.insert(todosTable)
      .values([
        {
          description: 'First todo',
          status: 'pending'
        },
        {
          description: 'Second todo', 
          status: 'completed'
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    
    // Check that all expected fields are present
    result.forEach(todo => {
      expect(todo.id).toBeDefined();
      expect(todo.description).toBeDefined();
      expect(todo.status).toMatch(/^(pending|completed)$/);
      expect(todo.created_at).toBeInstanceOf(Date);
    });

    // Check specific todo content
    const descriptions = result.map(todo => todo.description);
    expect(descriptions).toContain('First todo');
    expect(descriptions).toContain('Second todo');
  });

  it('should return todos ordered by creation date (newest first)', async () => {
    // Insert todos with slight delay to ensure different timestamps
    await db.insert(todosTable)
      .values({
        description: 'Older todo',
        status: 'pending'
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(todosTable)
      .values({
        description: 'Newer todo',
        status: 'completed'
      })
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    expect(result[0].description).toEqual('Newer todo');
    expect(result[1].description).toEqual('Older todo');
    
    // Verify ordering by timestamp
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle different todo statuses correctly', async () => {
    // Insert todos with different statuses
    await db.insert(todosTable)
      .values([
        {
          description: 'Pending task',
          status: 'pending'
        },
        {
          description: 'Completed task',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(2);
    
    const statuses = result.map(todo => todo.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('completed');
  });

  it('should handle large number of todos efficiently', async () => {
    // Create multiple todos
    const todoValues = Array.from({ length: 50 }, (_, i) => ({
      description: `Todo ${i + 1}`,
      status: i % 2 === 0 ? 'pending' as const : 'completed' as const
    }));

    await db.insert(todosTable)
      .values(todoValues)
      .execute();

    const result = await getTodos();

    expect(result).toHaveLength(50);
    
    // Verify all todos are returned with correct structure
    result.forEach((todo, index) => {
      expect(todo.id).toBeDefined();
      expect(todo.description).toMatch(/^Todo \d+$/);
      expect(['pending', 'completed']).toContain(todo.status);
      expect(todo.created_at).toBeInstanceOf(Date);
    });

    // Verify ordering by checking that todos are sorted by created_at desc
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }

    // Verify that all expected descriptions are present
    const descriptions = result.map(todo => todo.description);
    for (let i = 1; i <= 50; i++) {
      expect(descriptions).toContain(`Todo ${i}`);
    }
  });
});