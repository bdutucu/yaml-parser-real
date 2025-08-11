import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Panel,
} from 'reactflow';
import mermaid from 'mermaid';
import axios from 'axios';
import 'reactflow/dist/style.css';
import './DependencyGraph.css';

const DependencyGraph = ({ dependencies, microservices, total_dependency_count }) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('interactive'); // 'interactive' or 'svg'
  
  // SVG mode state
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  console.log('🚀 DependencyGraph Props:');
  console.log('- Microservices:', microservices?.length || 0);
  console.log('- Dependencies:', dependencies?.length || 0);
  console.log('- Total dependency count:', total_dependency_count);

  // Create nodes from microservices
  const nodes = useMemo(() => {
    if (!microservices || microservices.length === 0) {
      console.log('❌ No microservices for nodes');
      return [];
    }

    console.log('✅ Creating nodes for microservices:', microservices.map(ms => ms.name));

    return microservices.map((service, index) => {
      // Simple circular layout
      const angle = (index * 2 * Math.PI) / microservices.length;
      const radius = Math.max(250, microservices.length * 30);
      const x = Math.cos(angle) * radius + 400;
      const y = Math.sin(angle) * radius + 300;

      return {
        id: service.name,
        type: 'default',
        position: { x, y },
        data: { 
          label: service.name 
        },
        style: {
          background: selectedNode === service.name ? '#4CAF50' : '#667eea',
          color: 'white',
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          width: 150,
          textAlign: 'center'
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  }, [microservices, selectedNode]);

  // Create edges from dependencies
  const edges = useMemo(() => {
    if (!dependencies || dependencies.length === 0) {
      console.log('❌ No dependencies for edges');
      return [];
    }

    console.log('🔍 Processing dependencies for edges:', dependencies.length);

    const microserviceDeps = dependencies.filter(dep => dep.type === 'microservice_dependency');
    console.log('🎯 Microservice dependencies:', microserviceDeps.length);

    const edgeList = microserviceDeps.map((dep, index) => {
      const source = dep.service;
      const target = dep.name;
      
      console.log(`Creating edge: ${source} → ${target}`);
      
      return {
        id: `edge-${source}-${target}-${index}`,
        source: source,
        target: target,
        type: 'straight',
        animated: true,
        style: {
          stroke: '#ff6b6b',
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#ff6b6b',
        },
        label: 'depends on',
        labelStyle: { 
          fill: '#333', 
          fontWeight: 600,
          fontSize: '10px'
        },
      };
    });

    console.log('✅ Created edges:', edgeList.length);
    console.log('🎯 Sample edges:', edgeList.slice(0, 5).map(e => `${e.source} → ${e.target}`));

    return edgeList;
  }, [dependencies]);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when data changes
  useEffect(() => {
    console.log('🔄 Updating nodes:', nodes.length);
    setNodes(nodes);
  }, [nodes, setNodes]);

  useEffect(() => {
    console.log('🔄 Updating edges:', edges.length);
    setEdges(edges);
  }, [edges, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    console.log('🎯 Node clicked:', node.id);
    setSelectedNode(selectedNode === node.id ? null : node.id);
  }, [selectedNode]);

  // SVG Mode - Mermaid initialization and graph generation
  useEffect(() => {
    if (viewMode === 'svg') {
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
          nodeSpacing: 40 * Math.log(microservices?.length + 1 || 1),
          rankSpacing: 60 * Math.log(microservices?.length + 5 || 5)
        }
      });

      generateMermaidGraph();
    }
  }, [viewMode, dependencies, microservices, total_dependency_count]);

  const generateMermaidGraph = async () => {
    if (viewMode !== 'svg') return;
    
    try {
      const response = await axios.post('/api/generate-mermaid', {
        dependencies,
        microservices,
        total_dependency_count
      });

      if (response.data.success) {
        const mermaidCode = response.data.mermaid;
        
        // Clear previous graph
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
      console.error('Error generating mermaid graph:', error);
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

  // SVG Mode - Zoom and Pan functionality
  const setupZoomAndPan = () => {
    const svg = graphRef.current?.querySelector('svg');
    if (!svg) return;

    const svgContent = svg.innerHTML;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.innerHTML = svgContent;
    g.setAttribute('class', 'zoomable-content');
    
    svg.innerHTML = '';
    svg.appendChild(g);
    
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
    if (!isFocused || viewMode !== 'svg') return;
    
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, transform.scale * delta));
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
    const newTransform = { x: newX, y: newY, scale: newScale };
    setTransform(newTransform);
    
    const svg = graphRef.current?.querySelector('svg .zoomable-content');
    updateSVGTransform(svg);
  };

  const handleMouseDown = (e) => {
    if (e.button === 0 && viewMode === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
      setIsFocused(true);
    }
  };

  const handleMouseEnter = () => {
    if (viewMode === 'svg') {
      setIsFocused(true);
      document.body.style.overflow = 'hidden';
    }
  };

  const handleMouseLeave = () => {
    if (viewMode === 'svg') {
      setIsFocused(false);
      setIsDragging(false);
      if (!isFullscreen) {
        document.body.style.overflow = '';
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || viewMode !== 'svg') return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    const newTransform = { ...transform, x: newX, y: newY };
    setTransform(newTransform);
    
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

  const downloadGraph = useCallback(() => {
    if (viewMode === 'svg') {
      // SVG mode - export as PNG
      const svg = graphRef.current?.querySelector('svg');
      if (!svg) {
        alert('No graph to download. Please generate a graph first.');
        return;
      }

      try {
        const svgRect = svg.getBoundingClientRect();
        const width = svgRect.width || 800;
        const height = svgRect.height || 600;

        const scale = microservices?.length > 10 ? 4 : 3;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = width * scale;
        canvas.height = height * scale;
        ctx.scale(scale, scale);

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        const svgClone = svg.cloneNode(true);
        const zoomableContent = svgClone.querySelector('.zoomable-content');
        if (zoomableContent) {
          zoomableContent.removeAttribute('transform');
        }
        
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const textElements = svgClone.querySelectorAll('text');
        textElements.forEach(text => {
          text.style.fontFamily = 'Arial, sans-serif';
          text.style.fontSize = '14px';
        });

        const svgString = new XMLSerializer().serializeToString(svgClone);
        
        const img = new Image();
        
        img.onload = () => {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `microservices-dependency-graph-${microservices?.length || 0}-services.png`;
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
    } else {
      // Interactive mode - export as JSON
      const graphData = {
        nodes: flowNodes.map(node => ({
          id: node.id,
          position: node.position,
          data: { label: node.data.label }
        })),
        edges: flowEdges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target
        })),
        metadata: {
          totalServices: microservices?.length || 0,
          totalDependencies: total_dependency_count || 0,
          exportDate: new Date().toISOString()
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `microservices-graph-${microservices?.length || 0}-services.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }, [viewMode, microservices, flowNodes, flowEdges, total_dependency_count]);

  if (!microservices || microservices.length === 0) {
    return (
      <div className="dependency-graph-container">
        <div className="no-data-message">
          <h3>No microservices found</h3>
          <p>Please scan a project directory to generate the dependency graph.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dependency-graph-container">
      <div className="graph-header">
        <h3 style={{color: 'white'}}>Microservice Dependency Graph</h3>
        <div className="header-controls">
          <div className="mode-toggle">
            <button 
              onClick={() => setViewMode('interactive')}
              className={`mode-button ${viewMode === 'interactive' ? 'active' : ''}`}
            >
              Interactive
            </button>
            <button 
              onClick={() => setViewMode('svg')}
              className={`mode-button ${viewMode === 'svg' ? 'active' : ''}`}
            >
              SVG ({viewMode === 'svg' ? 'PNG Export' : 'PNG Export'})
            </button>
          </div>
          <div className="stats">
            <span style={{color: '#f8f9fa'}}>Services: {microservices.length}</span>
            <span style={{color: '#f8f9fa'}}>Dependencies: {total_dependency_count}</span>
          </div>
        </div>
      </div>
      
            {viewMode === 'interactive' ? (
        <div className="react-flow-container">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Panel position="top-left" className="info-panel">
              <div className="graph-stats">
                <div><strong>Services:</strong> {microservices.length}</div>
                <div><strong>Dependencies:</strong> {total_dependency_count}</div>
                {selectedNode && (
                  <div style={{color: '#4CAF50', fontWeight: 'bold'}}>
                    Selected: {selectedNode}
                  </div>
                )}
              </div>
            </Panel>

            <Panel position="top-right" className="help-panel">
              <div className="help-content">
                <p><strong>Controls:</strong></p>
                <p>• Click nodes to select</p>
                <p>• Drag nodes to move</p>
                <p>• Scroll to zoom</p>
              </div>
            </Panel>

            <Controls />
            <MiniMap 
              nodeColor={(node) => node.style?.background || '#667eea'}
              nodeStrokeWidth={2}
              zoomable
              pannable
            />
            <Background variant="dots" gap={20} size={1} />
          </ReactFlow>
        </div>
      ) : (
        <div className="svg-graph-content">
          <div className="svg-graph-header">
            <div className="svg-zoom-controls">
              <button onClick={handleZoomIn} className="zoom-button" title="Zoom In">
                +
              </button>
              <button onClick={handleZoomOut} className="zoom-button" title="Zoom Out">
                −
              </button>
              <button onClick={handleResetZoom} className="zoom-button" title="Reset Zoom">
                ⌂
              </button>
            </div>
            <button onClick={downloadGraph} className="download-button">
              Download PNG
            </button>
          </div>
          
          <div className="svg-graph-container">
            <div 
              ref={containerRef}
              className="mermaid-graph-container" 
              onMouseDown={handleMouseDown}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              tabIndex={0}
            >
              <div ref={graphRef} className="mermaid-graph" />
            </div>
            
            <div className="zoom-info">
              <span>Zoom: {Math.round(transform.scale * 100)}%</span>
              <span>
                {isFocused ? '🎯 ' : ''}
                {isFocused ? 'Ready for zoom/pan' : 'Hover over graph to zoom/pan'} • Drag to pan
              </span>
            </div>
          </div>
        </div>
      )}
        
      {selectedNode && (
        <div className="selected-node-details">
          <h4>Selected Service: {selectedNode}</h4>
          <div className="service-info">
            <div>
              <strong>Dependencies:</strong>
              <ul>
                {dependencies
                  ?.filter(dep => dep.service === selectedNode)
                  ?.map((dep, idx) => (
                    <li key={idx}>{selectedNode} → {dep.name}</li>
                  )) || <li>None</li>}
              </ul>
            </div>
            <div>
              <strong>Depended on by:</strong>
              <ul>
                {dependencies
                  ?.filter(dep => dep.name === selectedNode)
                  ?.map((dep, idx) => (
                    <li key={idx}>{dep.service} → {selectedNode}</li>
                  )) || <li>None</li>}
              </ul>
            </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default DependencyGraph;