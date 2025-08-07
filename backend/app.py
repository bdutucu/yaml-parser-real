import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from yaml_parser import YamlParser

app = Flask(__name__)
CORS(app)

class YAMLParser:
    def __init__(self):
        self.supported_files = {
            'docker-compose': ['docker-compose.yml', 'docker-compose.yaml'],
            'kubernetes': ['*.yaml', '*.yml']
        }
    
    def scan_directory(self, directory_path):
        #delete the comment for docker build.
        #directory_path = "/app/projects/" + directory_path

        #this line for local testing only
        directory_path = os.path.abspath(directory_path)

        if not os.path.exists(directory_path):
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        all_dependencies = []
        microservices_data = []
        total_dependency_count = 0
        
        try:
            microservice_parser = YamlParser(directory_path)
            microservice_parser.process_all_microservices()
            ms_dependencies = microservice_parser.build_dependency_graph()
            ms_topic_map = microservice_parser.get_microservice_topic_map()
            for service_name, topics in ms_topic_map.items():
                microservices_data.append({
                    "name": service_name,
                    "produces": list(topics.produces),
                    "subscribes": list(topics.subscribes)
                })
            for service, deps in ms_dependencies.items():
                for dep in deps:
                    all_dependencies.append({
                        "name": dep,
                        "type": "microservice_dependency",
                        "description": f"Microservice {service} depends on {dep}",
                        "service": service,
                        "version": "",
                        "category": "microservice"
                    })
            # Topic-based communication bağımlılıkları oluştur
            # Topic eşleştirmesi için microservice name parçalarını kullan
            topic_name_to_producers = {}
            topic_name_to_consumers = {}
            
            # Producer topic'lerini microservice name parçalarına göre grupla
            for service, topics in ms_topic_map.items():
                for topic in topics.produces:
                    topic_name_part = microservice_parser.extract_microservice_name_from_topic(topic)
                    if topic_name_part:
                        topic_name_to_producers.setdefault(topic_name_part, []).append({
                            'service': service,
                            'topic': topic
                        })
            
            # Consumer topic'lerini microservice name parçalarına göre grupla  
            for service, topics in ms_topic_map.items():
                for topic in topics.subscribes:
                    topic_name_part = microservice_parser.extract_microservice_name_from_topic(topic)
                    if topic_name_part:
                        topic_name_to_consumers.setdefault(topic_name_part, []).append({
                            'service': service,
                            'topic': topic
                        })
            
            # aynı topic name parçasına sahip producer ve consumer'ları eşleştiriyoruz.
            for topic_name_part in set(topic_name_to_producers.keys()) & set(topic_name_to_consumers.keys()):
                producers = topic_name_to_producers.get(topic_name_part, [])
                consumers = topic_name_to_consumers.get(topic_name_part, [])
                
                for producer_info in producers:
                    for consumer_info in consumers:
                        if producer_info['service'] != consumer_info['service']:
                            all_dependencies.append({
                                "name": consumer_info['service'],
                                "type": "microservice_communication",  
                                "description": f"Microservice {producer_info['service']} communicates with {consumer_info['service']} via topic {topic_name_part}",
                                "source_service": producer_info['service'],
                                "target_service": consumer_info['service'], 
                                "topic": topic_name_part,
                                "version": "",
                                "category": "microservice_flow"
                            })
        except Exception as e:
            pass

        print(all_dependencies)
        print(len(all_dependencies))
        total_dependency_count = microservice_parser.get_total_dependency_count()

        return {
            "dependencies": all_dependencies,
            "total_dependencies": len(all_dependencies),
            "microservices": microservices_data,
            "total_dependency_count": total_dependency_count
            
        }

