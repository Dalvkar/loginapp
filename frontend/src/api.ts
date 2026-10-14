export interface User {
  id: string
  email: string
  createdAt: string
}

interface UserResponse {
  user: User
}

interface CsrfResponse {
  csrfToken: string
}

interface ErrorResponse {
  message?: string
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let message = 'No pudimos completar la solicitud. Inténtalo de nuevo.'

  try {
    const body = (await response.json()) as ErrorResponse
    if (body.message) message = body.message
  } catch {
    // Preserve the safe fallback when the response is not JSON.
  }

  return new ApiError(message, response.status)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
  })

  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function getCsrfToken(): Promise<string> {
  const { csrfToken } = await request<CsrfResponse>('/api/auth/csrf')
  return csrfToken
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { user } = await request<UserResponse>('/api/auth/me')
    return user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function login(email: string, password: string): Promise<User> {
  const csrfToken = await getCsrfToken()
  const { user } = await request<UserResponse>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  })
  return user
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken()
  await request<void>('/api/auth/logout', {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
  })
}
