const { authorize } = require('../middleware/authorize');

const mockRes = () => ({});

describe('RBAC', () => {
  test('unauthorized SALES_USER cannot perform ADMIN-only inventory or confirm operations', () => {
    const middleware = authorize('ADMIN');
    const req = { user: { id: 'u1', role: 'SALES_USER' } };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
    expect(error.message).toMatch(/role/i);
  });

  test('ADMIN is allowed through ADMIN-only middleware', () => {
    const middleware = authorize('ADMIN');
    const req = { user: { id: 'u1', role: 'ADMIN' } };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
