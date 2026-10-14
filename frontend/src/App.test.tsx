import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function response(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => vi.unstubAllGlobals())

  it('inicia sesión y muestra la cuenta autenticada', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(response({ message: 'No autenticado' }, 401))
      .mockResolvedValueOnce(response({ csrfToken: 'token-seguro' }))
      .mockResolvedValueOnce(response({ user: { id: 'u-1', email: 'ana@example.com', createdAt: '2026-01-01T00:00:00Z' } }))

    render(<App />)
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar a mi cuenta' }))

    expect(await screen.findByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Qué bueno verte.' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'http://localhost:3000/api/auth/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'x-csrf-token': 'token-seguro' }),
    }))
  })

  it('presenta un mensaje claro cuando las credenciales no son válidas', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(response({ message: 'No autenticado' }, 401))
      .mockResolvedValueOnce(response({ csrfToken: 'token-seguro' }))
      .mockResolvedValueOnce(response({ message: 'Credenciales inválidas' }, 401))

    render(<App />)
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Entrar a mi cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El correo o la contraseña no coinciden.')
  })

  it('valida campos antes de llamar a la API', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response({ message: 'No autenticado' }, 401))

    render(<App />)
    await screen.findByRole('heading', { name: 'Inicia sesión' })
    await user.click(screen.getByRole('button', { name: 'Entrar a mi cuenta' }))

    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
