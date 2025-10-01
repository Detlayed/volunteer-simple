Server for volunteer-simple

Quick start

1) Install dependencies

npm install

2) Copy .env.example to .env and set JWT_SECRET

cp .env.example .env
# edit .env and set JWT_SECRET

3) Start server

npm start

API

POST /api/signup
- body: { email, password, fullName, iin, phone, city }
- returns: { token, user }

POST /api/login
- body: { email, password }
- returns: { token, user }

POST /api/requests
- body: { name, city, address, contact, desc }
- public endpoint; server will try to geocode and store coords

GET /api/requests
- auth required: Authorization: Bearer <token>

PUT /api/requests/:id/status
- auth required
- body: { status }

Notes
- This is a simple SQLite-based server for local testing. For production consider Postgres and proper secrets management.
