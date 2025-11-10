import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { Reflector } from '@nestjs/core';

interface AuthResponse {
  access_token: string;
}

interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface PostResponse {
  id: number;
  text: string;
  user: UserResponse;
}

describe('aexpo-auth E2E Tests', () => {
  let app: INestApplication<App>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let dataSource: DataSource;

  const timestamp = Date.now();
  const testUser = {
    email: `test-${timestamp}@example.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  const testUser2 = {
    email: `test2-${timestamp}@example.com`,
    password: 'password456',
    firstName: 'Test2',
    lastName: 'User2',
  };

  let authToken: string;
  let userId: number;
  let user2Token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.enableCors();
    app.setGlobalPrefix('api/v1');

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Module', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register a new user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(testUser)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email', testUser.email);
            expect(res.body).toHaveProperty('firstName', testUser.firstName);
            expect(res.body).toHaveProperty('lastName', testUser.lastName);
            expect(res.body).not.toHaveProperty('password');
            userId = (res.body as UserResponse).id;
          });
      });

      it('should register second user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(testUser2)
          .expect(201);
      });

      it('should fail with duplicate email', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(testUser)
          .expect(409);
      });

      it('should fail with invalid email', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send({
            ...testUser,
            email: 'invalid-email',
          })
          .expect(400);
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            authToken = (res.body as AuthResponse).access_token;
          });
      });

      it('should login second user', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: testUser2.email,
            password: testUser2.password,
          })
          .expect(201)
          .expect((res) => {
            user2Token = (res.body as AuthResponse).access_token;
          });
      });

      it('should fail with invalid password', () => {
        return request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/auth/profile', () => {
      it('should get user profile with valid token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).toHaveProperty('email', testUser.email);
            expect(res.body).not.toHaveProperty('password');
          });
      });

      it('should fail without token', () => {
        return request(app.getHttpServer())
          .get('/api/v1/auth/profile')
          .expect(401);
      });
    });

    describe('PATCH /api/v1/auth/profile', () => {
      it('should update profile', () => {
        return request(app.getHttpServer())
          .patch('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            firstName: 'UpdatedFirstName',
            lastName: 'UpdatedLastName',
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('firstName', 'UpdatedFirstName');
            expect(res.body).toHaveProperty('lastName', 'UpdatedLastName');
          });
      });
    });
  });

  describe('Posts Module', () => {
    let postId: number;

    describe('POST /api/v1/posts', () => {
      it('should create a post', () => {
        return request(app.getHttpServer())
          .post('/api/v1/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: 'This is my first test post!',
            hashtags: ['#test', '#e2e', '#nestjs'],
            privacy: 'public',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty(
              'text',
              'This is my first test post!',
            );
            expect(res.body).toHaveProperty('text');
            expect(res.body).toHaveProperty('user');
            postId = (res.body as PostResponse).id;
          });
      });

      it('should fail with empty text', () => {
        return request(app.getHttpServer())
          .post('/api/v1/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: '',
          })
          .expect(400);
      });

      it('should fail without authentication', () => {
        return request(app.getHttpServer())
          .post('/api/v1/posts')
          .send({
            text: 'Unauthorized post',
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/posts', () => {
      it('should get all posts', () => {
        return request(app.getHttpServer())
          .get('/api/v1/posts')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('posts');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('totalPages');
          });
      });
    });

    describe('GET /api/v1/posts/:id', () => {
      it('should get post by id', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/posts/${postId}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', postId);
            expect(res.body).toHaveProperty('text');
            expect(res.body).toHaveProperty('user');
          });
      });
    });

    describe('PATCH /api/v1/posts/:id', () => {
      it('should update own post', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/posts/${postId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            text: 'Updated post text',
            hashtags: ['#updated'],
          })
          .expect(200);
      });

      it('should fail to update another user post', async () => {
        const createRes = await request(app.getHttpServer())
          .post('/api/v1/posts')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ text: 'User 2 post' })
          .expect(201);

        const user2PostId = (createRes.body as PostResponse).id;

        return request(app.getHttpServer())
          .patch(`/api/v1/posts/${user2PostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Trying to update' })
          .expect(403);
      });
    });

    describe('DELETE /api/v1/posts/:id', () => {
      it('should delete own post', async () => {
        const res = await request(app.getHttpServer())
          .post('/api/v1/posts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ text: 'Post to delete' })
          .expect(201);

        const deletePostId = (res.body as PostResponse).id;

        return request(app.getHttpServer())
          .delete(`/api/v1/posts/${deletePostId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });
  });

  describe('Users Module', () => {
    describe('GET /api/v1/users/me', () => {
      it('should get current user', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('email');
            expect(res.body).not.toHaveProperty('password');
          });
      });
    });

    describe('GET /api/v1/users/:id', () => {
      it('should get user by id', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('id', userId);
            expect(res.body).not.toHaveProperty('password');
          });
      });
    });
  });
});
