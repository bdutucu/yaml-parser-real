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

    def _derive_service_name(self, filepath: str) -> str:
        """Derive microservice name from filename or containing folder.
        - Keep hyphens in names (e.g., air-defence-grid)
        - Strip common env/config suffixes like -dev, -runtime-config, -persistence
        - Strip a trailing -service if present
        - Fallback to folder name when filename is generic like application
        """
        base_name = os.path.splitext(os.path.basename(filepath))[0]
        # Remove trailing known suffixes
        base_name = re.sub(r"-(dev|runtime-config|persistence)$", "", base_name, flags=re.IGNORECASE)
        base_name = re.sub(r"-service$", "", base_name, flags=re.IGNORECASE)

        # Fallbacks for generic filenames
        if base_name.lower() in {"application", "config", "settings", "dockerfile", "topics"} or not base_name:
            base_name = os.path.basename(os.path.dirname(filepath))

        # Normalize underscores to hyphens for consistency
        base_name = base_name.replace("_", "-")
        return base_name

    def process_subscription_config(self, filepath):
        filename = os.path.basename(filepath)
        service_name = self._derive_service_name(filepath)
        
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

        except Exception as e:
            print(f"Error processing config file {filepath}: {e}")

    def _build_topic_map(self, lines, topic_map):
        """Extract topic definitions from the topics section, preserving full nested path"""
        in_topic_definition_section = False
        topics_indent = None
        # Stack of tuples: (indent, key)
        path_stack = []
        
        for i, raw_line in enumerate(lines):
            stripped = raw_line.strip()
            indent = len(raw_line) - len(raw_line.lstrip(' '))
            
            if not stripped:
                continue
            
            if stripped.startswith("spring:"):
                in_topic_definition_section = False
                topics_indent = None
                path_stack = []
                continue
            
            if stripped == "topics:":
                in_topic_definition_section = True
                topics_indent = indent
                path_stack = []
                continue
            
            if not in_topic_definition_section:
                continue
            
            # Exit section when indentation goes back to or above topics level
            if indent <= (topics_indent or 0):
                in_topic_definition_section = False
                topics_indent = None
                path_stack = []
                continue
            
            
            if stripped.endswith(":"):
                key = stripped[:-1].strip()
                # Pop until current indent is greater than top
                while path_stack and indent <= path_stack[-1][0]:
                    path_stack.pop()
                path_stack.append((indent, key))
                continue
            
            # Map event definitions to their full topic variable path
            if "event:" in stripped:
                # Extract the mapping value on the right of the first ':'
                topic_path = stripped.split(":", 1)[1].strip()
                # Build full path under topics
                keys_only = [k for _, k in path_stack]
                full_var = "topics." + (".".join(keys_only + ["event"]) if keys_only else "event")
                topic_map[full_var] = topic_path
        
        # No explicit return; topic_map is mutated in place

    def _find_parent_context(self, lines, current_index):
        """Find parent context for topic definition (immediate parent key)"""
        current_indent = len(lines[current_index]) - len(lines[current_index].lstrip(' '))
        
        for j in range(current_index - 1, -1, -1):
            prev_line = lines[j]
            prev_stripped = prev_line.strip()
            prev_indent = len(prev_line) - len(prev_line.lstrip(' '))
            
            if prev_stripped.endswith(":") and prev_indent < current_indent:
                # return the key without trailing ':'
                return prev_stripped.rstrip(":")
        return ""

    def _extract_consumed_topics(self, lines, consumed_topics):
        """Extract topics from consumers section"""
        in_consumer_section = False
        in_topics_section = False
        consumers_indent = None
        topics_indent = None
        
        for raw_line in lines:
            stripped = raw_line.strip()
            indent = len(raw_line) - len(raw_line.lstrip(' '))
            
            if stripped.startswith("consumers:"):
                in_consumer_section = True
                consumers_indent = indent
                in_topics_section = False
                topics_indent = None
                continue

            if in_consumer_section:
                # Exit consumers section if indentation goes back
                if stripped and consumers_indent is not None and indent <= consumers_indent and not stripped.startswith("consumers:"):
                    in_consumer_section = False
                    in_topics_section = False
                    topics_indent = None
                    # do not continue; evaluate line in outer loop context
                
                if stripped.startswith("topics:"):
                    in_topics_section = True
                    topics_indent = indent
                    continue
                
                if in_topics_section:
                    # Exit topics section if indentation goes back
                    if stripped and topics_indent is not None and indent <= topics_indent and not stripped.startswith("-"):
                        in_topics_section = False
                    elif stripped.startswith("-"):
                        topic = stripped[1:].strip()
                        consumed_topics.append(topic)

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
        """Find matching microservice using multiple strategies with improved word matching"""
        filename = os.path.basename(doc_filepath)
        base_filename = filename[:filename.rfind(".")].lower()
        
        # Remove common API/service suffixes
        base_filename = re.sub(r'\s+(api|service|openapi|swagger)$', '', base_filename)
        
        # Strategy 1: Direct normalized match (remove all separators)
        normalized_filename = re.sub(r'[^a-z0-9]', '', base_filename)
        for ms_name in known_microservices:
            normalized_ms = re.sub(r'[^a-z0-9]', '', ms_name.lower())
            if normalized_ms == normalized_filename:
                return ms_name

        # Strategy 2: Partial match
        for ms_name in known_microservices:
            normalized_ms = re.sub(r'[^a-z0-9]', '', ms_name.lower())
            if normalized_ms and len(normalized_ms) > 3 and (normalized_ms in normalized_filename or normalized_filename in normalized_ms):
                return ms_name
        
        # Strategy 3: Smart word matching - handle abbreviations
        filename_words = re.findall(r'[a-z]+', base_filename)
        
        # Sort microservices by length to check shorter names first (more likely to be exact matches)
        sorted_microservices = sorted(known_microservices, key=len)
        
        for ms_name in sorted_microservices:
            ms_words = re.findall(r'[a-z]+', ms_name.lower())
            
            # Check for abbreviation match (e.g., "aap" matches "area air picture")
            # Look for single short words that could be abbreviations
            for word in filename_words:
                if len(word) <= 4:
                    # Try direct match first (e.g., "aap" matches "aap")
                    if word == ms_name.lower():
                        return ms_name
                    # Try abbreviation match
                    if self._matches_abbreviation(word, ms_words):
                        return ms_name
            
            # Also check if the full microservice name appears as a single word in filename
            for ms_word in ms_words:
                if ms_word in filename_words and len(ms_word) > 2:
                    return ms_name
            
            # Check for significant word overlap
            significant_ms_words = [w for w in ms_words if len(w) > 2]
            significant_filename_words = [w for w in filename_words if len(w) > 2]
            shared = set(significant_ms_words) & set(significant_filename_words)
            if len(shared) >= min(2, len(significant_ms_words)):
                return ms_name
        
        # Strategy 4: Title-based matching
        return self._match_by_title(doc_filepath, known_microservices)

    def _matches_abbreviation(self, abbrev, words):
        """Check if abbreviation matches first letters of words"""
        if len(abbrev) != len(words):
            return False
        return all(abbrev[i] == word[0] for i, word in enumerate(words))

    def _match_by_title(self, doc_filepath, known_microservices):
        """Match microservice by document title"""
        try:
            with open(doc_filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            title_match = re.search(r'title:\s*([^\n]+)', content, re.IGNORECASE)
            if not title_match:
                return None
                
            title = title_match.group(1).strip().strip('"').strip("'")
            
            # Remove common suffixes
            title = re.sub(r'\s+(api|service)$', '', title, flags=re.IGNORECASE)
            normalized_title = re.sub(r'[^a-z0-9]', '', title.lower())
            
            # Direct title match
            for ms_name in known_microservices:
                normalized_ms = re.sub(r'[^a-z0-9]', '', ms_name.lower())
                if normalized_ms == normalized_title:
                    return ms_name
            
            # Word-based title matching with abbreviation support
            title_words = re.findall(r'[a-z]+', title.lower())
            for ms_name in known_microservices:
                ms_words = re.findall(r'[a-z]+', ms_name.lower())
                
                # Check abbreviation in title
                if len(title_words) >= 3:
                    potential_abbrev = ''.join(word[0] for word in title_words[:3])
                    if potential_abbrev in [w for w in ms_words if len(w) <= 4]:
                        return ms_name
                
                # Word overlap
                significant_ms_words = [w for w in ms_words if len(w) > 2]
                significant_title_words = [w for w in title_words if len(w) > 2]
                shared = set(significant_ms_words) & set(significant_title_words)
                if len(shared) >= min(2, len(significant_ms_words)):
                    return ms_name
                        
        except Exception as e:
            print(f"Error reading title from {doc_filepath}: {e}")
        
        return None

    def process_producer_doc(self, filepath, service_name):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            # Initialize microservice if not exists
            if service_name not in self.microservice_topics_map:
                self.microservice_topics_map[service_name] = MicroserviceTopics()

            # Find all topic declarations
            for match in self.DOC_TOPIC_PATTERN.finditer(content):
                topic = match.group(1)
                topic_position = match.start()
                
                # Check if this is a domain event by examining the surrounding context
                if self._is_domain_event_topic(content, topic_position):
                    self.microservice_topics_map[service_name].produces.add(topic)
                    
        except Exception as e:
            print(f"Error processing doc file {filepath}: {e}")
    
    def _is_domain_event_topic(self, content, topic_position):
        """Check if topic is a domain event by examining surrounding context"""
        # Look for domain event indicators in the path or description
        lines_before = content[:topic_position].split('\n')
        lines_after = content[topic_position:].split('\n')
        
        # Check the path/endpoint context (lines before)
        for i in range(len(lines_before) - 1, max(-1, len(lines_before) - 10), -1):
            line = lines_before[i].strip()
            
            # Look for path definitions that might indicate events
            if re.match(r'^\s*/[^:]*:\s*$', lines_before[i]):
                # Found a path, now look for tags section
                combined_lines = lines_before[i:] + lines_after[:20]  # Look ahead a bit
                
                in_tags_section = False
                for line_text in combined_lines:
                    line_stripped = line_text.strip()
                    
                    if line_stripped == "tags:":
                        in_tags_section = True
                        continue
                    
                    if in_tags_section:
                        if line_text and not line_text.startswith((' ', '\t')):
                            break
                        # Look for domain event indicators
                        if 'domainevent' in line_stripped.lower().replace(' ', '') or 'domain event' in line_stripped.lower():
                            return True
                break
        
        # Fallback: if topic ends with .event, likely a domain event
        lines_around_topic = lines_after[0] if lines_after else ""
        if '.event' in lines_around_topic:
            return True
            
        return False

    def extract_microservice_name_from_topic(self, topic):
        """Extract microservice name from topic pattern"""
        match = self.TOPIC_PATTERN.match(topic)
        return match.group(2) if match else None

    def normalize_topic_name(self, name):
        """Normalize topic names for comparison by removing separators and converting to lowercase"""
        if not name:
            return ""
        # Better camelCase to hyphen conversion
        # Handle sequences like "c2ResourceManagement" -> "c2-resource-management"
        # First pass: insert hyphens before uppercase letters that follow lowercase/digits
        name = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name)
        # Second pass: handle consecutive uppercase letters like "XMLHttpRequest" -> "XML-Http-Request"
        name = re.sub(r'([A-Z])([A-Z][a-z])', r'\1-\2', name)
        # Remove all separators and convert to lowercase
        normalized = re.sub(r'[^a-z0-9]', '', name.lower())
        
        # Debug output for c2ResourceManagement case
        if 'c2resource' in name.lower() or 'c2-resource' in name.lower():
            print(f"DEBUG NORMALIZE: '{name}' -> '{normalized}'")
        
        return normalized

    def find_matching_producer_topics(self, consumer_topic, all_producer_topics):
        """Find producer topics that match a consumer topic using fuzzy matching"""
        consumer_ms_part = self.extract_microservice_name_from_topic(consumer_topic)
        if not consumer_ms_part:
            return []
        
        normalized_consumer = self.normalize_topic_name(consumer_ms_part)
        matching_topics = []
        
        for producer_topic in all_producer_topics:
            producer_ms_part = self.extract_microservice_name_from_topic(producer_topic)
            if producer_ms_part:
                normalized_producer = self.normalize_topic_name(producer_ms_part)
                if normalized_consumer == normalized_producer:
                    matching_topics.append(producer_topic)
        
        return matching_topics

    def build_dependency_graph(self):
        """Build dependency graph by matching microservice name parts with fuzzy matching"""
        print("\n--- Building Dependency Graph ---")

        # Collect all producer topics and map them to their services
        all_producer_topics = set()
        topic_to_producers = {}
        
        for producer_service, topics_obj in self.microservice_topics_map.items():
            for topic in topics_obj.produces:
                all_producer_topics.add(topic)
                if topic not in topic_to_producers:
                    topic_to_producers[topic] = set()
                topic_to_producers[topic].add(producer_service)

        # Build dependencies using fuzzy topic matching
        dependencies = {service: set() for service in self.microservice_topics_map}
        
        for consumer_service, topics_obj in self.microservice_topics_map.items():
            for subscribed_topic in topics_obj.subscribes:
                # Find matching producer topics using fuzzy matching
                matching_producer_topics = self.find_matching_producer_topics(subscribed_topic, all_producer_topics)
                
                for producer_topic in matching_producer_topics:
                    producers = topic_to_producers.get(producer_topic, set())
                    filtered_producers = {p for p in producers if p != consumer_service}
                    
                    if filtered_producers:
                        dependencies[consumer_service].update(filtered_producers)
                        print(f"'{consumer_service}' depends on {filtered_producers} (consumer: {subscribed_topic} -> producer: {producer_topic})")
            
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