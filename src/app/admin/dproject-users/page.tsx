'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  user_id: string;
  referrer_id: string | null;
  email: string | null;
  name: string | null;
  token_id: string | null;
  plan_a: {
    dateTime?: string;
    POL?: number;
    rateTHBPOL?: number;
  } | null;
  date_time: string | null;
  pol: number | string | null;
  rate: number | string | null;
  created_at: string;
  updated_at: string;
}

type SortField = 'user_id' | 'email' | 'name' | 'token_id' | 'pol' | 'rate' | 'date_time' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState({ total: 0, loading: true });
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    setMounted(true);
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/dproject-users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats({ ...data, loading: false });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => {
      // Safely check each field for null/undefined before calling toLowerCase()
      const userIdMatch = user.user_id?.toLowerCase().includes(term) || false;
      const emailMatch = user.email?.toLowerCase().includes(term) || false;
      const nameMatch = user.name?.toLowerCase().includes(term) || false;
      const tokenIdMatch = user.token_id?.toLowerCase().includes(term) || false;
      const referrerMatch = user.referrer_id?.toLowerCase().includes(term) || false;
      
      return userIdMatch || emailMatch || nameMatch || tokenIdMatch || referrerMatch;
    });
  }, [users, searchTerm]);

  // Sort users
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue: string | number | null = a[sortField];
      let bValue: string | number | null = b[sortField];
      
      // Handle numeric fields
      if (sortField === 'pol' || sortField === 'rate') {
        aValue = aValue ? parseFloat(aValue as string) : 0;
        bValue = bValue ? parseFloat(bValue as string) : 0;
      }
      
      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle null values
      if (aValue === null) aValue = '';
      if (bValue === null) bValue = '';
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedUsers, currentPage, itemsPerPage]);

  // Helper function to safely convert to number and format
  const formatNumber = (value: number | string | null): string => {
    if (value === null || value === undefined) return '0.00';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Helper function to safely calculate total POL
  const calculateTotalPOL = () => {
    const total = users.reduce((sum, user) => {
      const polValue = user.pol;
      if (polValue === null || polValue === undefined) return sum;
      
      const num = typeof polValue === 'string' ? parseFloat(polValue) : polValue;
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    return total.toFixed(2);
  };

  // Helper function to safely calculate average rate
  const calculateAverageRate = () => {
    const validRates = users
      .map(user => {
        const rateValue = user.rate;
        if (rateValue === null || rateValue === undefined) return null;
        
        const num = typeof rateValue === 'string' ? parseFloat(rateValue) : rateValue;
        return isNaN(num) ? null : num;
      })
      .filter((rate): rate is number => rate !== null);
    
    if (validRates.length === 0) return '0.00';
    
    const total = validRates.reduce((sum, rate) => sum + rate, 0);
    return (total / validRates.length).toFixed(2);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!mounted || stats.loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8"><Link href="/">Admin Dashboard</Link></h1>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Users</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Active Today</h2>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">0</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total POL</h2>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {calculateTotalPOL()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Avg Rate</h2>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {calculateAverageRate()}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by ID, email, name, token, or referrer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Show:</span>
            <span className="font-medium">{filteredUsers.length} users</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">dProject Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('user_id')}
                >
                  User ID {sortField === 'user_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('email')}
                >
                  Email {sortField === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('token_id')}
                >
                  Token ID {sortField === 'token_id' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2 text-left">Referrer</th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('pol')}
                >
                  POL {sortField === 'pol' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('rate')}
                >
                  Rate {sortField === 'rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('date_time')}
                >
                  Date Time {sortField === 'date_time' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('created_at')}
                >
                  Created {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                  <td className="px-4 py-2 font-mono text-sm">{user.user_id}</td>
                  <td className="px-4 py-2">{user.email || 'N/A'}</td>
                  <td className="px-4 py-2">{user.name || 'N/A'}</td>
                  <td className="px-4 py-2">{user.token_id || 'N/A'}</td>
                  <td className="px-4 py-2 font-mono text-sm">
                    {user.referrer_id || 'None'}
                  </td>
                  <td className="px-4 py-2">{formatNumber(user.pol)}</td>
                  <td className="px-4 py-2">{formatNumber(user.rate)}</td>
                  <td className="px-4 py-2">{user.date_time || 'N/A'}</td>
                  <td className="px-4 py-2">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {paginatedUsers.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            {searchTerm ? 'No users match your search' : 'No users found'}
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center gap-1">
              {/* First Page Button */}
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                aria-label="First page"
              >
                First
              </button>
              
              {/* Previous Page Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                aria-label="Previous page"
              >
                &lt;&lt;
              </button>
              
              {/* Page number buttons - Show max 10 pages */}
              {(() => {
                const maxVisiblePages = 3;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                // Adjust if we're near the end
                if (endPage - startPage + 1 < maxVisiblePages) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                
                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePageChange(i)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === i
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                      }`}
                      aria-label={`Page ${i}`}
                      aria-current={currentPage === i ? 'page' : undefined}
                    >
                      {i}
                    </button>
                  );
                }
                return pages;
              })()}
              
              {/* Next Page Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                aria-label="Next page"
              >
                &gt;&gt;
              </button>
              
              {/* Last Page Button */}
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                aria-label="Last page"
              >
                Last
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">Basic Information</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">User ID</dt>
                      <dd className="font-mono text-sm">{selectedUser.user_id}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                      <dd className="text-sm">{selectedUser.email || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="text-sm">{selectedUser.name || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Token ID</dt>
                      <dd className="text-sm">{selectedUser.token_id || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Referrer</dt>
                      <dd className="font-mono text-sm">{selectedUser.referrer_id || 'None'}</dd>
                    </div>
                  </dl>
                  {/* <p></p> */}
                  {/* <h3 className="font-semibold text-gray-700 dark:text-gray-300">Investment Details</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">POL</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.pol)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Rate</dt>
                      <dd className="text-sm">{formatNumber(selectedUser.rate)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Date Time</dt>
                      <dd className="text-sm">{selectedUser.date_time || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt>
                      <dd className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Updated At</dt>
                      <dd className="text-sm">{new Date(selectedUser.updated_at).toLocaleString()}</dd>
                    </div>
                  </dl> */}
                </div>
              </div>
              
              {selectedUser.plan_a && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300">Plan A Details</h3>
                  <dl className="mt-2 space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Date Time</dt>
                      <dd className="text-sm">{selectedUser.plan_a.dateTime || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">POL</dt>
                      <dd className="text-sm">{selectedUser.plan_a.POL || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Rate THB/POL</dt>
                      <dd className="text-sm">{selectedUser.plan_a.rateTHBPOL || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Visualization */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">POL Distribution</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">POL Chart Visualization</p>
              {/* In a real implementation, you would use a charting library like Chart.js or Recharts */}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Rate Distribution</h3>
            <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Rate Chart Visualization</p>
              {/* In a real implementation, you would use a charting library like Chart.js or Recharts */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}