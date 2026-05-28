chrome.alarms.create('checkDeadlines', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(() => {
  chrome.storage.sync.get(['laterr_items'], ({ laterr_items = [] }) => {
    const today = new Date(); today.setHours(0,0,0,0);

    laterr_items.forEach(item => {
      if (!item.deadline) return;
      const due = new Date(item.deadline); due.setHours(0,0,0,0);
      const daysLeft = Math.round((due - today) / (1000*60*60*24));

      if (daysLeft === 1 || daysLeft === 0) {
        chrome.notifications.create(String(item.id), {
          type: 'basic',
          iconUrl: 'favicon-32x32.png',
          title: daysLeft === 0 ? '🐊 Due today!' : '🐊 Due tomorrow!',
          message: item.title,
          priority: 2
        });
      }
    });
  });
});