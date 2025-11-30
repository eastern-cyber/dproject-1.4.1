import React, { useState, useEffect } from 'react';

interface User {
  userId: string;
  referrerId: string;
  email: string;
  name: string;
  tokenId: string;
  userCreated: string;
  planA: string;
}

const ReferralTable: React.FC = () => {
  const [referrerId, setReferrerId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [referralCount, setReferralCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch data from the JSON file
    const fetchData = async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.2/main/public/dproject-users.json'
        );
        const data: User[] = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    // Calculate the number of users referred by the entered referrerId
    if (referrerId) {
      const count = users.filter(user => user.referrerId === referrerId).length;
      setReferralCount(count);
    } else {
      setReferralCount(null);
    }
  }, [referrerId, users]);

  return (
    <div className="max-w-md mx-auto p-4">
      <input
        type="text"
        placeholder="ใส่เลขกระเป๋า..."
        value={referrerId}
        onChange={(e) => setReferrerId(e.target.value)}
        className="text-[18px] text-center border border-gray-400 p-2 rounded mt-4 w-full bg-gray-800 text-white break-all"
      />
      {referralCount !== null && (
        <table className="table-auto w-full mt-4 border-collapse border border-gray-400">
          <thead>
            <tr>
              <th className="border border-gray-400 px-4 py-2">Gen</th>
              <th className="border border-gray-400 px-4 py-2">Number of Users</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-4 py-2 text-center">1</td>
              <td className="border border-gray-400 px-4 py-2 text-center">{referralCount}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ReferralTable;
