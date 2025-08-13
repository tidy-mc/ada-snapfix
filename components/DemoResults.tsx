'use client';

import { useState } from 'react';

// Sample data for demonstration
const sampleResults = {
  url: "https://example.com",
  timestamp: "2024-01-01T12:00:00.000Z",
  totalIssues: 6,
  axe: [
    {
      id: "link-name-clarity",
      help: "Links must have descriptive text",
      description: "Avoid vague link text like 'click here' or 'read more'",
      nodes: [
        {
          target: ["body > div > a"],
          failureSummary: "Link text 'Click here' is too vague"
        }
      ]
    },
    {
      id: "form-field-labels",
      help: "Form fields must have accessible labels",
      description: "Ensure all form fields have proper labels",
      nodes: [
        {
          target: ["body > div > input"],
          failureSummary: "Input field lacks accessible label"
        }
      ]
    }
  ],
  issues: [
    {
      selector: "body > div > img",
      ruleId: "image-alt",
      wcag: ["wcag2a", "wcag111"],
      severity: "critical",
      message: "Images must have alternate text",
      source: "axe" as const,
    },
    {
      selector: "body > div > button",
      ruleId: "button-name",
      wcag: ["wcag2a", "wcag412"],
      severity: "high",
      message: "Buttons must have accessible names",
      source: "axe" as const,
    },
    {
      selector: "body > div > a",
      ruleId: "link-name-clarity",
      wcag: ["wcag2a", "wcag241"],
      severity: "moderate",
      message: "Link text 'Click here' is too vague",
      source: "axe" as const,
    },
    {
      selector: "body > div > input",
      ruleId: "form-field-labels",
      wcag: ["wcag2a", "wcag131"],
      severity: "critical",
      message: "Form field lacks accessible label",
      source: "axe" as const,
    },
  ],
  summary: {
    axe: 4,
    pa11y: 0,
  },
};

export default function DemoResults() {
  const [showDemo, setShowDemo] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'moderate':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      case 'minor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSourceColor = (source: string) => {
    return source === 'axe' 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-green-100 text-green-800 border-green-200';
  };

  if (!showDemo) {
    return (
      <div className="text-center">
        <button
          onClick={() => setShowDemo(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          View Demo Results
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Results Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Demo Scan Results</h2>
            <p className="text-sm text-gray-600 mt-1">
              Scanned: {sampleResults.url}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{sampleResults.totalIssues}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            <span className="text-sm text-gray-600">
              Axe: {sampleResults.summary.axe} issues
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm text-gray-600">
              Pa11y: {sampleResults.summary.pa11y} issues
            </span>
          </div>
                 </div>
       </div>

       {/* Raw Axe Results */}
       <div className="px-6 py-4 border-b border-gray-200">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Raw Axe Results</h3>
         {sampleResults.axe?.map((issue, idx) => (
           <div key={idx} className="border p-3 my-3 rounded-lg bg-gray-50">
             <h4 className="font-medium text-gray-900 mb-2">
               {issue.id} — {issue.help}
             </h4>
             <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
             <div className="space-y-2">
               {issue.nodes.map((node: any, i: number) => (
                 <div key={i} className="text-xs font-mono bg-white p-2 rounded border">
                   {node.target.join(", ")}
                 </div>
               ))}
             </div>
           </div>
         ))}
       </div>

       {/* Issues List */}
       <div className="divide-y divide-gray-200">
        {sampleResults.issues.map((issue, index) => (
          <div key={index} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {issue.ruleId}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {issue.message}
                </p>
                <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                  {issue.selector}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 ml-4">
                {/* Severity Chip */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                  {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                </span>
                
                {/* Source Chip */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSourceColor(issue.source)}`}>
                  {issue.source.toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* WCAG Tags */}
            {issue.wcag.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {issue.wcag.map((wcag, wcagIndex) => (
                  <span
                    key={wcagIndex}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {wcag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="px-6 py-4 bg-gray-50 text-center">
        <button
          onClick={() => setShowDemo(false)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Hide Demo
        </button>
      </div>
    </div>
  );
}
