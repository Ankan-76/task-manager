/**
 * UIManager - High-fidelity DOM rendering, micro-interactions, modal management, and toasts.
 */
class UIManager {
  constructor() {
    this.taskContainer = document.getElementById('taskContainer');
    this.taskModal = document.getElementById('taskModal');
    this.backupModal = document.getElementById('backupModal');
    this.toastContainer = document.getElementById('toastContainer');
    this.subtasksList = document.getElementById('subtasksList');
    this.subtaskInput = document.getElementById('subtaskInput');

    this.tempSubtasks = [];
    this.currentLayout = 'list'; // 'list' | 'grid'
    this.expandedTaskIds = new Set();
  }

  /**
   * Render complete list of tasks
   */
  renderTasks(tasks, activeView = 'all') {
    this.taskContainer.innerHTML = '';

    if (this.currentLayout === 'grid') {
      this.taskContainer.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all min-h-[360px]';
    } else {
      this.taskContainer.className = 'flex flex-col gap-3 transition-all min-h-[360px]';
    }

    if (tasks.length === 0) {
      this.renderEmptyState(activeView);
      return;
    }

    tasks.forEach((task, index) => {
      const taskElement = this.createTaskCardElement(task, index);
      this.taskContainer.appendChild(taskElement);
    });

    // Refresh lucide icons for newly appended nodes
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Render single task card element
   */
  createTaskCardElement(task, index) {
    const article = document.createElement('article');
    const staggerClass = `stagger-${(index % 5) + 1}`;
    article.className = `glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 animate-slide-up ${staggerClass} ${task.completed ? 'task-completed opacity-70' : ''}`;
    article.dataset.id = task.id;

    // Priority Styling
    const priorityConfigs = {
      Urgent: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', label: 'Urgent' },
      High: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', label: 'High' },
      Medium: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Medium' },
      Low: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Low' }
    };
    const pConfig = priorityConfigs[task.priority] || priorityConfigs.Medium;

    // Due date formatting & urgency check
    let formattedDate = 'No date';
    let isOverdue = false;
    if (task.dueDate) {
      const due = new Date(task.dueDate + 'T00:00:00');
      formattedDate = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today && !task.completed) {
        isOverdue = true;
      }
    }

    // Subtask counts
    const totalSub = task.subtasks ? task.subtasks.length : 0;
    const completedSub = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

    article.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 flex-1 min-w-0">
          
          <!-- Checkbox Action -->
          ${!task.isDeleted ? `
            <button 
              type="button" 
              class="task-toggle-btn mt-0.5 w-5 h-5 rounded-lg border ${task.completed ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-violet-400 text-transparent'} flex items-center justify-center transition-all shrink-0 cursor-pointer"
              aria-label="Toggle task status"
              data-id="${task.id}"
            >
              <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
            </button>
          ` : `
            <div class="mt-0.5 text-rose-400">
              <i data-lucide="trash" class="w-4 h-4"></i>
            </div>
          `}

          <!-- Task Details -->
          <div class="flex-1 min-w-0">
            <h3 class="task-title-strike text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight break-words">
              ${this.escapeHTML(task.title)}
            </h3>
            ${task.description ? `
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                ${this.escapeHTML(task.description)}
              </p>
            ` : ''}
          </div>

        </div>

        <!-- Quick Actions dropdown / buttons -->
        <div class="flex items-center gap-1 shrink-0">
          ${!task.isDeleted ? `
            <button class="task-edit-btn p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition" title="Edit Task" data-id="${task.id}">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>
            <button class="task-copy-btn p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition" title="Duplicate Task" data-id="${task.id}">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            <button class="task-delete-btn p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition" title="Move to Trash" data-id="${task.id}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : `
            <button class="task-restore-btn px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs font-medium transition flex items-center gap-1" data-id="${task.id}">
              <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Restore
            </button>
            <button class="task-purge-btn p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition" title="Permanent Delete" data-id="${task.id}">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          `}
        </div>
      </div>

      <!-- Metadata Pill Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex flex-wrap items-center gap-2">
          
          <!-- Priority Pill -->
          <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${pConfig.bg} ${pConfig.text} border ${pConfig.border}">
            ${pConfig.label}
          </span>

          <!-- Category Pill -->
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            <i data-lucide="tag" class="w-3 h-3 text-violet-400"></i>
            ${this.escapeHTML(task.category)}
          </span>

          <!-- Subtasks counter -->
          ${totalSub > 0 ? `
            <button type="button" class="subtasks-toggle-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer" data-id="${task.id}">
              <i data-lucide="check-square" class="w-3 h-3 text-cyan-400"></i>
              <span>${completedSub}/${totalSub}</span>
              <i data-lucide="${this.expandedTaskIds.has(task.id) ? 'chevron-up' : 'chevron-down'}" class="w-3 h-3 text-slate-500 dark:text-slate-400"></i>
            </button>
          ` : ''}

        </div>

        <!-- Due Date -->
        ${task.dueDate ? `
          <div class="flex items-center gap-1 text-[11px] ${isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}">
            <i data-lucide="calendar" class="w-3 h-3 ${isOverdue ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}"></i>
            <span>${formattedDate} ${isOverdue ? '(Overdue)' : ''}</span>
          </div>
        ` : ''}
      </div>

      <!-- Subtasks Dropdown -->
      ${totalSub > 0 && this.expandedTaskIds.has(task.id) ? `
        <div class="mt-3 pt-3 border-t border-slate-200 dark:border-white/5 animate-fade-in subtasks-dropdown-container">
          <ul class="space-y-1.5 list-none m-0 p-0">
            ${task.subtasks.map(st => `
              <li class="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 transition-colors">
                <button type="button" class="inline-subtask-check w-4 h-4 rounded border ${st.completed ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-violet-400 outline-none'} flex items-center justify-center transition shrink-0" data-task-id="${task.id}" data-subtask-id="${st.id}">
                  <i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>
                </button>
                <span class="text-xs ${st.completed ? 'text-slate-400 line-through decoration-violet-500/50' : 'text-slate-700 dark:text-slate-200'}">
                  ${this.escapeHTML(st.title)}
                </span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    `;

    return article;
  }

  /**
   * Render visually appealing empty state
   */
  renderEmptyState(activeView) {
    const messages = {
      all: { title: 'No tasks on radar', desc: 'Add a new project deliverable above to kickstart your queue.' },
      today: { title: 'All cleared for today', desc: 'No tasks pending today. Great time to catch up or take a break.' },
      upcoming: { title: 'No upcoming deadlines', desc: 'Your schedule ahead is clear.' },
      completed: { title: 'No completed tasks yet', desc: 'Check off deliverables to see your victory list.' },
      trash: { title: 'Trash bin is empty', desc: 'Deleted tasks will appear here before permanent purge.' }
    };

    const info = messages[activeView] || messages.all;

    this.taskContainer.innerHTML = `
      <div class="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center my-auto animate-fade-in border-dashed border-white/10">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center mb-4 text-violet-400">
          <i data-lucide="inbox" class="w-8 h-8 stroke-[1.5]"></i>
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-white tracking-tight">${info.title}</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">${info.desc}</p>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  /**
   * Update category pill filters in the sidebar
   */
  renderCategoryPills(categories, activeTag = null) {
    const container = document.getElementById('categoriesTagContainer');
    const resetBtn = document.getElementById('clearTagFilterBtn');
    container.innerHTML = '';

    if (activeTag) {
      resetBtn.classList.remove('hidden');
    } else {
      resetBtn.classList.add('hidden');
    }

    if (categories.length === 0) {
      container.innerHTML = '<span class="text-xs text-slate-500 italic px-2">No categories yet</span>';
      return;
    }

    categories.forEach(cat => {
      const btn = document.createElement('button');
      const isActive = activeTag === cat;
      btn.type = 'button';
      btn.className = `tag-filter-btn px-2.5 py-1 rounded-lg text-xs font-medium transition ${isActive
        ? 'bg-violet-600 text-white font-semibold shadow-sm shadow-violet-500/30'
        : 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-slate-700/80 border border-slate-300/50 dark:border-white/5'
        }`;
      btn.dataset.category = cat;
      btn.textContent = cat;
      container.appendChild(btn);
    });
  }

  /**
   * Open Task Dialog for Create or Edit
   */
  openTaskModal(task = null) {
    const modalHeading = document.getElementById('modalHeading');
    const idInput = document.getElementById('taskIdInput');
    const titleInput = document.getElementById('taskTitle');
    const descInput = document.getElementById('taskDescription');
    const prioritySelect = document.getElementById('taskPriority');
    const categoryInput = document.getElementById('taskCategory');
    const dueDateInput = document.getElementById('taskDueDate');

    if (task) {
      modalHeading.textContent = 'Edit Task';
      idInput.value = task.id;
      titleInput.value = task.title;
      descInput.value = task.description || '';
      prioritySelect.value = task.priority;
      categoryInput.value = task.category;
      dueDateInput.value = task.dueDate || '';
      this.tempSubtasks = task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [];
    } else {
      modalHeading.textContent = 'Create New Task';
      idInput.value = '';
      titleInput.value = '';
      descInput.value = '';
      prioritySelect.value = 'Medium';
      categoryInput.value = 'General';
      dueDateInput.value = '';
      this.tempSubtasks = [];
    }

    this.renderSubtaskChecklist();
    this.taskModal.showModal();
    titleInput.focus();

    if (window.lucide) window.lucide.createIcons();
  }

  closeTaskModal() {
    this.taskModal.close();
  }

  /**
   * Subtask builder items inside modal
   */
  renderSubtaskChecklist() {
    this.subtasksList.innerHTML = '';
    this.tempSubtasks.forEach((st, idx) => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-200';
      li.innerHTML = `
        <span class="truncate flex-1">${this.escapeHTML(st.title)}</span>
        <button type="button" class="remove-subtask-btn text-slate-400 hover:text-rose-400 p-1" data-index="${idx}">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      `;
      this.subtasksList.appendChild(li);
    });
    if (window.lucide) window.lucide.createIcons();
  }

  addSubtaskItem(title) {
    if (!title.trim()) return;
    this.tempSubtasks.push({
      id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title: title.trim(),
      completed: false
    });
    this.subtaskInput.value = '';
    this.renderSubtaskChecklist();
  }

  removeSubtaskItem(index) {
    this.tempSubtasks.splice(index, 1);
    this.renderSubtaskChecklist();
  }

  /**
   * Actionable Toast notification system
   */
  showToast(message, type = 'info', actionCallback = null, actionLabel = 'Undo') {
    const toast = document.createElement('div');
    toast.className = 'glass-panel border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-4 text-xs font-medium text-slate-800 dark:text-slate-100 pointer-events-auto animate-scale-in max-w-sm';

    const iconMap = {
      success: '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>',
      info: '<i data-lucide="info" class="w-4 h-4 text-cyan-400"></i>',
      warning: '<i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400"></i>'
    };

    toast.innerHTML = `
      <div class="flex items-center gap-2.5">
        ${iconMap[type] || iconMap.info}
        <span>${this.escapeHTML(message)}</span>
      </div>
    `;

    if (actionCallback) {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'px-2 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] transition';
      actionBtn.textContent = actionLabel;
      actionBtn.onclick = () => {
        actionCallback();
        toast.remove();
      };
      toast.appendChild(actionBtn);
    }

    this.toastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  /**
   * Confetti celebration burst
   */
  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899']
      });
    }
  }

  /**
   * HTML sanitization helper
   */
  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}
