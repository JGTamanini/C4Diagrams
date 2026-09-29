const errorHandler = require('../../src/middlewares/errorHandler');
const { WeakPasswordError, EmailAlreadyExistsError, MissingFieldError } = require('../../src/errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../../src/errors/token.errors');
const { UnauthorizedError } = require('../../src/errors/auth.errors');
const { ProjectNotFoundError, FieldTooLongError, NoFieldsToUpdateError } = require('../../src/errors/project.errors');

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

  it('deve retornar 401 com header WWW-Authenticate para UnauthorizedError', () => {
    const err = new UnauthorizedError('Autenticação necessária. Faça login para continuar.');
    const res = mockRes();
    res.set = jest.fn().mockReturnValue(res);

    errorHandler(err, {}, res, jest.fn());

    expect(res.set).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 404 para ProjectNotFoundError', () => {
    const err = new ProjectNotFoundError();
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 400 para NoFieldsToUpdateError', () => {
    const err = new NoFieldsToUpdateError();
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });

  it('deve retornar 400 para FieldTooLongError', () => {
    const err = new FieldTooLongError('name', 255);
    const res = mockRes();

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: err.message });
  });
});
