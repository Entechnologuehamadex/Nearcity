"use client";

interface DataCardProps {
  title: string;
  children: React.ReactNode;
  buttonText: string;
  onButtonClick?: () => void;
}

export default function DataCard({ title, children, buttonText, onButtonClick }: DataCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col h-full">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-6 flex-1">{children}</div>
      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={onButtonClick}
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-400 text-white rounded-full px-6 py-3 font-semibold hover:shadow-lg transition-shadow"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
