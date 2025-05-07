# Graph Gurus Client

We are building a platform for analyzing public data spending.The target audience is the public sector and independent journalists that need a easy and accessible way of finding anomalies in public spending.

We want to create a anomaly detection features, but also allow the user to explore the data using an intuitive interface. To do that, we want to create a prompt that create interfaces with data, apply advanced filters to query data, etc.

## Tech Stack

- React.js
- Tailwind CSS
- TypeScript
- Shadcn UI
- Tanstack Query
- Tanstack Router
- GraphQL
- Vite

## Getting Started

### Install dependencies

```bash
yarn install
```

### Run the development server

```bash
yarn dev
```

### Build

```bash
yarn build
```

## AI Filter Generator

The AI Filter Generator allows users to generate filters using natural language. For example, a user can enter a query like "Show me education spending in Cluj from last year" and the AI will automatically set the appropriate filters.

### Setup

1. Create a `.env.local` file in the client directory and add your API URL:

```
VITE_API_URL=http://localhost:3000
```

2. Create a `.env` file in the server directory and add your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
```

3. The API key should have access to the `gpt-4o` model for optimal results.

### How It Works

1. The user enters a natural language query in the search box and clicks the sparkle icon.
2. The query, along with the available filter options (entity types, counties, etc.), is sent to the server.
3. The server uses OpenAI to generate a structured JSON representation of the filters.
4. The filters are validated using Zod and applied to the data discovery page.
5. The filtered data is displayed to the user.

### Server Implementation

The filter generation is implemented on the server side for security and to keep the API key private:

1. The server exposes an endpoint at `/api/filter-generator` that accepts POST requests.
2. The request includes the user prompt, filter schema, and contextual data about available filter options.
3. The server uses OpenAI's API to generate a filter configuration based on the user's prompt.
4. The JSON filter is returned to the client, which then validates and applies it.

### Example Queries

- "Show me education spending in Cluj from last year"
- "What's the budget for healthcare in cities with over 50,000 population?"
- "Compare infrastructure spending between Cluj and Bucharest in 2022"
