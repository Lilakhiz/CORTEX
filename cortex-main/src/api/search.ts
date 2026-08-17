import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

export async function search(query: string) {
  const response = await api.post("/search", {
    query,
  });

  return response.data;
}