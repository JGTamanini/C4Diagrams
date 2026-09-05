const errorHandler = require('../../src/middlewares/errorHandler');
const { WeakPasswordError, EmailAlreadyExistsError, MissingFieldError } = require('../../src/errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../../src/errors/token.errors');

describe('errorHandler', () => {
  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it('deve retornar 400 para WeakPasswordError', () => {
    const err = new WeakPasswordError();
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 400 para MissingFieldError', () => {
    const err = new MissingFieldError('email');
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 409 para EmailAlreadyExistsError', () => {
    const err = new EmailAlreadyExistsError('teste@example.com');
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 500 para erros não reconhecidos', () => {
    const err = new Error('Algo inesperado aconteceu');
    const res = mockRes();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erro interno do servidor.' });

    consoleSpy.mockRestore();
  });

  it('deve retornar 400 para InvalidOrExpiredTokenError', () => {
    const err = new InvalidOrExpiredTokenError();
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });
});