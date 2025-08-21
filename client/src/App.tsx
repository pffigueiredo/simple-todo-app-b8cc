import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, CheckCircle2, Clock } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Todo, CreateTodoInput } from '../../server/src/schema';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load todos with proper memoization
  const loadTodos = useCallback(async () => {
    try {
      const result = await trpc.getTodos.query();
      setTodos(result);
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Create new todo
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoDescription.trim()) return;

    setIsCreating(true);
    try {
      const todoData: CreateTodoInput = {
        description: newTodoDescription.trim()
      };
      const newTodo = await trpc.createTodo.mutate(todoData);
      setTodos((prev: Todo[]) => [newTodo, ...prev]);
      setNewTodoDescription('');
    } catch (error) {
      console.error('Failed to create todo:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle todo status
  const handleToggleStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'pending' ? 'completed' : 'pending';
    
    try {
      const updatedTodo = await trpc.updateTodoStatus.mutate({
        id: todo.id,
        status: newStatus
      });
      
      setTodos((prev: Todo[]) =>
        prev.map((t: Todo) => t.id === todo.id ? updatedTodo : t)
      );
    } catch (error) {
      console.error('Failed to update todo status:', error);
    }
  };

  // Delete todo
  const handleDeleteTodo = async (todoId: number) => {
    try {
      await trpc.deleteTodo.mutate({ id: todoId });
      setTodos((prev: Todo[]) => prev.filter((t: Todo) => t.id !== todoId));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const completedCount = todos.filter((t: Todo) => t.status === 'completed').length;
  const pendingCount = todos.filter((t: Todo) => t.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ✨ Todo Manager
          </h1>
          <p className="text-gray-600">Stay organized and get things done!</p>
          
          {/* Stats */}
          <div className="flex justify-center gap-4 mt-4">
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
              <Clock className="w-3 h-3 mr-1" />
              {pendingCount} Pending
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {completedCount} Completed
            </Badge>
          </div>
        </div>

        {/* Add new todo form */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <form onSubmit={handleCreateTodo} className="flex gap-3">
              <Input
                placeholder="What needs to be done? 🤔"
                value={newTodoDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewTodoDescription(e.target.value)
                }
                className="flex-1 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400"
                disabled={isCreating}
              />
              <Button 
                type="submit" 
                disabled={isCreating || !newTodoDescription.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isCreating ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Todo list */}
        {todos.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No todos yet!
              </h3>
              <p className="text-gray-500">
                Add your first task above to get started on your productive journey.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todos.map((todo: Todo) => (
              <Card
                key={todo.id}
                className={`shadow-md border-0 transition-all duration-200 hover:shadow-lg ${
                  todo.status === 'completed'
                    ? 'bg-green-50/80 backdrop-blur-sm'
                    : 'bg-white/80 backdrop-blur-sm hover:bg-white/90'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={todo.status === 'completed'}
                      onCheckedChange={() => handleToggleStatus(todo)}
                      className="border-2 border-gray-300 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                    />
                    
                    <div className="flex-1">
                      <p
                        className={`font-medium transition-all duration-200 ${
                          todo.status === 'completed'
                            ? 'line-through text-gray-500'
                            : 'text-gray-800'
                        }`}
                      >
                        {todo.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {todo.created_at.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={todo.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          todo.status === 'completed'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }
                      >
                        {todo.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </>
                        )}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>✨ Made with React, TypeScript, and tRPC</p>
        </div>
      </div>
    </div>
  );
}

export default App;