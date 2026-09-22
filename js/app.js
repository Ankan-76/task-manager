/**
 * Application Orchestrator - State machine, routing, search debouncing, and event binding.
 */
document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIManager();

  // App State
  let currentView = 'all'; // 'all' | 'today' | 'upcoming' | 'completed' | 'trash'
  let currentPriorityFilter = 'ALL';
  let currentCategoryFilter = null;
  let currentSearchQuery = '';
  let currentSort = 'createdAt_desc';

  // Elements
  const globalSearchInput = document.getElementById('globalSearchInput');
  const priorityFilterSelect = document.getElementById('priorityFilterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const viewListBtn = document.getElementById('viewListBtn');
  const viewGridBtn = document.getElementById('viewGridBtn');
  const emptyTrashBtn = document.getElementById('emptyTrashBtn');
  const taskForm = document.getElementById('taskForm');
  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  const subtaskInput = document.getElementById('subtaskInput');
  const openNewTaskModalBtn = document.getElementById('openNewTaskModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');

  // Mobile drawer elements
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const closeMobileSidebar = document.getElementById('closeMobileSidebar');
  const sidebar = document.getElementById('sidebar');
  const mobileSidebarBackdrop = document.getElementById('mobileSidebarBackdrop');

  // Backup modal elements
  const backupTriggerBtn = document.getElementById('backupTriggerBtn');
  const backupModal = document.getElementById('backupModal');
  const closeBackupModalBtn = document.getElementById('closeBackupModalBtn');
  const exportDataBtn = document.getElementById('exportDataBtn');
  const importFileInput = document.getElementById('importFileInput');
  const clearTagFilterBtn = document.getElementById('clearTagFilterBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  // Initialize Theme
  const initializeTheme = () => {
    const currentTheme = StorageManager.getThemePreference();
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (currentTheme === 'light') {
      document.documentElement.classList.remove('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    } else {
      document.documentElement.classList.add('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0B0F17');
    }
  };
  initializeTheme();

  /**
   * Central render pipeline with filtering & sorting
   */
  function refreshWorkspace() {
    let tasks = StorageManager.getTasks();

    // 1. View Routing
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentView === 'trash') {
      tasks = tasks.filter(t => t.isDeleted);
    } else {
      tasks = tasks.filter(t => !t.isDeleted);
      if (currentView === 'today') {
        tasks = tasks.filter(t => t.dueDate === todayStr);
      } else if (currentView === 'upcoming') {
        tasks = tasks.filter(t => t.dueDate && t.dueDate > todayStr);
      } else if (currentView === 'completed') {
        tasks = tasks.filter(t => t.completed);
      }
    }

    // 2. Priority Filter
    if (currentPriorityFilter !== 'ALL') {
      tasks = tasks.filter(t => t.priority === currentPriorityFilter);
    }

    // 3. Category Tag Filter
    if (currentCategoryFilter) {
      tasks = tasks.filter(t => t.category.toLowerCase() === currentCategoryFilter.toLowerCase());
    }

    // 4. Search Filter
    if (currentSearchQuery.trim()) {
      const q = currentSearchQuery.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // 5. Sorting
    tasks.sort((a, b) => {
      if (currentSort === 'dueDate_asc') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (currentSort === 'priority_desc') {
        const weights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority] || 0) - (weights[a.priority] || 0);
      }
      if (currentSort === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      // Default: createdAt_desc
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Render cards
    ui.renderTasks(tasks, currentView);

    // Update metrics and badges
    updateMetricsAndBadges(tasks.length);
  }

  /**
   * Update badge counts, navigation tabs, and productivity velocity
   */
  function updateMetricsAndBadges(currentFilteredCount) {
    const allRaw = StorageManager.getTasks();
    const todayStr = new Date().toISOString().split('T')[0];

    const activeTotal = allRaw.filter(t => !t.isDeleted);
    const countAll = activeTotal.length;
    const countToday = activeTotal.filter(t => t.dueDate === todayStr).length;
    const countUpcoming = activeTotal.filter(t => t.dueDate && t.dueDate > todayStr).length;
    const countCompleted = activeTotal.filter(t => t.completed).length;
    const countTrash = allRaw.filter(t => t.isDeleted).length;

    document.getElementById('countAll').textContent = countAll;
    document.getElementById('countToday').textContent = countToday;
    document.getElementById('countUpcoming').textContent = countUpcoming;
    document.getElementById('countCompleted').textContent = countCompleted;
    document.getElementById('countTrash').textContent = countTrash;

    document.getElementById('activeTasksBadge').textContent = `${currentFilteredCount} Item${currentFilteredCount === 1 ? '' : 's'}`;

    // Update Velocity and Streak
    const metrics = StorageManager.getMetrics();
    document.getElementById('completionRateText').textContent = `${metrics.rate}%`;
    document.getElementById('completionProgressBar').style.width = `${metrics.rate}%`;
    document.getElementById('completedVsTotalText').textContent = `${metrics.completed} / ${metrics.total} Done`;
    document.getElementById('streakCount').textContent = `${metrics.streak} Day Streak`;

    // Render Categories
    const categories = [...new Set(activeTotal.map(t => t.category).filter(Boolean))];
    ui.renderCategoryPills(categories, currentCategoryFilter);

    // Trash button visibility
    if (currentView === 'trash' && countTrash > 0) {
      emptyTrashBtn.classList.remove('hidden');
      emptyTrashBtn.classList.add('flex');
    } else {
      emptyTrashBtn.classList.add('hidden');
      emptyTrashBtn.classList.remove('flex');
    }
  }

  // ================= Event Routing & Interactions =================

  // Navigation tab click
  document.getElementById('navigationTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-tab-btn');
    if (!btn) return;

    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.remove('active');
    });

    btn.classList.add('active');

    currentView = btn.dataset.view;

    // Update headers
    const viewHeadings = {
      all: { title: 'All Tasks', sub: 'Review, execute and organize all ongoing deliverables.' },
      today: { title: 'Due Today', sub: 'Tasks that demand your direct attention before end of day.' },
      upcoming: { title: 'Upcoming Pipeline', sub: 'Scheduled deliverables for the upcoming days.' },
      completed: { title: 'Completed Archives', sub: 'Successfully checked off deliverables.' },
      trash: { title: 'Trash Bin', sub: 'Soft-deleted tasks awaiting permanent purge or restoration.' }
    };
    const info = viewHeadings[currentView] || viewHeadings.all;
    document.getElementById('activeViewTitle').textContent = info.title;
    document.getElementById('activeViewSubtitle').textContent = info.sub;

    closeSidebarDrawer();
    refreshWorkspace();
  });

  // Category Pill Filter Click
  document.getElementById('categoriesTagContainer').addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-filter-btn');
    if (!btn) return;
    const cat = btn.dataset.category;
    currentCategoryFilter = currentCategoryFilter === cat ? null : cat;
    refreshWorkspace();
  });

  clearTagFilterBtn.addEventListener('click', () => {
    currentCategoryFilter = null;
    refreshWorkspace();
  });

  // Debounced Search Input
  let debounceTimeout;
  globalSearchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      currentSearchQuery = e.target.value;
      refreshWorkspace();
    }, 150);
  });

  // Priority and Sort selects
  priorityFilterSelect.addEventListener('change', (e) => {
    currentPriorityFilter = e.target.value;
    refreshWorkspace();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    refreshWorkspace();
  });

  // Layout Toggles
  viewListBtn.addEventListener('click', () => {
    ui.currentLayout = 'list';
    viewListBtn.classList.add('bg-white/10', 'text-white');
    viewGridBtn.classList.remove('bg-white/10', 'text-white');
    refreshWorkspace();
  });

  viewGridBtn.addEventListener('click', () => {
    ui.currentLayout = 'grid';
    viewGridBtn.classList.add('bg-white/10', 'text-white');
    viewListBtn.classList.remove('bg-white/10', 'text-white');
    refreshWorkspace();
  });

  // Delegated Task Container Clicks
  document.getElementById('taskContainer').addEventListener('click', (e) => {
    // 0. Toggle Subtasks Dropdown
    const subtaskToggleBtn = e.target.closest('.subtasks-toggle-btn');
    if (subtaskToggleBtn) {
      const id = subtaskToggleBtn.dataset.id;
      if (ui.expandedTaskIds.has(id)) {
        ui.expandedTaskIds.delete(id);
      } else {
        ui.expandedTaskIds.add(id);
      }
      refreshWorkspace();
      return;
    }

    // 0.1 Check inline subtask
    const inlineSubcheck = e.target.closest('.inline-subtask-check');
    if (inlineSubcheck) {
      const taskId = inlineSubcheck.dataset.taskId;
      const subtaskId = inlineSubcheck.dataset.subtaskId;
      StorageManager.toggleSubtaskComplete(taskId, subtaskId);
      refreshWorkspace();
      return;
    }

    // 1. Toggle Complete
    const toggleBtn = e.target.closest('.task-toggle-btn');
    if (toggleBtn) {
      const id = toggleBtn.dataset.id;
      const task = StorageManager.toggleComplete(id);
      if (task && task.completed) {
        ui.triggerConfetti();
        ui.showToast('Task marked complete! Keep the momentum.', 'success');
      }
      refreshWorkspace();
      return;
    }

    // 2. Edit Task
    const editBtn = e.target.closest('.task-edit-btn');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const tasks = StorageManager.getTasks();
      const task = tasks.find(t => t.id === id);
      if (task) ui.openTaskModal(task);
      return;
    }

    // 3. Duplicate Task
    const copyBtn = e.target.closest('.task-copy-btn');
    if (copyBtn) {
      const id = copyBtn.dataset.id;
      StorageManager.duplicateTask(id);
      ui.showToast('Task duplicated successfully.', 'info');
      refreshWorkspace();
      return;
    }

    // 4. Soft Delete Task
    const deleteBtn = e.target.closest('.task-delete-btn');
    if (deleteBtn) {
      const id = deleteBtn.dataset.id;
      StorageManager.softDeleteTask(id);
      ui.showToast('Task moved to Trash.', 'warning', () => {
        StorageManager.restoreTask(id);
        refreshWorkspace();
      }, 'Undo');
      refreshWorkspace();
      return;
    }

    // 5. Restore Task
    const restoreBtn = e.target.closest('.task-restore-btn');
    if (restoreBtn) {
      const id = restoreBtn.dataset.id;
      StorageManager.restoreTask(id);
      ui.showToast('Task restored to active queue.', 'info');
      refreshWorkspace();
      return;
    }

    // 6. Purge Task
    const purgeBtn = e.target.closest('.task-purge-btn');
    if (purgeBtn) {
      const id = purgeBtn.dataset.id;
      if (confirm('Permanently delete this task? This cannot be undone.')) {
        StorageManager.permanentDeleteTask(id);
        ui.showToast('Task permanently purged.', 'info');
        refreshWorkspace();
      }
      return;
    }
  });

  // Empty Trash Action
  emptyTrashBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to permanently erase all trashed items?')) {
      StorageManager.emptyTrash();
      ui.showToast('Trash cleared.', 'info');
      refreshWorkspace();
    }
  });

  // Modal Open/Close Triggers
  openNewTaskModalBtn.addEventListener('click', () => ui.openTaskModal());
  closeModalBtn.addEventListener('click', () => ui.closeTaskModal());
  cancelModalBtn.addEventListener('click', () => ui.closeTaskModal());

  // Subtask Builder Inside Modal
  addSubtaskBtn.addEventListener('click', () => {
    ui.addSubtaskItem(subtaskInput.value);
  });
  subtaskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ui.addSubtaskItem(subtaskInput.value);
    }
  });
  document.getElementById('subtasksList').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-subtask-btn');
    if (btn) {
      const index = parseInt(btn.dataset.index, 10);
      ui.removeSubtaskItem(index);
    }
  });

  // Modal Form Submission
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('taskIdInput').value;
    const taskData = {
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      priority: document.getElementById('taskPriority').value,
      category: document.getElementById('taskCategory').value || 'General',
      dueDate: document.getElementById('taskDueDate').value,
      subtasks: ui.tempSubtasks
    };

    if (id) {
      StorageManager.updateTask(id, taskData);
      ui.showToast('Task updated successfully.', 'success');
    } else {
      StorageManager.addTask(taskData);
      ui.showToast('New task initialized.', 'success');
    }

    ui.closeTaskModal();
    refreshWorkspace();
  });

  // Backup & Portability Actions
  backupTriggerBtn.addEventListener('click', () => backupModal.showModal());
  closeBackupModalBtn.addEventListener('click', () => backupModal.close());
  exportDataBtn.addEventListener('click', () => {
    StorageManager.exportBackup();
    backupModal.close();
    ui.showToast('Backup archive exported.', 'success');
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const success = StorageManager.importBackup(evt.target.result);
      backupModal.close();
      if (success) {
        ui.showToast('Tasks database restored successfully!', 'success');
        refreshWorkspace();
      } else {
        ui.showToast('Invalid JSON file schema.', 'warning');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  });

  // Mobile Drawer Open / Close
  function openSidebarDrawer() {
    sidebar.classList.remove('-translate-x-full');
    mobileSidebarBackdrop.classList.remove('hidden');
  }

  function closeSidebarDrawer() {
    sidebar.classList.add('-translate-x-full');
    mobileSidebarBackdrop.classList.add('hidden');
  }

  mobileMenuToggle.addEventListener('click', openSidebarDrawer);
  closeMobileSidebar.addEventListener('click', closeSidebarDrawer);
  mobileSidebarBackdrop.addEventListener('click', closeSidebarDrawer);

  // Theme Toggle Button Logic
  themeToggleBtn.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (htmlEl.classList.contains('dark')) {
      htmlEl.classList.remove('dark');
      StorageManager.setThemePreference('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#f8fafc');
    } else {
      htmlEl.classList.add('dark');
      StorageManager.setThemePreference('dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0B0F17');
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Focus search on "/" keypress when not already typing in an input
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      globalSearchInput.focus();
    }
    // Close modals on Escape
    if (e.key === 'Escape') {
      if (ui.taskModal.open) ui.closeTaskModal();
      if (backupModal.open) backupModal.close();
      const iosModal = document.getElementById('iosInstallModal');
      if (iosModal && iosModal.open) iosModal.close();
      closeSidebarDrawer();
    }
  });

  /**
   * ==========================================================================
   * Progressive Web App (PWA) Architecture & Lifecycle Orchestrator
   * ==========================================================================
   */
  function initializePWA() {
    let deferredPrompt = null;
    const pwaInstallHeaderBtn = document.getElementById('pwaInstallHeaderBtn');
    const mobileInstallCard = document.getElementById('mobileInstallCard');
    const mobileInstallBtn = document.getElementById('mobileInstallBtn');
    const networkStatusBadge = document.getElementById('networkStatusBadge');

    const iosInstallModal = document.getElementById('iosInstallModal');
    const closeIosInstallModalBtn = document.getElementById('closeIosInstallModalBtn');
    const dismissIosInstallModalBtn = document.getElementById('dismissIosInstallModalBtn');

    // Detect if app is running in standalone display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    // Detect iOS devices
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Setup iOS Modal Handlers
    if (iosInstallModal) {
      if (closeIosInstallModalBtn) {
        closeIosInstallModalBtn.addEventListener('click', () => iosInstallModal.close());
      }
      if (dismissIosInstallModalBtn) {
        dismissIosInstallModalBtn.addEventListener('click', () => iosInstallModal.close());
      }
    }

    // 1. Service Worker Registration & Lifecycle
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration.scope);

            // Check for service worker updates
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New version available! Prompt user to refresh
                    ui.showToast('New version of TaskFlow available!', 'info', () => {
                      installingWorker.postMessage({ type: 'SKIP_WAITING' });
                    }, 'Update');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      });
    }

    // 2. Install Prompt (beforeinstallprompt) Handling
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      deferredPrompt = e;

      // Only show install buttons if not already in standalone mode
      if (!isStandalone) {
        if (pwaInstallHeaderBtn) {
          pwaInstallHeaderBtn.classList.remove('hidden');
          pwaInstallHeaderBtn.classList.add('inline-flex', 'pwa-pulse');
        }
        if (mobileInstallCard) {
          mobileInstallCard.classList.remove('hidden');
        }
        if (window.lucide) window.lucide.createIcons();
      }
    });

    const triggerInstallFlow = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User response to install prompt:', outcome);
        if (outcome === 'accepted') {
          ui.showToast('TaskFlow installed successfully!', 'success');
          hideInstallUI();
        }
        deferredPrompt = null;
      } else if (isIos && !isStandalone && iosInstallModal) {
        iosInstallModal.showModal();
        if (window.lucide) window.lucide.createIcons();
      } else {
        ui.showToast('To install, use your browser\'s "Install App" or "Add to Home Screen" option.', 'info');
      }
    };

    function hideInstallUI() {
      if (pwaInstallHeaderBtn) {
        pwaInstallHeaderBtn.classList.add('hidden');
        pwaInstallHeaderBtn.classList.remove('inline-flex', 'pwa-pulse');
      }
      if (mobileInstallCard) {
        mobileInstallCard.classList.add('hidden');
      }
    }

    if (pwaInstallHeaderBtn) {
      pwaInstallHeaderBtn.addEventListener('click', triggerInstallFlow);
    }
    if (mobileInstallBtn) {
      mobileInstallBtn.addEventListener('click', triggerInstallFlow);
    }

    // iOS Safari fallback trigger if on iOS and not standalone
    if (isIos && !isStandalone) {
      if (pwaInstallHeaderBtn) {
        pwaInstallHeaderBtn.classList.remove('hidden');
        pwaInstallHeaderBtn.classList.add('inline-flex');
      }
      if (mobileInstallCard) {
        mobileInstallCard.classList.remove('hidden');
      }
      if (window.lucide) window.lucide.createIcons();
    }

    // 3. Track App Installed Event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App was successfully installed');
      hideInstallUI();
      ui.showToast('Welcome to TaskFlow App!', 'success');
      deferredPrompt = null;
    });

    // 4. Online / Offline Connectivity Detection
    function updateNetworkStatus(online) {
      if (!networkStatusBadge) return;

      if (!online) {
        networkStatusBadge.classList.remove('hidden');
        networkStatusBadge.classList.add('flex');
        networkStatusBadge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="text-[11px] tracking-tight">Offline Mode</span>
        `;
        networkStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/25 backdrop-blur-md transition-all duration-300';
        ui.showToast('Working offline. Changes are saved locally on your device.', 'warning');
      } else {
        networkStatusBadge.innerHTML = `
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span class="text-[11px] tracking-tight text-emerald-400">Back Online</span>
        `;
        networkStatusBadge.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 backdrop-blur-md transition-all duration-300';
        ui.showToast('You are back online!', 'success');
        setTimeout(() => {
          if (navigator.onLine) {
            networkStatusBadge.classList.add('hidden');
            networkStatusBadge.classList.remove('flex');
          }
        }, 3500);
      }
    }

    window.addEventListener('online', () => updateNetworkStatus(true));
    window.addEventListener('offline', () => updateNetworkStatus(false));

    // Initial check
    if (!navigator.onLine) {
      updateNetworkStatus(false);
    }

    // 5. PWA Shortcuts & Deep Link Parameter Handling
    const urlParams = new URLSearchParams(window.location.search);
    const actionParam = urlParams.get('action');
    const viewParam = urlParams.get('view');

    if (actionParam === 'new-task') {
      setTimeout(() => {
        ui.openTaskModal();
      }, 300);
      history.replaceState({}, document.title, window.location.pathname);
    } else if (viewParam && ['all', 'today', 'upcoming', 'completed', 'trash'].includes(viewParam)) {
      currentView = viewParam;
      document.querySelectorAll('#navigationTabs button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === currentView);
      });
      refreshWorkspace();
      history.replaceState({}, document.title, window.location.pathname);
    }
  }

  // Bootstrapping Initial Render & PWA
  refreshWorkspace();
  initializePWA();
});

