/**
 * Komponen Navigasi Tab untuk CMS
 * 
 * Menampilkan tab navigasi untuk berbagai fitur CMS
 */

'use client';

import { Edit, Upload, Download } from 'lucide-react';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: Tab[] = [
    { id: 'data', label: 'Data Penjualan', icon: Edit },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'export', label: 'Export Data', icon: Download },
  ];

  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
