export function createAnalyticsStore() {
  const events = [];

  function countBy(list, getKey) {
    return list.reduce((acc, item) => {
      const key = getKey(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

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
    const fallbackEvents = events.filter(e => e.event === "assistant_fallback");

    return {
      totalEvents: events.length,
      counts,
      fallbacks: {
        total: fallbackEvents.length,
        byProvider: countBy(fallbackEvents, e => String(e.payload.provider || "unknown")),
        byScenario: countBy(fallbackEvents, e => String(e.payload.scenarioId || "unknown")),
        byReason: countBy(fallbackEvents, e => String(e.payload.reason || "unknown"))
      },
      recent: events.slice(-20)
    };
  }

  return { track, summary };
}
