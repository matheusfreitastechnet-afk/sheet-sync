import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Carregando dados...' }) => {
  return (
    <div className="loading-section">
      <div className="spinner" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};
