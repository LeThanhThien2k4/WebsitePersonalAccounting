import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4000/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("Token gửi lên:", token); // kiểm tra
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
