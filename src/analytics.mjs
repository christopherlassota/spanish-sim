export function createAnalyticsStore() {
  const events = [];

  function track(event, payload = {}) {
    events.push({
      event,
      payload,
      ts: new Date().toISOString()
    });
  }

  function summary() {
    const counts = events.reduce((acc, e) => {
      acc[e.event] = (acc[e.event] || 0) + 1;
      return acc;
    }, {});

    return {
      totalEvents: events.length,
      counts,
      recent: events.slice(-20)
    };
  }

  return { track, summary };
}
