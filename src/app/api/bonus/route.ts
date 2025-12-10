// src/app/api/bonus/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Validate inputs
    if (page < 1) {
      return NextResponse.json(
        { error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const client = await pool.connect();

    try {
      // If user_id is provided, return bonus data for that specific user
      if (userId) {
        const userBonusQuery = `
          SELECT 
            b.*,
            u.token_id,
            u.name,
            u.email,
            u.referrer_id,
            u.created_at,
            u.updated_at
          FROM bonus b
          LEFT JOIN users u ON b.user_id = u.user_id
          WHERE b.user_id = $1 
          ORDER BY b.bonus_date DESC
          LIMIT 100
        `;
        
        const result = await client.query(userBonusQuery, [userId]);
        
        return NextResponse.json({
          success: true,
          data: result.rows,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCount: result.rows.length,
            hasNext: false,
            hasPrev: false
          }
        });
      }

      // Admin dashboard functionality with pagination and search
      const offset = (page - 1) * limit;
      
      // Build WHERE clause for search
      let whereClause = '';
      const queryParams: (string | number)[] = [];
      const countParams: (string)[] = [];
      
      if (search) {
        whereClause = `
          WHERE (
            b.user_id ILIKE $1 OR 
            u.user_id ILIKE $1 OR 
            u.token_id ILIKE $1 OR 
            u.name ILIKE $1 OR 
            u.email ILIKE $1
          )
        `;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern);
        countParams.push(searchPattern);
      }

      // Main query to get bonus data with user information
      const query = `
        SELECT 
          b.*,
          u.token_id,
          u.name,
          u.email,
          u.referrer_id,
          u.created_at,
          u.updated_at
        FROM bonus b
        LEFT JOIN users u ON b.user_id = u.user_id
        ${whereClause}
        ORDER BY b.ar DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(*) 
        FROM bonus b
        LEFT JOIN users u ON b.user_id = u.user_id
        ${whereClause}
      `;

      // Add limit and offset to query parameters
      queryParams.push(limit, offset);

      // Execute queries
      const [result, countResult] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, countParams.length > 0 ? countParams : [])
      ]);

      const totalCount = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        success: true,
        data: result.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bonus data',
        message: error instanceof Error ? error.message : 'Unknown database error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}