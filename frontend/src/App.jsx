import React, { useState } from "react";
import DependencyGraph from "./components/DependencyGraph";
import MicroserviceList from "./components/MicroserviceList";
import "./App.css";

function App() {
  const [directoryPath, setDirectoryPath] = useState("C:\\Users\\hakim\\Desktop\\yaml-parser-real\\test");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parseYAML = async () => {
    if (!directoryPath.trim()) {
      setError("Please enter directory path");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const requestBody = { directory_path: directoryPath };

      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        // direkt olarak backenddeki microservices verisini kullan
        if (data.microservices && data.microservices.length > 0) {
          setResult(data);
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const DependencyCard = ({ dependency, index }) => (
    <div className="dependency-card" key={index}>
      <h4>{dependency.name}</h4>
      <div className="dependency-details">
        <span className={`dependency-type ${dependency.type}`}>
          {dependency.type.replace("_", " ").toUpperCase()}
        </span>
        {dependency.version && (
          <span className="dependency-version">v{dependency.version}</span>
        )}
      </div>
      {dependency.description && (
        <p className="dependency-description">{dependency.description}</p>
      )}
      {dependency.source_file && (
        <p className="source-file">File: {dependency.source_file}</p>
      )}
      {dependency.service && (
        <p className="service-info">Service: {dependency.service}</p>
      )}
      {dependency.repository && (
        <p className="repository-info">Repository: {dependency.repository}</p>
      )}
    </div>
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>Microservice Relationship Mapper</h1>
        <p>Visualize and manage microservice dependencies</p>
      </header>

      <div className="container">
        <div className="input-section">
          <h3 style={{ color: "white" }}>Enter project folder directory:</h3>
          <input
            type="text"
            value={directoryPath}
            onChange={(e) => setDirectoryPath(e.target.value)}
            placeholder="Enter full path to your project directory. Example: (C:\Users\username\my-project)"
            defaultValue={"C:\\Users\\hakim\\Desktop\\yaml-parser-real\\test"}
            //this value should be written by default.
            className="directory-input"
          />
          <p className="help-text">
            Application will scan the project directory and look for config/
            and deployment/ subdirectories.
          </p>
        </div>

        <button onClick={parseYAML} disabled={loading} className="parse-button">
          {loading ? "Getting Relationships..." : "Get Relationship Graph"}
        </button>

        {error && <div className="error-message">Error: {error}</div>}

        {result && (
          <div className="results-section">
            <div className="results-header">
              <h2>Results...</h2>
              <div className="stats">
                <span className="stat">
                  {result.total_dependencies} publish/subscribe events found.
                </span>
                {result.scanned_files && (
                  <span className="stat">
                    {result.scanned_files.length} files scanned.
                  </span>
                )}
                {result.microservices && (
                  <span className="stat">
                    {result.microservices.length} microservices detected.
                  </span>
                )}
                {result.total_dependency_count && (
                  <span className="stat">
                    {result.total_dependency_count} total dependencies found.
                  </span>
                )}
              </div>
            </div>

          

            {result.microservices && result.microservices.length > 0 && (
              <div className="microservices-section">
                <DependencyGraph
                  dependencies={result.dependencies || []}
                  microservices={result.microservices || []}
                  total_dependency_count={result.total_dependency_count || 0}
                />
                <MicroserviceList microservices={result.microservices} />
              </div>
            )}

            {(!result.microservices || result.microservices.length === 0) && (
              <div className="dependencies-section">
                <h3>Dependencies Discovered:</h3>
                {result.dependencies && result.dependencies.length > 0 ? (
                  <div className="dependencies-grid">
                    {result.dependencies.map((dep, index) => (
                      <DependencyCard dependency={dep} index={index} />
                    ))}
                  </div>
                ) : (
                  <p className="no-dependencies">no dependencies found</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
