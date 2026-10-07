export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError(
      'Cannot reach the store server. Check that the backend is running, then retry.',
      0,
    )
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message =
      typeof error.detail === 'string'
        ? error.detail
        : 'Please check your order and payment details.'
    throw new ApiError(message, response.status)
  }
  return response.json()
}
