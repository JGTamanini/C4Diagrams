jest.mock('../../src/config/database', () => ({ testConnection: jest.fn() }));

const { testConnection } = require('../../src/config/database');
const { getHealth } = require('../../src/controllers/healthController');

function fakeResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('healthController', () => {
  it('deve responder 503 "degraded" quando o banco estiver fora do ar (o health check do App Service detecta a falha)', async () => {
    testConnection.mockResolvedValue(false);
    const res = fakeResponse();

    await getHealth({}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'degraded', database: 'disconnected' }));
  });
});
