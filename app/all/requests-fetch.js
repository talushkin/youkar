// Fetch requests data for a given videoId from the cdn-links API (which already includes requests info)
export async function fetchRequestsData(videoId) {
  try {
    const res = await fetch(`/api/cdn-links?videoId=${encodeURIComponent(videoId)}`);
    if (!res.ok) return { count: 0, data: [] };
    const json = await res.json();
    return {
      count: typeof json.requestsCount === 'number' ? json.requestsCount : 0,
      data: Array.isArray(json.requests) ? json.requests : []
    };
  } catch {
    return { count: 0, data: [] };
  }
}
