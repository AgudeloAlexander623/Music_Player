import request from 'supertest';
import app from '../app';
import { describe, it, expect } from '@jest/globals';

describe("Connection", () => {
    it("should return a 200 status code for a valid connection", async () => {
        const res = await request(app).get("/connection");
        expect(res.statusCode).toBe(200);
    });
});

describe("Auth", () => {
    it("should return a 200 status code for a valid login", async () => {
        const res = (await request(app).post("/register")).setEncoding({
            email: "testuser@test.com",
            password: "testpassword",
        });
        expect(res.statusCode).toBe(200);
    });
});
