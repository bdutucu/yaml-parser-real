import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import axios from 'axios';
import './DependencyGraph.css';

const DependencyGraph = ({ dependencies, microservices, total_dependency_count}) => {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {

    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        // spacing should be proportional to the square of dependency count. But the output was just not like as I expected. so I decided to use a logarithmic scale for spacing.
        nodeSpacing: 40 * Math.log(microservices.length + 1),
        rankSpacing: 60 * Math.log(microservices.length + 5)
      }
    });

    generateGraph();
  }, [dependencies, microservices, total_dependency_count]);

  const generateGraph = async () => {
    try {
      const response = await axios.post('/api/generate-mermaid', {
        dependencies,
        microservices,
        total_dependency_count
      });

      if (response.data.success) {
        const mermaidCode = response.data.mermaid;
        
        // clear previous one
        if (graphRef.current) {
          graphRef.current.innerHTML = '';
        }

       
        const graphId = `graph-${Date.now()}`;
        
        // Render the graph
        const { svg } = await mermaid.render(graphId, mermaidCode);
        
        if (graphRef.current) {
          graphRef.current.innerHTML = svg;
          
          // Add zoom and pan functionality after graph is rendered
          setTimeout(() => {
            setupZoomAndPan();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error generating graph:', error);
      if (graphRef.current) {
        graphRef.current.innerHTML = `
          <div class="error-message">
            <p>Error generating dependency graph</p>
            <small>${error.message}</small>
          </div>
        `;
      }
    }
  };

  const setupZoomAndPan = () => {
    const svg = graphRef.current?.querySelector('svg');
    if (!svg) return;

    // Create a group element to contain all SVG content for transformation
    const svgContent = svg.innerHTML;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = svgContent;
    g.setAttribute('class', 'zoomable-content');
    
    // Clear SVG and add the group
    svg.innerHTML = '';
    svg.appendChild(g);
    
    // Apply initial transform
    updateSVGTransform(g);
  };

  const updateSVGTransform = (element) => {
    if (element) {
      element.setAttribute('transform', 
        `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`
      );
    }
  };

  const handleWheel = (e) => {
    // Only process wheel events if the container is focused/hovered
    if (!isFocused) return;
    
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, transform.scale * delta));
    
    // Calculate zoom point
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Adjust position to zoom towards mouse position
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
    const newTransform = { x: newX, y: newY, scale: newScale };
    setTransform(newTransform);
    
    // Update SVG transform
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      // Set focus when user starts dragging
      setIsFocused(true);
    }
  };

  const handleMouseEnter = () => {
    setIsFocused(true);
    // Prevent page scrolling when hovering over the graph
    document.body.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    setIsFocused(false);
    // Also stop dragging if mouse leaves the container
    setIsDragging(false);
    // Re-enable page scrolling when leaving the graph (unless in fullscreen)
    if (!isFullscreen) {
      document.body.style.overflow = '';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    const newTransform = { ...transform, x: newX, y: newY };
    setTransform(newTransform);
    
    // Update SVG transform
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    const newScale = Math.min(5, transform.scale * 1.2);
    const newTransform = { ...transform, scale: newScale };
    setTransform(newTransform);
    
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, transform.scale * 0.8);
    const newTransform = { ...transform, scale: newScale };
    setTransform(newTransform);
    
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleResetZoom = () => {
    const newTransform = { x: 0, y: 0, scale: 1 };
    setTransform(newTransform);
    
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleFitToScreen = () => {
    const svg = graphRef.current?.querySelector('svg');
    const container = containerRef.current;
    if (!svg || !container) return;

    const svgRect = svg.getBBox();
    const containerRect = container.getBoundingClientRect();
    
    const scaleX = (containerRect.width - 40) / svgRect.width;
    const scaleY = (containerRect.height - 40) / svgRect.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    const centerX = (containerRect.width - svgRect.width * scale) / 2;
    const centerY = (containerRect.height - svgRect.height * scale) / 2;
    
    const newTransform = { 
      x: centerX - svgRect.x * scale, 
      y: centerY - svgRect.y * scale, 
      scale 
    };
    setTransform(newTransform);
    
    const svgContent = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svgContent);
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // Prevent body scroll in fullscreen mode
    if (newFullscreenState) {
      document.body.classList.add('fullscreen-active');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('fullscreen-active');
      document.body.style.overflow = '';
    }
    
    // Reset transform when entering/exiting fullscreen
    const newTransform = { x: 0, y: 0, scale: 1 };
    setTransform(newTransform);
    
    setTimeout(() => {
      const svg = graphRef.current?.querySelector('svg .zoomable-content');
      updateSVGTransform(svg);
    }, 100);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleMouseUp = () => setIsDragging(false);
      const handleMouseLeave = () => {
        setIsDragging(false);
        setIsFocused(false);
        // Re-enable page scrolling when leaving the graph (unless in fullscreen)
        if (!isFullscreen) {
          document.body.style.overflow = '';
        }
      };

      // Add wheel event listener with passive: false to allow preventDefault
      const wheelHandler = (e) => {
        if (isFocused) {
          e.preventDefault();
          e.stopPropagation();
          handleWheel(e);
        }
      };

      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      container.addEventListener('wheel', wheelHandler, { passive: false });
      
      return () => {
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('wheel', wheelHandler);
      };
    }
  }, [isDragging, dragStart, transform, isFullscreen, isFocused]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        document.body.classList.remove('fullscreen-active');
        document.body.style.overflow = '';
        const newTransform = { x: 0, y: 0, scale: 1 };
        setTransform(newTransform);
        setTimeout(() => {
          const svg = graphRef.current?.querySelector('svg .zoomable-content');
          updateSVGTransform(svg);
        }, 100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    // Global wheel event prevention when graph is focused
    const globalWheelHandler = (e) => {
      if (isFocused && containerRef.current?.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isFocused) {
      document.addEventListener('wheel', globalWheelHandler, { passive: false });
      document.addEventListener('touchmove', globalWheelHandler, { passive: false });
    }

    return () => {
      document.removeEventListener('wheel', globalWheelHandler);
      document.removeEventListener('touchmove', globalWheelHandler);
    };
  }, [isFocused]);

  // Cleanup fullscreen state on component unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('fullscreen-active');
      document.body.style.overflow = '';
    };
  }, []);

  const downloadGraph = async () => {
    const svg = graphRef.current?.querySelector('svg');
    if (!svg) {
      alert('No graph to download. Please generate a graph first.');
      return;
    }

    try {
      // Get the original SVG dimensions
      const svgRect = svg.getBoundingClientRect();
      const width = svgRect.width || 800;
      const height = svgRect.height || 600;

      // Use higher scale for better quality, especially for large graphs
      const scale = microservices.length > 10 ? 4 : 3;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Set white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      // Clone SVG and reset any transformations for export
      const svgClone = svg.cloneNode(true);
      const zoomableContent = svgClone.querySelector('.zoomable-content');
      if (zoomableContent) {
        zoomableContent.removeAttribute('transform');
      }
      
      svgClone.setAttribute('width', width);
      svgClone.setAttribute('height', height);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // Improve text rendering
      const textElements = svgClone.querySelectorAll('text');
      textElements.forEach(text => {
        text.style.fontFamily = 'Arial, sans-serif';
        text.style.fontSize = '14px';
      });

      const svgString = new XMLSerializer().serializeToString(svgClone);
      
      const img = new Image();
      
      img.onload = () => {
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use higher quality PNG export
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `microservices-dependency-graph-${microservices.length}-services.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png', 1.0);
      };

      img.onerror = () => {
        alert('Failed to convert graph to image. Please try again.');
      };

      const encodedSvg = encodeURIComponent(svgString);
      img.src = `data:image/svg+xml,${encodedSvg}`;

    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  return (
    <div className={`dependency-graph-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="graph-header">
        <h3 style={{ color: 'white' }}>Microservice Relationship Graph</h3>
        <div className="header-controls">
          <div className="zoom-controls">
            <button onClick={handleZoomIn} className="zoom-button" title="Zoom In">
              +
            </button>
            <button onClick={handleZoomOut} className="zoom-button" title="Zoom Out">
              −
            </button>
            <button onClick={handleResetZoom} className="zoom-button" title="Reset Zoom">
              ⌂
            </button>
            <button onClick={toggleFullscreen} className="zoom-button" title={isFullscreen ? "Exit Fullscreen (ESC)" : "Fullscreen"}>
              {isFullscreen ? '⊠' : '⊡'}
            </button>
          </div>
          {!isFullscreen && (
            <button onClick={downloadGraph} className="download-button">
              Download Graph
            </button>
          )}
        </div>
      </div>
      
      <div className="graph-content">
        <div 
          ref={containerRef}
          className="mermaid-graph-container" 
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
          onScroll={(e) => e.preventDefault()}
          tabIndex={0}
        >
          <div ref={graphRef} className="mermaid-graph" />
        </div>
        
        <div className="zoom-info">
          <span>Zoom: {Math.round(transform.scale * 100)}%</span>
          <span>
            {isFocused ? '🎯 ' : ''}
            {isFocused ? 'Ready for zoom/pan' : 'Hover over graph to zoom/pan'} • Drag to pan
            {isFullscreen ? ' • Press ESC to exit fullscreen' : ''}
          </span>
        </div>
        
        {!isFullscreen && (
          <div className="graph-info">
            <div className="info-item">
              <strong>Total Services:</strong> {microservices.length}
            </div>
            <div className="info-item">
              <strong>Total Dependencies:</strong> {total_dependency_count}
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default DependencyGraph;