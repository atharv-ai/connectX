import axios from "axios";

const rawApi = import.meta.env.VITE_API_URL;
const baseURL =
  typeof rawApi === "string" && rawApi.trim()
    ? rawApi.trim().replace(/\/+$/, "")
    : import.meta.env.DEV
      ? "http://localhost:3000/api"
      : "";

if (import.meta.env.PROD && !baseURL) {
  console.error(
    "[ConnectX] VITE_API_URL is not set. Configure it in Vercel (or .env) for production."
  );
}

const API = axios.create({
  baseURL: baseURL || undefined,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.token = token;
  }

  return config;
});

export default API;
