/**
 * Reads a request's JSON body, returning null when the body is missing or
 * malformed so routes can answer 400 instead of throwing.
 *
 * @example const body = await readJsonBody(request);
 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
