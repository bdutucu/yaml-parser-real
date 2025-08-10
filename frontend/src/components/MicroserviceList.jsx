import React, { useState } from 'react';
import './MicroserviceList.css';

const MicroserviceList = ({ microservices }) => {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const handleServiceClick = (service) => {
    setSelectedService(selectedService === service ? null : service);
    setSelectedTopic(null); // Reset topic selection when service changes
  };

  const handleTopicClick = (topic, event) => {
    event.stopPropagation(); // Prevent service card click
    setSelectedTopic(selectedTopic === topic ? null : topic);
  };

  // Normalize topic names for comparison (same logic as backend Python code)
  const normalizeTopicName = (name) => {
    if (!name) return '';
    
    // Better camelCase to hyphen conversion
    // Handle sequences like "c2ResourceManagement" -> "c2-resource-management"
    // First pass: insert hyphens before uppercase letters that follow lowercase/digits
    name = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
    // Second pass: handle consecutive uppercase letters like "XMLHttpRequest" -> "XML-Http-Request"
    name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');
    // Convert to lowercase first, then remove all separators
    name = name.toLowerCase();
    const normalized = name.replace(/[^a-z0-9]/g, '');
    
    return normalized;
  };

  // Extract microservice name from topic pattern
  const extractMicroserviceNameFromTopic = (topic) => {
    const topicPattern = /([^.]+)\.([^.]+)\..*?(?:\.event|$)/;
    const match = topic.match(topicPattern);
    return match ? match[2] : null;
  };

  // Find matching producer topics using fuzzy matching (same logic as backend)
  const findMatchingProducerTopics = (consumerTopic, allProducerTopics) => {
    const consumerMsPart = extractMicroserviceNameFromTopic(consumerTopic);
    if (!consumerMsPart) return [];
    
    const normalizedConsumer = normalizeTopicName(consumerMsPart);
    const matchingTopics = [];
    
    for (const producerTopic of allProducerTopics) {
      const producerMsPart = extractMicroserviceNameFromTopic(producerTopic);
      if (producerMsPart) {
        const normalizedProducer = normalizeTopicName(producerMsPart);
        if (normalizedConsumer === normalizedProducer) {
          matchingTopics.push(producerTopic);
        }
      }
    }
    
    return matchingTopics;
  };

  // Find which service produces a specific topic
  const findTopicProducer = (topic) => {
    // Look for exact match first
    let producer = microservices.find(service => 
      service.produces && service.produces.includes(topic)
    );
    
    if (producer) {
      return producer;
    }
    
    // Use fuzzy matching with normalization (same as backend logic)
    // Collect all producer topics
    const allProducerTopics = [];
    microservices.forEach(service => {
      if (service.produces) {
        service.produces.forEach(producedTopic => {
          allProducerTopics.push(producedTopic);
        });
      }
    });
    
    // Find matching producer topics using fuzzy matching
    const matchingProducerTopics = findMatchingProducerTopics(topic, allProducerTopics);
    
    if (matchingProducerTopics.length > 0) {
      // Find the service that produces the first matching topic
      producer = microservices.find(service =>
        service.produces && service.produces.some(producedTopic =>
          matchingProducerTopics.includes(producedTopic)
        )
      );
    }
    
    return producer;
  };

  // Get services that the current service depends on (based on subscribed topics)
  const getServiceDependencies = (service) => {
    const dependencies = [];
    service.subscribes.forEach(topic => {
      const producer = findTopicProducer(topic);
      if (producer && producer.name !== service.name) {
        dependencies.push({
          service: producer.name,
          topic: topic
        });
      }
    });
    return dependencies;
  };

  const getServiceStats = (service) => {
    const dependencies = getServiceDependencies(service);
    return {
      produces: service.produces.length,
      subscribes: service.subscribes.length,
      dependencies: dependencies.length,
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
                  <span className="stat-badge dependencies">
                    {stats.dependencies} dependencies
                  </span>
                </div>
              </div>
              
              {isSelected && (
                <div className="service-details">
                  <div className="details-section">
                    <h4>Produces these topics:</h4>
                    {service.produces.length > 0 ? (
                      <ul className="topic-list produces-list">
                        {service.produces.map((topic, idx) => (
                          <li key={idx} className="topic-item">
                            <span 
                              className="topic-name clickable-topic"
                              onClick={(e) => handleTopicClick(topic, e)}
                              title="Click to see topic details"
                            >
                              <span className="topic-icon"></span>
                              {topic}
                            </span>
                            {selectedTopic === topic && (
                              <div className="topic-details">
                                <div className="topic-info">
                                  <strong>Producer:</strong> {service.name} (this service)
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-items">No topics produced</p>
                    )}
                  </div>
                  
                  <div className="details-section">
                    <h4>Subscribes to these topics:</h4>
                    {service.subscribes.length > 0 ? (
                      <ul className="topic-list subscribes-list">
                        {service.subscribes.map((topic, idx) => {
                          const producer = findTopicProducer(topic);
                          return (
                            <li key={idx} className="topic-item">
                              <span 
                                className="topic-name clickable-topic"
                                onClick={(e) => handleTopicClick(topic, e)}
                                title="Click to see who produces this topic"
                              >
                                <span className="topic-icon"></span>
                                {topic}
                              </span>
                              {selectedTopic === topic && (
                                <div className="topic-details">
                                  <div className="topic-info">
                                    <strong>Producer:</strong> {producer ? producer.name : 'Unknown'}
                                  </div>
                                  {producer && (
                                    <div className="producer-stats">
                                      <span className="stat-badge">
                                        {producer.produces.length} topics produced
                                      </span>
                                      <span className="stat-badge">
                                        {producer.subscribes.length} topics subscribed
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="no-items">No topics subscribed to</p>
                    )}
                  </div>

                  {/* New Dependencies Section */}
                  <div className="details-section">
                    <h4>Service Dependencies:</h4>
                    {(() => {
                      const dependencies = getServiceDependencies(service);
                      return dependencies.length > 0 ? (
                        <div className="dependencies-info">
                          <p className="dependency-description">
                            This service depends on the following services (based on subscribed topics):
                          </p>
                          <ul className="dependency-list">
                            {dependencies.map((dep, idx) => (
                              <li key={idx} className="dependency-item">
                                <span className="dependency-service">{dep.service}</span>
                                <span className="dependency-via">via topic:</span>
                                <span className="dependency-topic">{dep.topic}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="no-items">No service dependencies found</p>
                      );
                    })()}
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
