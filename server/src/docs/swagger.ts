export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ExpenseAI REST API Specification',
    version: '1.1.0',
    description: 'Production OpenAPI documentation for ExpenseAI Smart Personal Finance Platform (SRS v1.1)',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new user account (FR-01)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  password: { type: 'string' },
                  currency: { type: 'string' },
                  monthlyIncome: { type: 'number' },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Account successfully registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user with JWT & httpOnly refresh cookie (FR-03)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
        },
      },
    },
    '/expenses': {
      get: {
        summary: 'List expenses with search, filtering, sorting, pagination (FR-11)',
        responses: { 200: { description: 'List of expenses' } },
      },
      post: {
        summary: 'Create expense with budget threshold notifications (FR-10, FR-16)',
        responses: { 201: { description: 'Expense created' } },
      },
    },
    '/receipts': {
      post: {
        summary: 'Upload receipt image and run OCR extraction (FR-18, FR-19)',
        responses: { 200: { description: 'Pre-filled extracted receipt data' } },
      },
    },
    '/export/csv': {
      get: {
        summary: 'Export income and expense CSV protected from formula injection (FR-28, FR-29)',
        responses: { 200: { description: 'CSV file attachment' } },
      },
    },
    '/insights/generate': {
      post: {
        summary: 'Generate AI/Rule spending insights using aggregated data (FR-30, FR-31)',
        responses: { 201: { description: 'Generated insight' } },
      },
    },
  },
};
