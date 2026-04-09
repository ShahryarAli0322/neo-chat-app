import axios from "axios";

function getStoredUserInfo() {
  try {
    const raw = localStorage.getItem("userInfo");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

axios.interceptors.request.use((config) => {
  const userInfo = getStoredUserInfo();
  if (userInfo?.token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${userInfo.token}`;
  }
  return config;
});
