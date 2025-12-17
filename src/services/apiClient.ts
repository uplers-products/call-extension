import axios, { type AxiosResponse, type AxiosError } from 'axios';
import type { ApiResponse } from '../types/common.types';

// Create axios instance
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  try {
    const result = await chrome.storage.local.get(['recruiter_user_token']);
    const token = result.recruiter_user_token as string;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    console.error('API Error:', error);
    
    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401) {
      handleLogout();
    }
    
    return Promise.reject(error);
  }
);

// Logout handler
export const handleLogout = async () => {
  try {
    await chrome.storage.local.remove(['recruiter_user_token', 'ra_user']);
    console.log('User logged out due to auth failure');
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

// GET request wrapper
export const GET = async <T = unknown>(url: string): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.get<T>(url);
    return {
      status: response.status,
      data: response.data,
      message: (response.data as any)?.message,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      status: axiosError.response?.status || 500,
      message: (axiosError.response?.data as any)?.message || axiosError.message,
      data: axiosError.response?.data,
    };
  }
};

// POST request wrapper
export const POST = async <T = unknown>(url: string, payload: object): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.post<T>(url, payload);
    return {
      status: response.status,
      data: response.data,
      message: (response.data as any)?.message,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      status: axiosError.response?.status || 500,
      message: (axiosError.response?.data as any)?.message || axiosError.message,
      data: axiosError.response?.data,
    };
  }
};

// PUT request wrapper
export const PUT = async <T = unknown>(url: string, payload: object): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.put<T>(url, payload);
    return {
      status: response.status,
      data: response.data,
      message: (response.data as any)?.message,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      status: axiosError.response?.status || 500,
      message: (axiosError.response?.data as any)?.message || axiosError.message,
      data: axiosError.response?.data,
    };
  }
};

// DELETE request wrapper
export const DELETE = async <T = unknown>(url: string, payload?: object): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.delete<T>(url, { data: payload });
    return {
      status: response.status,
      data: response.data,
      message: (response.data as any)?.message,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    throw {
      status: axiosError.response?.status || 500,
      message: (axiosError.response?.data as any)?.message || axiosError.message,
      data: axiosError.response?.data,
    };
  }
};

export default apiClient;
