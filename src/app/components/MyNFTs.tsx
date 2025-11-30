const MyNFTs: React.FC = () => {
  const myNumber = -1;

  return (
    <div>
      {myNumber > 0 ? (
        <p>การลงทะเบียนสมาชิกเรียบร้อย: {myNumber}</p>
      ) : myNumber < 0 ? (
        <p>การลงทะเบียนสมาชิกไม่เรียบร้อย: {myNumber}</p>
      ) : (
        <p>ลองใหม่อีกครั้ง</p>
      )}
    </div>
  );
};

export default MyNFTs;