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

export interface UserWithPosts extends User {
  posts?: Post[]
}