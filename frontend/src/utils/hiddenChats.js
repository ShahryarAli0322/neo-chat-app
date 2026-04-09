const STORAGE_KEY = "hiddenChats";

export function getHiddenChatIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function addHiddenChat(chatId) {
  if (!chatId) return;
  const id = String(chatId);
  const next = getHiddenChatIds().filter((x) => x !== id);
  next.push(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeHiddenChat(chatId) {
  if (!chatId) return;
  const id = String(chatId);
  const next = getHiddenChatIds().filter((x) => x !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function filterChatsByHidden(chats, hiddenIds) {
  const hidden = new Set((hiddenIds || []).map(String));
  return (chats || []).filter((c) => c && !hidden.has(String(c._id)));
}
