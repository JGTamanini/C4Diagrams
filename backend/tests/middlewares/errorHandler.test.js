const errorHandler = require('../../src/middlewares/errorHandler');

describe('errorHandler', () => {
  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('deve retornar 500 para erros não reconhecidos', () => {
    const err = new Error('Algo inesperado aconteceu');
    const res = mockRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno do servidor.' });

    consoleSpy.mockRestore();
  });
});