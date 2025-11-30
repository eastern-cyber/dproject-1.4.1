import postgres from 'postgres'

// Define interface for better type safety
export interface User {
  id: number
  name: string
  email: string
  created_at: Date
  updated_at: Date
}

export interface Post {
  id: number
  user_id: number
  title: string
  content: string | null
  created_at: Date
  updated_at: Date
}

// Create a typed database client
let sql: ReturnType<typeof postgres>

if (process.env.NODE_ENV === 'production') {
  sql = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    transform: {
      undefined: null,
    },
  })
} else {
  sql = postgres(process.env.DATABASE_URL!, {
    ssl: 'require',
    transform: {
      undefined: null,
    },
  })
}

// Helper function to safely connect
export async function connectDatabase() {
  try {
    await sql`SELECT 1`
    console.log('Database connected successfully')
    return sql
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

export default sql