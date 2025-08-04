import os
import re

class MicroserviceTopics:
    def __init__(self):
        self.produces = set()
        self.subscribes = set()

class YamlParser:
    TOPIC_PATTERN = re.compile(r"([^.]+)\.([^.]+)\.(.*?)(?:\.event|$)")
    DOC_TOPIC_PATTERN = re.compile(r"\*\*[Tt]opic:\*\*\s*`([^`]+)`", re.IGNORECASE)

    def __init__(self, base_dir):
        self.base_directory = base_dir
        self.config_directory = os.path.join(base_dir, "deployment", "config")
        self.doc_directory = os.path.join(base_dir, "doc")
        self.microservice_topics_map = {}

    def process_all_microservices(self):
        self.process_subscription_configs()
        self.process_producer_docs()

    def process_subscription_configs(self):
        if not os.path.isdir(self.config_directory):
            raise IOError(f"Config directory does not exist: {self.config_directory}")
        
        for root, _, files in os.walk(self.config_directory):
            for filename in files:
                if filename.endswith((".yaml", ".yml")):
                    filepath = os.path.join(root, filename)
                    self.process_subscription_config(filepath)

    def process_subscription_config(self, filepath):
        filename = os.path.basename(filepath)
        service_name = filename[:filename.rfind(".")].replace("-service", "").replace("-", "")
        
        consumed_topics = []
        topic_map = {}

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                lines = content.splitlines()

            # Build topic map from topic definitions
            self._build_topic_map(lines, topic_map)
            
            # Extract consumed topics from consumers section
            self._extract_consumed_topics(lines, consumed_topics)
            
            # Extract topics from placeholders using regex
            self._extract_placeholder_topics(content, topic_map, consumed_topics)

            # Add consumed topics to microservice
            if service_name and consumed_topics:
                if service_name not in self.microservice_topics_map:
                    self.microservice_topics_map[service_name] = MicroserviceTopics()

                for topic in consumed_topics:
                    actual_topic = self._resolve_topic_placeholder(topic, topic_map)
                    if actual_topic:
                        self.microservice_topics_map[service_name].subscribes.add(actual_topic)
                        print(f"Consumer '{service_name}' subscribes to topic: '{actual_topic}'")

        except Exception as e:
            print(f"Error processing config file {filepath}: {e}")

    def _build_topic_map(self, lines, topic_map):
        """Extract topic definitions from the topics section"""
        in_topic_definition_section = False
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            if line.startswith("spring:"):
                in_topic_definition_section = False
            elif line == "topics:":
                in_topic_definition_section = True
            elif in_topic_definition_section and "event:" in line:
                topic_path = line.split(":", 1)[1].strip()
                topic_key = line.split(":", 1)[0].strip()
                
                # Find parent context
                parent_context = self._find_parent_context(lines, i)
                topic_variable = f"topics.{parent_context + '.' if parent_context else ''}{topic_key}"
                topic_map[topic_variable] = topic_path
            elif in_topic_definition_section and line and not line.startswith(" "):
                in_topic_definition_section = False

    def _find_parent_context(self, lines, current_index):
        """Find parent context for topic definition"""
        current_indent = len(lines[current_index]) - len(lines[current_index].lstrip())
        
        for j in range(current_index - 1, max(0, current_index - 5), -1):
            prev_line = lines[j].strip()
            prev_indent = len(lines[j]) - len(lines[j].lstrip())
            
            if prev_line.endswith(":") and prev_indent < current_indent:
                return prev_line.rstrip(":")
        return ""

    def _extract_consumed_topics(self, lines, consumed_topics):
        """Extract topics from consumers section"""
        in_consumer_section = False
        in_topics_section = False
        
        for line in lines:
            line = line.strip()
            
            if line.startswith("consumers:"):
                in_consumer_section = True
            elif in_consumer_section and line.startswith("topics:"):
                in_topics_section = True
            elif in_consumer_section and in_topics_section and line.startswith("-"):
                topic = line[1:].strip()
                consumed_topics.append(topic)
            elif in_topics_section and line and not line.startswith("-") and not line.startswith(" "):
                in_topics_section = False
            elif in_consumer_section and line and not line.startswith(" ") and not line.startswith("consumers:"):
                in_consumer_section = False

    def _extract_placeholder_topics(self, content, topic_map, consumed_topics):
        """Extract topics from ${topics.xxx.event} placeholders"""
        for topic_match in re.finditer(r"(\$\{topics\.[\w.-]+(?:\.[\w.-]+)*\.event\})", content):
            topic_placeholder = topic_match.group(1)
            topic_key = topic_placeholder[2:-1]  # Remove ${ and }
            actual_topic = topic_map.get(topic_key, topic_key)
            
            if actual_topic and actual_topic not in consumed_topics:
                consumed_topics.append(actual_topic)

    def _resolve_topic_placeholder(self, topic, topic_map):
        """Resolve topic placeholder to actual topic"""
        if topic.startswith("${") and topic.endswith("}"):
            topic_var = topic[2:-1]
            return topic_map.get(topic_var, "")
        return topic

    def process_producer_docs(self):
        if not os.path.isdir(self.doc_directory):
            raise IOError(f"Documentation directory does not exist: {self.doc_directory}")
        
        known_microservices = set(self.microservice_topics_map.keys())
        
        for root, _, files in os.walk(self.doc_directory):
            for filename in files:
                if filename.endswith((".yaml", ".yml")):
                    filepath = os.path.join(root, filename)
                    matched_service = self._find_matching_microservice(filepath, known_microservices)
                    if matched_service:
                        self.process_producer_doc(filepath, matched_service)

    def _find_matching_microservice(self, doc_filepath, known_microservices):
        """Find matching microservice using multiple strategies"""
        filename = os.path.basename(doc_filepath)
        base_filename = filename[:filename.rfind(".")].replace("-service", "").replace("-", "").lower()
        
        # Strategy 1: Direct match
        for ms_name in known_microservices:
            normalized_ms = ms_name.lower().replace("-", "").replace("_", "")
            normalized_filename = base_filename.replace("_", "")
            
            if normalized_ms == normalized_filename:
                return ms_name

        # Strategy 2: Partial match
        for ms_name in known_microservices:
            normalized_ms = ms_name.lower().replace("-", "").replace("_", "")
            normalized_filename = base_filename.replace("_", "")
            
            if normalized_ms in normalized_filename or normalized_filename in normalized_ms:
                return ms_name
        
        # Strategy 3: Word matching
        filename_words = base_filename.replace("-", " ").replace("_", " ").split()
        for ms_name in known_microservices:
            ms_words = ms_name.lower().replace("-", " ").replace("_", " ").split()
            for ms_word in ms_words:
                if len(ms_word) > 2 and ms_word in filename_words:
                    return ms_name
        
        # Strategy 4: Title-based matching
        return self._match_by_title(doc_filepath, known_microservices)

    def _match_by_title(self, doc_filepath, known_microservices):
        """Match microservice by document title"""
        try:
            with open(doc_filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            title_match = re.search(r'title:\s*([^\n]+)', content, re.IGNORECASE)
            if not title_match:
                return None
                
            title = title_match.group(1).strip().strip('"').strip("'")
            normalized_title = title.lower().replace(" service", "").replace(" api", "").replace("-", "").replace("_", "").replace(" ", "")
            
            # Direct title match
            for ms_name in known_microservices:
                normalized_ms = ms_name.lower().replace("-", "").replace("_", "")
                if normalized_ms == normalized_title or normalized_ms in normalized_title or normalized_title in normalized_ms:
                    return ms_name
            
            # Word-based title matching
            title_words = title.lower().replace("-", " ").replace("_", " ").split()
            for ms_name in known_microservices:
                ms_words = ms_name.lower().replace("-", " ").replace("_", " ").split()
                for ms_word in ms_words:
                    if len(ms_word) > 2 and ms_word in title_words:
                        return ms_name
                        
        except Exception as e:
            print(f"Error reading title from {doc_filepath}: {e}")
        
        return None

    def process_producer_doc(self, filepath, service_name):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            for match in self.DOC_TOPIC_PATTERN.finditer(content):
                topic = match.group(1)
                topic_position = match.start()
                
                if self._is_in_domain_event_section(content, topic_position):
                    self.microservice_topics_map[service_name].produces.add(topic)
                    print(f"Producer '{service_name}' produces topic: '{topic}'")
                    
        except Exception as e:
            print(f"Error processing doc file {filepath}: {e}")
    
    def _is_in_domain_event_section(self, content, topic_position):
        """Check if topic is in a domain event section"""
        lines_before_topic = content[:topic_position].split('\n')
        
        for i in range(len(lines_before_topic) - 1, -1, -1):
            line = lines_before_topic[i].strip()
            
            if re.match(r'^\s*/[^:]*:\s*$', lines_before_topic[i]):
                lines_after_path = content[topic_position:].split('\n')
                combined_lines = lines_before_topic[i:] + lines_after_path
                
                in_tags_section = False
                tags_content = []
                
                for line_text in combined_lines:
                    line_stripped = line_text.strip()
                    
                    if line_stripped == "tags:":
                        in_tags_section = True
                        continue
                    
                    if in_tags_section:
                        if line_text and not line_text.startswith((' ', '\t')):
                            break
                        tags_content.append(line_stripped)
                
                tags_text = ' '.join(tags_content).lower()
                return 'domainevent' in tags_text.replace(' ', '') or 'domain event' in tags_text
        
        return False

    def extract_microservice_name_from_topic(self, topic):
        """Extract microservice name from topic pattern"""
        match = self.TOPIC_PATTERN.match(topic)
        return match.group(2) if match else None

    def build_dependency_graph(self):
        """Build dependency graph by matching microservice name parts"""
        print("\n--- Building Dependency Graph ---")

        # Build reverse index: microservice name part -> producers
        ms_name_part_to_producers = {}
        for producer_service, topics_obj in self.microservice_topics_map.items():
            for topic in topics_obj.produces:
                ms_name_part = self.extract_microservice_name_from_topic(topic)
                if ms_name_part:
                    if ms_name_part not in ms_name_part_to_producers:
                        ms_name_part_to_producers[ms_name_part] = set()
                    ms_name_part_to_producers[ms_name_part].add(producer_service)

        # Build dependencies
        dependencies = {service: set() for service in self.microservice_topics_map}
        
        for consumer_service, topics_obj in self.microservice_topics_map.items():
            for subscribed_topic in topics_obj.subscribes:
                subscribed_ms_name_part = self.extract_microservice_name_from_topic(subscribed_topic)
                
                if subscribed_ms_name_part and subscribed_ms_name_part in ms_name_part_to_producers:
                    producers = ms_name_part_to_producers[subscribed_ms_name_part]
                    filtered_producers = {p for p in producers if p != consumer_service}
                    
                    if filtered_producers:
                        dependencies[consumer_service].update(filtered_producers)
                        print(f"'{consumer_service}' depends on {filtered_producers}")
            
        return dependencies

    def get_all_microservice_names(self):
        return set(self.microservice_topics_map.keys())

    def get_microservice_topic_map(self):
        return self.microservice_topics_map
    
    def get_total_dependency_count(self):
        dependencies = self.build_dependency_graph()
        return sum(len(dep_set) for dep_set in dependencies.values())

# Test
if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(os.path.dirname(current_dir), "test")
    parser = YamlParser(base_dir)
    parser.process_all_microservices()
    
    print("\nMicroservice Topics:")
    for name in parser.get_all_microservice_names():
        topics = parser.get_microservice_topic_map()[name]
        print(f"{name}:")
        print(f"  Produced: {topics.produces}")
        print(f"  Subscribed: {topics.subscribes}")
    
    dependencies = parser.build_dependency_graph()
    print("\nMicroservice Dependencies:")
    for service, deps in dependencies.items():
        print(f"{service} depends on: {deps}")
    
    print(f"\nTotal dependency count: {parser.get_total_dependency_count()}")