import axios, { AxiosInstance, AxiosResponse } from "axios";
import { getCookie, setCookie } from "cookies-next";
import { jwtDecode } from "jwt-decode";
import { JwtPayload } from "@/types/login";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL;

const getAccessToken = () => getCookie("access");
const getRefreshToken = () => getCookie("refresh");

const cookieOptions = {  
  sameSite: "lax" as const,
};

const axiosInstance: AxiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
});

if (getAccessToken()) {
  axiosInstance.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${getAccessToken()}`;
} else {
  axiosInstance.defaults.headers.common["Authorization"] = ``;
}


axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshResponse = await axios.post(`${baseUrl}refresh`, {
        refresh: getRefreshToken(),
      });

      const newAccessToken = refreshResponse.data.result.access;
      const newRefreshToken = refreshResponse.data.result.refresh;

      const decodedAccess: JwtPayload = jwtDecode(newAccessToken);
      setCookie("access", newAccessToken, {
        expires: new Date(decodedAccess.exp * 1000),
        ...cookieOptions,
      });

      const decodedRefresh: JwtPayload = jwtDecode(newRefreshToken);
      setCookie("refresh", newRefreshToken, {
        expires: new Date(decodedRefresh.exp * 1000),
        ...cookieOptions,
      });

      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${newAccessToken}`;

      return newAccessToken as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const DEACTIVATED_MESSAGE = "User is deactivated";

const forceLogout = (reason?: string) => {
  setCookie("access", "", { expires: new Date(0), ...cookieOptions });
  setCookie("refresh", "", { expires: new Date(0), ...cookieOptions });
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = reason ? `/login?reason=${reason}` : "/login";
  }
};

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.message === DEACTIVATED_MESSAGE) {
      forceLogout("deactivated");
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry && getRefreshToken()) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed", refreshError);
        const message = axios.isAxiosError(refreshError) ? refreshError.response?.data?.message : undefined;
        forceLogout(message === DEACTIVATED_MESSAGE ? "deactivated" : undefined);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
