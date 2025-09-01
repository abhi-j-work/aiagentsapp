// src/components/GraphControls.tsx

import React from 'react';

interface GraphControlsProps {
  allGroups: Set<string>;
  visibleGroups: Set<string>;
  searchKey: number;
  onFilterChange: (group: string, isVisible: boolean) => void;
  onSearch: (query: string) => void;
  isPhysicsEnabled: boolean;
  onTogglePhysics: () => void;
  onResetView: () => void;
  onClusterByType: () => void; // Renamed for clarity
  onUnclusterAll: () => void; // Renamed for clarity
}

const GraphControls: React.FC<GraphControlsProps> = (props) => {
  const { onSearch, ...rest } = props;

  return (
    <div className="graph-controls">
      <div className="control-section">
        <input
          key={rest.searchKey}
          type="search"
          placeholder="Search for a node..."
          onChange={(e) => onSearch(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="control-section">
        <div className="section-header">Node Types</div>
        <div className="filter-list">
          {Array.from(rest.allGroups).sort().map(group => (
            <div key={group} className="filter-item">
              <input
                type="checkbox"
                id={`filter-${group}`}
                checked={rest.visibleGroups.has(group)}
                onChange={(e) => rest.onFilterChange(group, e.target.checked)}
              />
              <label htmlFor={`filter-${group}`}>{group}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="control-section">
        <div className="section-header">Actions</div>
        <button onClick={rest.onClusterByType}>Cluster by Type</button>
        <button onClick={rest.onUnclusterAll}>Uncluster All</button>
        <button onClick={rest.onTogglePhysics}>
          {rest.isPhysicsEnabled ? 'Freeze Layout' : 'Activate Layout'}
        </button>
        <button onClick={rest.onResetView}>Reset View & Selection</button>
      </div>
    </div>
  );
};

export default GraphControls;