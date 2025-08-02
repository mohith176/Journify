import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../main';

const Support = () => {
  const { theme } = useTheme();

  return (
    <div className={`support-page mood-page ${theme} min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4`}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6">
          <h1 className="text-2xl font-bold text-white">Tailwind CSS Test</h1>
          <p className="text-blue-100 mt-2">
            If you can see this styled correctly, Tailwind is working!
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="bg-blue-100 text-red-800 p-3 rounded-md flex-1 text-center">
              Red
            </div>
            <div className="bg-green-100 text-green-800 p-3 rounded-md flex-1 text-center">
              Green
            </div>
            <div className="bg-blue-100 text-blue-800 p-3 rounded-md flex-1 text-center">
              Blue
            </div>
          </div>
          
          <div className="space-y-4">
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150 ease-in-out">
              Button with hover effect
            </button>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-300">
              <p className="text-gray-700">This card has a hover effect</p>
            </div>
          </div>
          
          <div className="mt-6 text-right">
            <Link 
              to="/dashboard" 
              className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;