// src/components/confirmModal.tsx

import { useEffect } from "react";

interface ConfirmModalProps {
  children: React.ReactNode;
  onClose: () => void;
  disableClose?: boolean; // Add this line
}

export const ConfirmModal = ({ children, onClose, disableClose = false }: ConfirmModalProps) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative">
        {!disableClose && ( // Only show close button if disableClose is false
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-white cursor-pointer"
            onClick={onClose}
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  );
};