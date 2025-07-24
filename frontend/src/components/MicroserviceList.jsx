import React, { useState } from 'react';
import './MicroserviceList.css';

const MicroserviceList = ({ microservices }) => {
  const [selectedService, setSelectedService] = useState(null);

  const handleServiceClick = (service) => {
    setSelectedService(selectedService === service ? null : service);
  };

  const getServiceStats = (service) => {
    return {
      produces: service.produces.length,
      subscribes: service.subscribes.length,
      totalConnections: service.produces.length + service.subscribes.length
    };
  };

  const sortedServices = [...microservices].sort((a, b) => {
    const aStats = getServiceStats(a);
    const bStats = getServiceStats(b);
    return bStats.totalConnections - aStats.totalConnections;
  });

  return (
    <div className="microservice-list-container">

      <div className="list-summary">
        <h4 style={{ color: 'white' }}>Summary Statistics</h4>
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">Total Services:</span>
            <span className="summary-value">{microservices.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Producers:</span>
            <span className="summary-value">
              {microservices.filter(s => s.produces.length > 0).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Subscribers:</span>
            <span className="summary-value">
              {microservices.filter(s => s.subscribes.length > 0).length}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Most Connected:</span>
            <span className="summary-value">
              {sortedServices.length > 0 ? sortedServices[0].name : 'None'}
            </span>
          </div>
        </div>
      </div>

      <div className="list-header">
        <h3 style={{ color: 'white' }}>Microservices Summary</h3>
        <div className="service-count">
          {microservices.length} services found
        </div>
      </div>
      
      <div className="services-list">
        {sortedServices.map((service, index) => {
          const stats = getServiceStats(service);
          const isSelected = selectedService === service;
          
          return (
            <div
              key={index}
              className={`service-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleServiceClick(service)}
            >
              <div className="service-header">
                <div className="service-name">
                  <span className="service-icon"></span>
                  {service.name}
                </div>
                <div className="service-stats">
                  <span className="stat-badge produces">
                    {stats.produces} produces
                  </span>
                  <span className="stat-badge subscribes">
                    {stats.subscribes} subscribes
                  </span>
                </div>
              </div>
              
              {isSelected && (
                <div className="service-details">
                  <div className="details-section">
                    <h4>Produces Topics For:</h4>
                    {service.produces.length > 0 ? (
                      <ul className="topic-list produces-list">
                        {service.produces.map((topic, idx) => (
                          <li key={idx} className="topic-item">
                            <span className="topic-icon"></span>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-items">No topics produced</p>
                    )}
                  </div>
                  
                  <div className="details-section">
                    <h4>Subscribes to Topics From:</h4>
                    {service.subscribes.length > 0 ? (
                      <ul className="topic-list subscribes-list">
                        {service.subscribes.map((topic, idx) => (
                          <li key={idx} className="topic-item">
                            <span className="topic-icon"></span>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-items">No topics subscribed to</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      

    </div>
  );
};

export default MicroserviceList;
