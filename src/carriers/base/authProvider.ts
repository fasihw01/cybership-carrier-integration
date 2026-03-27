// Decoupled so each carrier can have its own auth strategy
export interface AuthProvider {
  getAccessToken(): Promise<string>;
}
