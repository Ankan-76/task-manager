<div align="center">
  <img src="./assets/favicon.svg" alt="TaskFlow Logo" width="80" />
  <h1>⚡ TaskFlow</h1>
  <p><strong>A Modern, High-Performance Task & Productivity Progressive Web App (PWA)</strong></p>
  
  <p>
    <a href="https://ankan-76.github.io/task-manager/" target="_blank"><strong>View Live Demo</strong></a> • 
    <a href="https://github.com/Ankan-76/task-manager" target="_blank"><strong>GitHub Repository</strong></a>
  </p>
  
  <p>
    <a href="#features">Features</a> • 
    <a href="#pwa-capabilities">PWA Capabilities</a> • 
    <a href="#tech-stack">Tech Stack</a> • 
    <a href="#getting-started">Getting Started</a> • 
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## 📖 Overview

**TaskFlow** is a production-grade, zero-dependency client-side task management Progressive Web App (PWA). Designed with a sleek dual **Light & Dark Glassmorphism** theme, it features smooth micro-interactions, full keyboard accessibility, offline-first execution, and instant `localStorage` persistence. The app comes pre-loaded with **5 built-in demo tasks** that dynamically demonstrate all features on your very first visit. Whether you are managing complex workloads on desktop or organizing day-to-day items on mobile, TaskFlow delivers an intuitive, installable, and frictionless experience.

---

## ✨ Key Features

- **📲 Full PWA Support:** Installable as a standalone app on Desktop (Windows, macOS, Linux) and Mobile (Android, iOS) with custom install prompts and app shortcuts.
- **⚡ 100% Offline-Ready:** Service Worker powered by a Stale-While-Revalidate caching engine ensures the entire application runs flawlessly even without an internet connection.
- **🌓 Dynamic Light/Dark Mode:** Seamlessly switch between a premium dark glassmorphism aesthetic and a high-contrast, polished light motif. Changes are animated smoothly and persisted instantly.
- **📱 Fully Responsive & Mobile-Polished:** Edge-to-edge layout with mobile notch safe-area support (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), pull-to-refresh control, and mobile navigation drawer.
- **🎉 Deep Micro-Interactions:** Enjoy fluid cubic bezier layout transitions, scale-in animations for modals, subtle UI hover states, and celebratory confetti upon task completion. 
- **✅ Comprehensive CRUD:**
  - Create tasks with detailed titles, descriptions, due dates, priority tiers (Urgent, High, Medium, Low), and category tags.
  - **Inline Subtask Dropdown:** Effortlessly manage project checkboxes instantly from the main view using interactive inline checklists.
  - Soft-delete functionality with an actionable "Undo" notification toast.
  - Instant task duplication and complete trash purging.
- **💾 Data Portability:** Fearless workflow persistence. You can securely back up your entire database to a JSON file and restore it effortlessly across devices.
- **🚀 Velocity Tracking:** Visual dashboards highlighting real-time completion progress, streak counting, and category distribution.
- **⚡ Zero Build Setup:** Runs natively in the browser using pure HTML5, modern Tailwind CSS (via CDN), and modular vanilla ES6+ JavaScript.

---

## 📱 Progressive Web App (PWA) Capabilities

TaskFlow complies with modern W3C PWA standards, delivering an experience indistinguishable from native applications:

| Feature | Details |
| :--- | :--- |
| **Display Mode** | `standalone` with `window-controls-overlay` fallback |
| **Caching Engine** | Service Worker with Stale-While-Revalidate for local shell + external CDNs |
| **Offline Indicator** | Real-time connection badge informing users of local-only changes |
| **Quick Shortcuts** | Instant deep links for `Add New Task`, `Today's Agenda`, and `Completed Tasks` |
| **Adaptive Icons** | Standard and Android-compliant maskable icons (192×192, 512×512) + Apple Touch Icon |
| **iOS Guidance** | Integrated 2-step helper modal for Safari users on iOS |

### How to Install

- **Desktop (Chrome / Edge / Brave):** Click the **Install App** button in the header toolbar, or click the install icon in your browser's address bar.
- **Android (Chrome):** Tap the **Install** button in the top bar or sidebar drawer, or choose *Add to Home screen* from the Chrome menu.
- **iOS / iPadOS (Safari):** Tap the **Share** button in Safari's bottom toolbar, scroll down, and select **Add to Home Screen**.

---

## 🛠️ Tech Stack

- **Structure:** HTML5 Semantic Elements & Web App Manifest (`manifest.webmanifest`)
- **Styling:** Tailwind CSS (via CDN) + Custom Glassmorphism, CSS Variables & Safe-Area Queries
- **Logic:** Vanilla JavaScript (ES6+), modularized into `app.js`, `storage.js`, and `ui.js`
- **Offline & Cache Engine:** Service Worker API (`sw.js`) & CacheStorage API
- **Icons:** [Lucide Icons](https://lucide.dev/) + Custom High-Resolution PWA Icon Suite
- **Storage:** Browser `localStorage` API with JSON backup/restore

---

## 🚀 Getting Started

Because TaskFlow does not rely on Node.js or heavy bundlers, spinning up the application locally is instant.

### Prerequisites

You just need a local HTTP web server. You can use Python, Node's `serve`, or the VS Code Live Server extension.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ankan-76/task-manager.git
   cd task-manager
   ```

2. **Serve the directory:**
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Or using Node's npx serve
   npx serve .
   ```

3. **Open the browser:** Navigate to `http://localhost:8000` (or the port generated by your server tool).

---

## 🏗️ Architecture & Philosophy

The philosophy behind TaskFlow is **"Speed, Aesthetics, and Reliability"**. 

1. **Client-Side First & Offline Reliability:** All operations happen instantaneously within the browser eliminating payload fetching times. The service worker caches all static assets and CDN dependencies so you can manage tasks completely offline.
2. **Glassmorphism Design:** Employs heavily customized tailwind configurations alongside backdrop-blurs to deliver a frosted glass UI that feels organic to both Dark (`#0B0F17`) and Light (`#f8fafc`) environments.
3. **Robust State Engine:** `storage.js` securely handles transactions, tracking, and daily productivity streaks entirely within bounds of the storage quota limits. State changes are cascaded immediately through the orchestrator found in `app.js` and rendered efficiently by `ui.js`.
4. **Lifecycle & Update Management:** The PWA architecture listens for service worker updates in the background and notifies the user with an actionable "Update" toast that reloads the cache seamlessly.

---

## 👨‍💻 Credits

Designed and developed by **[Ankan Biswas](https://ankan-76.github.io/portfolio/)**. 
<br/>
&copy; 2026 TaskFlow. All rights reserved.
