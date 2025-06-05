import React, { useState } from 'react';
import { AppComponentProps } from '../../../types/app-framework';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { Trash2, Plus, Settings } from 'lucide-react';
import { JobManager } from '../JobManager';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export const TodoAppDashboard: React.FC<AppComponentProps> = ({ 
  appId, 
  config, 
  organization, 
  user 
}) => {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', title: 'Setup Todo App', completed: true, createdAt: new Date() },
    { id: '2', title: 'Add first todo item', completed: false, createdAt: new Date() },
  ]);
  const [newTodo, setNewTodo] = useState('');

  const addTodo = () => {
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        title: newTodo.trim(),
        completed: false,
        createdAt: new Date()
      };
      setTodos([todo, ...todos]);
      setNewTodo('');
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Todo Dashboard</h1>
          <p className="text-muted-foreground">
            Organization: {organization.name} | User: {user.username}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Todos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todos.length - completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Todo */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Todo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter todo title..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            />
            <Button onClick={addTodo}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Todo List */}
      <Card>
        <CardHeader>
          <CardTitle>Todo List</CardTitle>
          <CardDescription>
            Manage your todo items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No todos yet. Add one above!
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                  />
                  <div className="flex-1">
                    <div className={`${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {todo.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {todo.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>App ID:</strong> {appId}
            </div>
            <div>
              <strong>Configuration:</strong> {JSON.stringify(config)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TodoAppSettings: React.FC<AppComponentProps> = ({
  appId,
  config,
  organization
}) => {
  const [settings, setSettings] = useState({
    autoArchive: (config.autoArchive as boolean) || false,
    maxTodos: (config.maxTodos as number) || 100,
    reminderEnabled: (config.reminderEnabled as boolean) || false,
  });

  const saveSettings = () => {
    // In a real app, this would call a cloud function to save settings
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Todo App Settings</h1>
        <p className="text-muted-foreground">
          Configure your Todo app for {organization.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Configuration</CardTitle>
          <CardDescription>
            Customize how the Todo app behaves for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-archive completed todos</div>
              <div className="text-sm text-muted-foreground">
                Automatically archive todos after 30 days of completion
              </div>
            </div>
            <Checkbox
              checked={settings.autoArchive}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoArchive: !!checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium">Maximum todos per user</label>
            <Input
              type="number"
              value={settings.maxTodos}
              onChange={(e) => 
                setSettings(prev => ({ ...prev, maxTodos: parseInt(e.target.value) || 100 }))
              }
              className="w-32"
            />
            <div className="text-sm text-muted-foreground">
              Set to 0 for unlimited todos
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable reminders</div>
              <div className="text-sm text-muted-foreground">
                Send email reminders for overdue todos
              </div>
            </div>
            <Checkbox
              checked={settings.reminderEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, reminderEnabled: !!checked }))
              }
            />
          </div>

          <div className="pt-4">
            <Button onClick={saveSettings}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>App ID:</strong> {appId}
            </div>
            <div>
              <strong>Current Config:</strong> {JSON.stringify(config, null, 2)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Jobs Management */}
      <JobManager appId={appId} />
    </div>
  );
};