// Offline queueing for kiosk attendance scans using localStorage
(function () {
  const QUEUE_KEY = 'ibms-attendance-queue';

  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

  function enqueue(item) {
    const q = loadQueue();
    q.push(Object.assign({ id: Date.now() }, item));
    saveQueue(q);
  }

  async function flushQueue() {
    const q = loadQueue();
    if (!q.length) return;
    const remaining = [];
    for (const item of q) {
      try {
        const res = await ibmsFetch('/api/attendance/scan', {
          method: 'POST', body: JSON.stringify(item)
        });
        if (!res.ok) throw new Error('sync-failed');
      } catch (e) {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
  }

  window.IbmsAttendanceQueue = { enqueue, flushQueue, loadQueue };

  window.addEventListener('online', () => { flushQueue(); });
  // Try to flush periodically
  setInterval(() => { if (navigator.onLine) flushQueue(); }, 30_000);
})();
