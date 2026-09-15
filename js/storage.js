/**
 * StorageManager - Data access layer handling CRUD, Seed generation, and I/O.
 */
class StorageManager {
  static STORAGE_KEY = 'TASKFLOW_TASKS_DATA_V1';
  static STREAK_KEY = 'TASKFLOW_STREAK_METRICS_V1';
  static THEME_KEY = 'TASKFLOW_THEME_V1';

  /**
   * Initial seed tasks to showcase app features on first load
   */
  static DEFAULT_SEED = [
    {
      id: 'task-seed-1',
      title: 'Complete highly critical server migration',
      description: 'The legacy database cluster is reaching EOL. Need to migrate to the new PostgreSQL cloud instance immediately to avoid downtime.',
      priority: 'Urgent',
      category: 'DevOps',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      subtasks: [
        { id: 'st-1', title: 'Backup all user records', completed: true },
        { id: 'st-2', title: 'Test the failover mechanisms', completed: false },
        { id: 'st-3', title: 'Update DNS records', completed: false }
      ]
    },
    {
      id: 'task-seed-2',
      title: 'Finalize Light/Dark mode design system',
      description: 'Audit the contrast ratios and update Tailwind configuration to ensure both themes meet WCAG accessibility standards.',
      priority: 'High',
      category: 'Design',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      completed: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      subtasks: [
        { id: 'st-4', title: 'Ensure glass effects are visible in light mode', completed: true },
        { id: 'st-5', title: 'Update hover states for mobile', completed: false }
      ]
    },
    {
      id: 'task-seed-3',
      title: 'Prepare Q3 performance and analytics report',
      description: 'Compile the user retention metrics from the dashboard and format them into the executive review deck.',
      priority: 'Medium',
      category: 'Management',
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      completed: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      subtasks: []
    },
    {
      id: 'task-seed-4',
      title: 'Research WebGPU integrations for 3D graphics',
      description: 'Explore new capabilities in the WebGPU API to upgrade our rendering pipelines on the front-end.',
      priority: 'Low',
      category: 'Research',
      dueDate: '',
      completed: false,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      subtasks: [
        { id: 'st-6', title: 'Read the MDN WebGPU spec', completed: false }
      ]
    },
    {
      id: 'task-seed-5',
      title: 'Patch authentication vulnerability',
      description: 'Fixed the JWT token expiration bug where stale refresh tokens could still generate active sessions.',
      priority: 'Urgent',
      category: 'Security',
      dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      completed: true,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
      subtasks: [
        { id: 'st-7', title: 'Invalidate all existing tokens', completed: true },
        { id: 'st-8', title: 'Deploy hotfix patch', completed: true }
      ]
    }
  ];

  /**
   * Retrieve all raw task objects from localStorage
   */
  static getTasks() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      this.saveTasks(this.DEFAULT_SEED);
      return [...this.DEFAULT_SEED];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse storage tasks, resetting seed:', e);
      this.saveTasks(this.DEFAULT_SEED);
      return [...this.DEFAULT_SEED];
    }
  }

  /**
   * Commit tasks array to localStorage
   */
  static saveTasks(tasks) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
  }

  /**
   * Create and append a new task
   */
  static addTask(taskData) {
    const tasks = this.getTasks();
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: taskData.title.trim(),
      description: (taskData.description || '').trim(),
      priority: taskData.priority || 'Medium',
      category: (taskData.category || 'General').trim(),
      dueDate: taskData.dueDate || '',
      completed: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      subtasks: taskData.subtasks || []
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  /**
   * Update fields of an existing task by ID
   */
  static updateTask(id, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveTasks(tasks);
    return tasks[index];
  }

  /**
   * Toggle task completion flag
   */
  static toggleComplete(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return null;

    task.completed = !task.completed;
    if (task.completed) {
      this.recordActivityStreak();
    }
    this.saveTasks(tasks);
    return task;
  }

  /**
   * Toggle completion flag for a nested subtask
   */
  static toggleSubtaskComplete(taskId, subtaskId) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.subtasks) return null;

    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return null;

    subtask.completed = !subtask.completed;

    // Auto-complete main task if all subtasks are complete? Optional. Let's just toggle subtask.
    this.saveTasks(tasks);
    return task;
  }

  /**
   * Soft delete (moves task to Trash)
   */
  static softDeleteTask(id) {
    return this.updateTask(id, { isDeleted: true });
  }

  /**
   * Restore soft-deleted task from Trash
   */
  static restoreTask(id) {
    return this.updateTask(id, { isDeleted: false });
  }

  /**
   * Permanently eliminate task from storage
   */
  static permanentDeleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    this.saveTasks(tasks);
    return true;
  }

  /**
   * Empty all items in Trash
   */
  static emptyTrash() {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => !t.isDeleted);
    this.saveTasks(tasks);
  }

  /**
   * Duplicate an existing task
   */
  static duplicateTask(id) {
    const tasks = this.getTasks();
    const original = tasks.find(t => t.id === id);
    if (!original) return null;

    const clone = {
      ...original,
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: original.title + ' (Copy)',
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(clone);
    this.saveTasks(tasks);
    return clone;
  }

  /**
   * Generate metrics summary
   */
  static getMetrics() {
    const tasks = this.getTasks().filter(t => !t.isDeleted);
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = tasks.filter(t => !t.completed && t.dueDate === todayStr).length;

    const streakData = this.getStreak();

    return { total, completed, rate, dueToday, streak: streakData.streak };
  }

  /**
   * Daily streak tracking
   */
  static recordActivityStreak() {
    const today = new Date().toISOString().split('T')[0];
    const data = JSON.parse(localStorage.getItem(this.STREAK_KEY) || '{"lastActive":"","streak":1}');

    if (!data.lastActive) {
      data.lastActive = today;
      data.streak = 1;
    } else if (data.lastActive !== today) {
      const last = new Date(data.lastActive);
      const current = new Date(today);
      const diffDays = Math.round((current - last) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        data.streak += 1;
      } else if (diffDays > 1) {
        data.streak = 1;
      }
      data.lastActive = today;
    }
    localStorage.setItem(this.STREAK_KEY, JSON.stringify(data));
  }

  static getStreak() {
    return JSON.parse(localStorage.getItem(this.STREAK_KEY) || '{"lastActive":"","streak":1}');
  }

  /**
   * JSON Export & Import
   */
  static exportBackup() {
    const tasks = this.getTasks();
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.tasks)) {
        this.saveTasks(parsed.tasks);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  /**
   * Theme Preference
   */
  static getThemePreference() {
    return localStorage.getItem(this.THEME_KEY) || 'dark';
  }

  static setThemePreference(theme) {
    localStorage.setItem(this.THEME_KEY, theme);
  }
}
