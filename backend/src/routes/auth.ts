import { Router, Request, Response } from 'express';
import { isAuthEnabled, login, verifyToken, extractToken } from '../services/authService';

const router = Router();

/**
 * GET /api/auth/status
 * Reports whether login protection is enabled. The frontend uses this to decide
 * whether to show the login page.
 */
router.get('/status', (req: Request, res: Response) => {
  const enabled = isAuthEnabled();
  // If auth is enabled, also tell the client whether they are currently
  // authenticated so the app can skip the login screen.
  const authenticated = !enabled || verifyToken(extractToken(req));
  res.json({ enabled, authenticated });
});

/**
 * POST /api/auth/login
 * Validates credentials and returns a session token.
 */
router.post('/login', (req: Request, res: Response) => {
  if (!isAuthEnabled()) {
    // Nothing to log in to.
    res.json({ enabled: false, token: null });
    return;
  }

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const token = login(username, password);
  if (!token) {
    // Small note: return 401 so the frontend can react to invalid credentials.
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  res.json({ enabled: true, token });
});

/**
 * POST /api/auth/logout
 * Tokens are stateless, so logout is handled client-side by discarding the
 * token. This endpoint exists for symmetry and returns success.
 */
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
