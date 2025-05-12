// backend/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../index');
const mysql = require('mysql2/promise');

describe('Auth API Integration Tests', () => {
  let connection;
  let testUsername;

  beforeAll(async () => {
    // Создаем отдельное соединение (не через пул)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true
    });

    // Очистка данных
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DELETE FROM feedback;
      DELETE FROM performance_reviews;
      DELETE FROM goals;
      DELETE FROM users;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    // Создаем тестового пользователя
    testUsername = `testuser_${Date.now()}`;
    await connection.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [testUsername, 'testpass', 'USER']
    );
  });

  afterAll(async () => {
    await connection.end();
  });

  test('POST /login успешная авторизация', async () => {
    const response = await request(app)
      .post('/login')
      .send({ 
        username: testUsername,
        password: 'testpass'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'Login successful',
      user: testUsername,
      role: 'USER'
    });
  });
});