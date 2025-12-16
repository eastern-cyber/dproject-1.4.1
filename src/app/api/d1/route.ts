// src/app/api/d1/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Helper function to get the next d1_sequence for a user
async function getNextD1Sequence(userId: string): Promise<number> {
  try {
    const result = await sql`
      SELECT COALESCE(MAX(d1_sequence), 0) as max_sequence 
      FROM d1 
      WHERE user_id = ${userId}
    `;
    
    return (result[0]?.max_sequence || 0) + 1;
  } catch (error) {
    console.error('Error getting next d1_sequence:', error);
    return 1; // Default to 1 if error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const get_all = searchParams.get('get_all') === 'true';
    const latest_only = searchParams.get('latest_only') === 'true';

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (get_all) {
      // Get all D1 records for user, sorted by d1_sequence
      const result = await sql`
        SELECT 
          id, user_id, rate_thb_pol, append_pol, append_pol_tx_hash,
          append_pol_date_time, remark, created_at, updated_at,
          d1_id, d1_sequence, used_bonus_pol
        FROM d1 
        WHERE user_id = ${user_id}
        ORDER BY d1_sequence ASC
      `;

      return NextResponse.json(result);
      
    } else if (latest_only) {
      // Get only the latest D1 record (highest d1_sequence)
      const result = await sql`
        SELECT 
          id, user_id, rate_thb_pol, append_pol, append_pol_tx_hash,
          append_pol_date_time, remark, created_at, updated_at,
          d1_id, d1_sequence, used_bonus_pol
        FROM d1 
        WHERE user_id = ${user_id}
        ORDER BY d1_sequence DESC 
        LIMIT 1
      `;
      
      if (result.length === 0) {
        return NextResponse.json({ error: 'D1 record not found' }, { status: 404 });
      }
      
      return NextResponse.json(result[0]);
      
    } else {
      // Original behavior: Get first D1 record found (backward compatibility)
      const result = await sql`
        SELECT 
          id, user_id, rate_thb_pol, append_pol, append_pol_tx_hash,
          append_pol_date_time, remark, created_at, updated_at,
          d1_id, d1_sequence, used_bonus_pol
        FROM d1 
        WHERE user_id = ${user_id}
        ORDER BY d1_sequence ASC 
        LIMIT 1
      `;

      if (result.length === 0) {
        return NextResponse.json({ error: 'D1 record not found' }, { status: 404 });
      }

      return NextResponse.json(result[0]);
    }

  } catch (error) {
    console.error('Error fetching D1 data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = body.user_id;
    const now = new Date().toISOString();
    
    // Check if this is an update to existing D1 or a new one
    const existingRecord = body.id ? 
      await sql`SELECT id, d1_sequence FROM d1 WHERE id = ${body.id} AND user_id = ${userId} LIMIT 1` :
      await sql`SELECT id, d1_sequence FROM d1 WHERE user_id = ${userId} LIMIT 1`;

    let result;
    
    if (existingRecord.length > 0 && body.id) {
      // Update specific existing D1 record by ID
      result = await sql`
        UPDATE d1 SET
          rate_thb_pol = ${body.rate_thb_pol || 0},
          append_pol = ${body.append_pol || 0},
          append_pol_tx_hash = ${body.append_pol_tx_hash || null},
          append_pol_date_time = ${body.append_pol_date_time || null},
          used_bonus_pol = ${body.used_bonus_pol || 0},
          d1_id = ${body.d1_id || null},
          remark = ${body.remark ? JSON.stringify(body.remark) : null},
          updated_at = ${now}
        WHERE id = ${body.id} AND user_id = ${userId}
        RETURNING *
      `;
      
    } else if (existingRecord.length > 0 && !body.allow_multiple) {
      // Update first existing record (backward compatibility)
      result = await sql`
        UPDATE d1 SET
          rate_thb_pol = ${body.rate_thb_pol || 0},
          append_pol = ${body.append_pol || 0},
          append_pol_tx_hash = ${body.append_pol_tx_hash || null},
          append_pol_date_time = ${body.append_pol_date_time || null},
          used_bonus_pol = ${body.used_bonus_pol || 0},
          d1_id = ${body.d1_id || null},
          remark = ${body.remark ? JSON.stringify(body.remark) : null},
          updated_at = ${now}
        WHERE user_id = ${userId}
        ORDER BY d1_sequence ASC
        LIMIT 1
        RETURNING *
      `;
      
    } else {
      // Insert new D1 record with auto-incremented d1_sequence
      const nextSequence = await getNextD1Sequence(userId);
      
      result = await sql`
        INSERT INTO d1 (
          user_id, 
          d1_sequence,
          rate_thb_pol, 
          append_pol, 
          append_pol_tx_hash, 
          append_pol_date_time,
          used_bonus_pol,
          d1_id,
          remark,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          ${nextSequence},
          ${body.rate_thb_pol || 0},
          ${body.append_pol || 0},
          ${body.append_pol_tx_hash || null},
          ${body.append_pol_date_time || null},
          ${body.used_bonus_pol || 0},
          ${body.d1_id || null},
          ${body.remark ? JSON.stringify(body.remark) : null},
          ${now},
          ${now}
        )
        RETURNING *
      `;
    }

    if (result && result.length > 0) {
      return NextResponse.json(result[0]);
    } else {
      throw new Error('No data returned from database operation');
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: `Database operation failed: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// New PUT method for updating specific fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = body.user_id;
    const now = new Date().toISOString();
    const updates = [];
    const params = [];
    
    // Build dynamic update query based on provided fields
    if (body.rate_thb_pol !== undefined) {
      updates.push(`rate_thb_pol = $${updates.length + 1}`);
      params.push(body.rate_thb_pol);
    }
    
    if (body.append_pol !== undefined) {
      updates.push(`append_pol = $${updates.length + 1}`);
      params.push(body.append_pol);
    }
    
    if (body.used_bonus_pol !== undefined) {
      updates.push(`used_bonus_pol = $${updates.length + 1}`);
      params.push(body.used_bonus_pol);
    }
    
    if (body.d1_id !== undefined) {
      updates.push(`d1_id = $${updates.length + 1}`);
      params.push(body.d1_id);
    }
    
    if (body.remark !== undefined) {
      updates.push(`remark = $${updates.length + 1}`);
      params.push(JSON.stringify(body.remark));
    }
    
    // Always update updated_at
    updates.push(`updated_at = $${updates.length + 1}`);
    params.push(now);
    
    // Add user_id to params for WHERE clause
    params.push(userId);
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    // Determine which record to update
    let whereClause = 'user_id = $' + params.length;
    let queryParams = [...params];
    
    if (body.id) {
      // Update specific D1 record by ID
      whereClause = `id = $${params.length} AND user_id = $${params.length + 1}`;
      queryParams = [...params.slice(0, -1), body.id, userId];
    } else if (body.d1_sequence) {
      // Update specific D1 record by sequence number
      whereClause = `user_id = $${params.length} AND d1_sequence = $${params.length + 1}`;
      queryParams = [...params.slice(0, -1), userId, body.d1_sequence];
    }
    
    const updateQuery = `
      UPDATE d1 
      SET ${updates.join(', ')}
      WHERE ${whereClause}
      RETURNING *
    `;
    
    const result = await sql(updateQuery, queryParams);

    if (result && result.length > 0) {
      return NextResponse.json(result[0]);
    } else {
      return NextResponse.json({ error: 'Record not found or no changes made' }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: `Database operation failed: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// New DELETE method (optional, for cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const id = searchParams.get('id');
    const d1_sequence = searchParams.get('d1_sequence');

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let result;
    
    if (id) {
      // Delete specific D1 record by ID
      result = await sql`
        DELETE FROM d1 
        WHERE id = ${id} AND user_id = ${user_id}
        RETURNING id, user_id, d1_sequence
      `;
    } else if (d1_sequence) {
      // Delete specific D1 record by sequence
      result = await sql`
        DELETE FROM d1 
        WHERE user_id = ${user_id} AND d1_sequence = ${parseInt(d1_sequence)}
        RETURNING id, user_id, d1_sequence
      `;
    } else {
      return NextResponse.json({ 
        error: 'Either id or d1_sequence parameter is required for deletion' 
      }, { status: 400 });
    }

    if (result && result.length > 0) {
      return NextResponse.json({ 
        success: true, 
        deleted: result[0],
        message: 'D1 record deleted successfully'
      });
    } else {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: `Database operation failed: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}