parser = YAMLParser()

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/parse', methods=['POST'])
def parse_yaml():
    try:
        data = request.get_json()
        if 'directory_path' in data:
            directory_path = data['directory_path']
            result = parser.scan_directory(directory_path)
            return jsonify(result)
        else:
            return jsonify({"error": "missing 'directory_path'"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-mermaid', methods=['POST'])
def generate_mermaid():
    try:
        data = request.get_json()
        dependencies = data.get('dependencies', [])
        #------for debug----------
        print("---------Dependencies---------")
        print(dependencies)
        microservices = data.get('microservices', [])
        mermaid_code = generate_mermaid_graph(dependencies, microservices)
        return jsonify({
            "success": True,
            "mermaid": mermaid_code
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def generate_mermaid_graph(dependencies, microservices):
    services = set()
    service_connections = []
    producers = set()
    consumers = set()
    for dep in dependencies:
        if dep.get('type') == 'microservice_communication':
            source = dep.get('source_service')
            target = dep.get('target_service')
            topic = dep.get('topic', '')
            if source and target:
                services.add(source)
                services.add(target)
                producers.add(source)
                consumers.add(target)
                service_connections.append({
                    'from': source,
                    'to': target,
                    'topic': topic
                })
        elif dep.get('type') == 'microservice_dependency':
            dependent_service = dep.get('service')  
            dependency = dep.get('name')           
            if dependent_service and dependency:
                services.add(dependent_service)
                services.add(dependency)
                service_connections.append({
                    'from': dependency,        # who provides the service
                    'to': dependent_service,   # who depends on it
                    'topic': ''
                })
    for ms in microservices:
        if isinstance(ms, dict) and 'name' in ms:
            services.add(ms['name'])
        elif isinstance(ms, str):
            services.add(ms)
    mermaid_lines = ['flowchart TD']
    pure_producers = producers - consumers
    pure_consumers = consumers - producers
    bidirectional = producers & consumers
    standalone = services - producers - consumers
    all_services = pure_producers | pure_consumers | bidirectional | standalone
    for service in sorted(all_services):
        clean_name = service.replace('-', '_').replace('.', '_')
        mermaid_lines.append(f'    {clean_name}[{service}]')
    if service_connections:
        unique_connections = []
        seen_connections = set()
        for conn in service_connections:
            conn_key = (conn['from'], conn['to'])
            if conn_key not in seen_connections:
                unique_connections.append(conn)
                seen_connections.add(conn_key)
        for conn in unique_connections:
            source_clean = conn['from'].replace('-', '_').replace('.', '_')
            target_clean = conn['to'].replace('-', '_').replace('.', '_')

            # mermaid arrows
            if conn['topic']:
                mermaid_lines.append(f'    {source_clean} -->|{conn["topic"]}| {target_clean}')
            else:
                mermaid_lines.append(f'    {source_clean} --> {target_clean}')
    mermaid_lines.extend([
        '',
        '    %% Styling',
        '    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,color:#333',
        '    classDef producer fill:#e8f5e8,stroke:#4caf50,stroke-width:2px,color:#2e7d32',
        '    classDef consumer fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#f57c00',
        '    classDef bidirectional fill:#e3f2fd,stroke:#2196f3,stroke-width:2px,color:#1565c0',
        '    classDef standalone fill:#f5f5f5,stroke:#757575,stroke-width:2px,color:#424242'
    ])
    for service in sorted(pure_producers):
        clean_name = service.replace('-', '_').replace('.', '_')
        mermaid_lines.append(f'    class {clean_name} producer')
    for service in sorted(pure_consumers):
        clean_name = service.replace('-', '_').replace('.', '_')
        mermaid_lines.append(f'    class {clean_name} consumer')
    for service in sorted(bidirectional):
        clean_name = service.replace('-', '_').replace('.', '_')
        mermaid_lines.append(f'    class {clean_name} bidirectional')
    for service in sorted(standalone):
        clean_name = service.replace('-', '_').replace('.', '_')
        mermaid_lines.append(f'    class {clean_name} standalone')
    return '\n'.join(mermaid_lines)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)