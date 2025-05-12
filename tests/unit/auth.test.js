// backend/tests/unit/auth.test.js
const request = require('supertest');
const app = require('../../index'); 
const mysql = require('mysql2/promise');

jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn(),
  createPool: jest.fn()
}));

describe('Auth Controller', () => {
  beforeEach(() => {
    mysql.createConnection.mockClear();
  });

  test('Успешная авторизация', async () => {
    // Мокируем ответ БД
    mysql.createConnection.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue([[{
        username: 'test',
        password: '123',
        role: 'USER'
      }]])
    }));

    const response = await request(app)
      .post('/login')
      .send({ username: 'test', password: '123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user', 'test');
  });

  test('Неверный пароль', async () => {
    mysql.createConnection.mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue([[{
        username: 'test',
        password: 'correct',
        role: 'USER'
      }]])
    }));

    const response = await request(app)
      .post('/login')
      .send({ username: 'test', password: 'wrong' });

    expect(response.status).toBe(401);
  });
});