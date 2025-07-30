import os
import re

class MicroserviceTopics:
    def __init__(self):
        #duplicates are not allowed
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
        
        # Recursively walk through all subdirectories in the config directory
        for root, dirs, files in os.walk(self.config_directory):
            for filename in files:
                if filename.endswith(".yaml") or filename.endswith(".yml"):
                    filepath = os.path.join(root, filename)
                    self.process_subscription_config(filepath)

    def process_subscription_config(self, filepath):
        service_name = None
        consumed_topics = []
        topic_map = {}

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()

            in_consumer_section = False
            in_topics_section = False
            in_topic_definition_section = False

            for i, line in enumerate(lines):
                line = line.strip()

                if line.startswith("spring:"):
                    in_topic_definition_section = False

                filename = os.path.basename(filepath)
                service_name = filename[:filename.rfind(".")].replace("-service", "").replace("-", "")

                if line == "topics:":
                    in_topic_definition_section = True
                    in_consumer_section = False
                    continue

                if in_topic_definition_section and "event:" in line:
                    topic_path = line.split(":", 1)[1].strip()
                    topic_key = line.split(":", 1)[0].strip()
                    parent_context = ""
                    # 5 satir geriye kadar parent contexti ara.
                    for j in range(max(0, i-5), i)[::-1]:
                        prev_line = lines[j].strip()
                        if prev_line.endswith(":") and prev_line.find(prev_line.strip()) < line.find(line.strip()):
                            parent_context = prev_line.replace(":", "")
                            break
                    topic_variable = f"topics.{parent_context + '.' if parent_context else ''}{topic_key}"
                    topic_map[topic_variable] = topic_path

                if line.startswith("consumers:"):
                    in_consumer_section = True
                    in_topic_definition_section = False
                    continue

                if in_consumer_section and line.startswith("topics:"):
                    in_topics_section = True
                    continue

                if in_consumer_section and in_topics_section and line.startswith("-"):
                    topic = line[1:].strip()
                    consumed_topics.append(topic)

                if in_topics_section and line and not line.startswith("-") and not line.startswith(" "):
                    in_topics_section = False
                if in_consumer_section and line and not line.startswith(" "):
                    in_consumer_section = False
                if in_topic_definition_section and line and not line.startswith(" "):
                    in_topic_definition_section = False

            if service_name:
                if service_name not in self.microservice_topics_map:
                    self.microservice_topics_map[service_name] = MicroserviceTopics()
                for topic in consumed_topics:
                    actual_topic = topic
                    if topic.startswith("${") and topic.endswith("}"):
                        topic_var = topic[2:-1]
                        actual_topic = topic_map.get(topic_var, "")
                    if actual_topic:
                        microservice_name = self.extract_microservice_name_from_topic(actual_topic)
                        if microservice_name:
                            self.microservice_topics_map[service_name].subscribes.add(microservice_name)
        except Exception as e:
            print(f"Error processing config file {filepath}: {e}")

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            if not service_name:
                match = re.search(r"name:\s*([\w-]+)", content)
                if match:
                    service_name = match.group(1).replace("-service", "")
            if not service_name:
                filename = os.path.basename(filepath)
                service_name = filename[:filename.rfind(".")].replace("-service", "").replace("-", "")
            if service_name:
                if service_name not in self.microservice_topics_map:
                    self.microservice_topics_map[service_name] = MicroserviceTopics()
                for topic_match in re.finditer(r"\$\{topics\.(\w+)\.event\}", content):
                    subscribed_service = topic_match.group(1)
                    self.microservice_topics_map[service_name].subscribes.add(subscribed_service)
        except Exception as e:
            print(f"Error with regex parsing for {filepath}: {e}")

    def process_producer_docs(self):
        if not os.path.isdir(self.doc_directory):
            raise IOError(f"Documentation directory does not exist: {self.doc_directory}")
        
        # collect all known microservice names from config processing
        known_microservices = set(self.microservice_topics_map.keys())
        
        # recursively searching the subdirectories
        for root, dirs, files in os.walk(self.doc_directory):
            for filename in files:
                if filename.endswith(".yaml") or filename.endswith(".yml"):
                    filepath = os.path.join(root, filename)
                    
                    matched_service = self._find_matching_microservice(filepath, known_microservices)
                    if matched_service:
                        self.process_producer_doc(filepath, matched_service)

    def _find_matching_microservice(self, doc_filepath, known_microservices):
        """ we try really hard to match a doc file with a known microservice name with some "strategies" ( ;-;)"""
        filename = os.path.basename(doc_filepath)
        base_filename = filename[:filename.rfind(".")].replace("-service", "").replace("-", "").lower()
        
        # strategy 1: direct match
        for ms_name in known_microservices:
            normalized_ms_name = ms_name.lower().replace("-", "").replace("_", "")
            normalized_filename = base_filename.replace("_", "")
            
            if normalized_ms_name == normalized_filename:
                return ms_name

        # strategy 2: partial match -> if file_name.contains() microservice name
        for ms_name in known_microservices:
            normalized_ms_name = ms_name.lower().replace("-", "").replace("_", "")
            normalized_filename = base_filename.replace("_", "")
            
            if normalized_ms_name in normalized_filename or normalized_filename in normalized_ms_name:
                return ms_name
        
        # strategy 3: check each word slicing the filename
        filename_words = base_filename.replace("-", " ").replace("_", " ").split()
        for ms_name in known_microservices:
            ms_words = ms_name.lower().replace("-", " ").replace("_", " ").split()
            # if any significant word matches (length > 2  because it can be short prefixes like "ms", "api")
            for ms_word in ms_words:
                if len(ms_word) > 2 and ms_word in filename_words:
                    return ms_name
        
        # strategy 4: try to find from yaml title >:(
        try:
            with open(doc_filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            
            title_match = re.search(r'title:\s*([^\n]+)', content, re.IGNORECASE)
            if title_match:
                title = title_match.group(1).strip().strip('"').strip("'")
                
                normalized_title = title.lower().replace(" service", "").replace(" api", "").replace("-", "").replace("_", "").replace(" ", "")
                
                # direct match with title (hopefully)
                for ms_name in known_microservices:
                    normalized_ms_name = ms_name.lower().replace("-", "").replace("_", "")
                    if normalized_ms_name == normalized_title:
                        return ms_name
                
                # partial match with title
                for ms_name in known_microservices:
                    normalized_ms_name = ms_name.lower().replace("-", "").replace("_", "")
                    if normalized_ms_name in normalized_title or normalized_title in normalized_ms_name:
                        return ms_name
                
                # words matching with title
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
            
            # Find all topic patterns with their positions
            for match in self.DOC_TOPIC_PATTERN.finditer(content):
                topic = match.group(1)
                topic_position = match.start()
                
                # Check if this topic is within a domain event section
                if self._is_in_domain_event_section(content, topic_position):
                    produced_microservice_name = self.extract_microservice_name_from_topic(topic)
                    if produced_microservice_name:
                        self.microservice_topics_map[service_name].produces.add(produced_microservice_name)
        except Exception as e:
            print(f"Error processing doc file {filepath}: {e}")
    
    def _is_in_domain_event_section(self, content, topic_position):
        """check if the topic at the given position is in a domain event section"""
        # pattern search ediyoruz normalde, ama **topic** yakaladıktan sonra hemen geriye bakacağız doğru tag de miyiz 
        lines_before_topic = content[:topic_position].split('\n')
        
        # Search backwards for the nearest path definition and its tags
        for i in range(len(lines_before_topic) - 1, -1, -1):
            line = lines_before_topic[i].strip()
            
            # looking for a clean path :
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
                        
                        if line_text and not line_text.startswith(' ') and not line_text.startswith('\t'):
                            break
                        tags_content.append(line_stripped)
                
                #  find any tag contains "domain event" not case sensitive
                tags_text = ' '.join(tags_content).lower()
                return 'domainevent' in tags_text.replace(' ', '') or 'domain event' in tags_text
        
        return False

    #X.microserviceadi.event olarak dusunup mikroservis isimlerini buradan cekiyoruz.
    def extract_microservice_name_from_topic(self, topic):
        match = self.TOPIC_PATTERN.match(topic)
        if match:
            return match.group(2)
        return None

    def build_dependency_graph(self):
        dependencies = {service: set() for service in self.microservice_topics_map}
        for consumer, topics in self.microservice_topics_map.items():
            for subscribed in topics.subscribes:
                for producer, prod_topics in self.microservice_topics_map.items():
                    if producer == consumer:
                        continue
                    if subscribed in prod_topics.produces:
                        dependencies[consumer].add(producer)
        return dependencies

    def get_all_microservice_names(self):
        return set(self.microservice_topics_map.keys())

    def get_microservice_topic_map(self):
        return self.microservice_topics_map
    
    def get_total_dependency_count(self):
        dependencies = self.build_dependency_graph()
        return sum(len(dep_set) for dep_set in dependencies.values())

# test
if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.join(os.path.dirname(current_dir), "test")
    parser = YamlParser(base_dir)
    parser.process_all_microservices()
    print("Lamine Yaml xD")
    for name in parser.get_all_microservice_names():
        topics = parser.get_microservice_topic_map()[name]
        print(f"{name}:")
        print(f"  Produces topics for: {topics.produces}")
        print(f"  Subscribes to topics from: {topics.subscribes}")
    dependencies = parser.build_dependency_graph()
    print("\n Microservice Dependencies:")
    for service, deps in dependencies.items():
        print(f"{service} depends on: {deps}")
    
    # Test için dependency count da yazdıralım
    print(f"\nTotal dependency count: {parser.get_total_dependency_count()}")

    print("\nAll microservice names:")
    print(parser.get_all_microservice_names())

    #print(dependencies)

    # dependency ile ilgili aciklama
    # The dependency graph is built by matching the microservices a service subscribes to
    # (topics.subscribes) with the microservices that produce those topics (topics.produces).
    # If a service subscribes to "example" but no microservice is found that produces "example",
    # then no dependency is recorded. This can happen if:
    # - No documentation file for "example" microservice exists in the doc directory,
    # - Or the documentation does not declare any produced topics for "example",
    # - Or the topic extraction logic does not match the topic name as expected.
    # As a result, the user appears to subscribe to "example", but is not dependent on it
    # in the dependency graph, because "example" is not found as a producer.
