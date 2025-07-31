import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import axios from 'axios';
import './DependencyGraph.css';

const DependencyGraph = ({ dependencies, microservices, total_dependency_count}) => {
  const graphRef = useRef(null);

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

  const downloadGraph = async () => {
    const svg = graphRef.current?.querySelector('svg');
    if (!svg) {
      alert('No graph to download. Please generate a graph first.');
      return;
    }

    try {

      const svgRect = svg.getBoundingClientRect();
      const width = svgRect.width || 800;
      const height = svgRect.height || 600;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);

      const svgClone = svg.cloneNode(true);
      svgClone.setAttribute('width', width);
      svgClone.setAttribute('height', height);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const svgString = new XMLSerializer().serializeToString(svgClone);
      

      const img = new Image();
      
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'relationship-graph.png';
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
    <div className="dependency-graph-container">
      <div className="graph-header">
        <h3 style={{ color: 'white' }}>Microservice Relationship Graph</h3>
        <button onClick={downloadGraph} className="download-button">
          Download Graph
        </button>
      </div>
      
      <div className="graph-content">
        <div ref={graphRef} className="mermaid-graph" />
        
        <div className="graph-info">
          <div className="info-item">
            <strong>Total Services:</strong> {microservices.length}
          </div>
          <div className="info-item">
            <strong>Total Dependencies:</strong> {total_dependency_count}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default DependencyGraph;
