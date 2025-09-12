import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
}

export default function LoadingIndicator({ message = "Analisando dados..." }: LoadingIndicatorProps) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {message}
        </span>
        <div className="flex space-x-1">
          <div className="h-1 w-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="h-1 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="h-1 w-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}