import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class YamlParser {

    private final String configDirectory;
    private final String docDirectory;
    private final Map<String, MicroserviceTopics> microserviceTopicsMap = new HashMap<>();

    // Format: x.microserviceName.event OR x.microserviceName.something.event
    private static final Pattern TOPIC_PATTERN = Pattern.compile("([^.]+)\\.([^.]+)\\.(.*?)(?:\\.event|$)");
    // Pattern to extract topic from doc yaml: **topic:**
    // 'ecommerce.microserviceName.event'
    private static final Pattern DOC_TOPIC_PATTERN = Pattern.compile("\\*\\*topic:\\*\\*\\s*'([^']+)'");

    /**
     * Data structure to represent a microservice's topics
     */
    static class MicroserviceTopics {
        Set<String> produces = new HashSet<>();
        Set<String> subscribes = new HashSet<>();
    }

    public YamlParser(String baseDir) {
       
        this.configDirectory = baseDir + "/deployment/config";
        this.docDirectory = baseDir + "/doc";
    }

    /**
     * Process all microservices to identify their topics
     */
    public void processAllMicroservices() throws IOException {
        // Process subscription configs
        processSubscriptionConfigs();

        // Process producer docs
        processProducerDocs();
    }

    /**
     * config subscription dosyalarinin hepsini processSubscriptionConfig metoduyla
     * parselayacagiz.
     */
    private void processSubscriptionConfigs() throws IOException {
        File configDir = new File(configDirectory);
        if (!configDir.exists() || !configDir.isDirectory()) {
            throw new IOException("Config directory does not exist: " + configDirectory);
        }

        for (File file : configDir.listFiles((dir, name) -> name.endsWith(".yaml") || name.endsWith(".yml"))) {
            processSubscriptionConfig(file);
        }
    }

    private void processSubscriptionConfig(File configFile) throws IOException {
        String serviceName = null;
        List<String> consumedTopics = new ArrayList<>();
        Map<String, String> topicMap = new HashMap<>(); // map to store topic variable to actual topic

        try (BufferedReader reader = new BufferedReader(new FileReader(configFile))) {
            String line;
            boolean inConsumerSection = false;
            boolean inTopicsSection = false;
            boolean inTopicDefinitionSection = false;

            while ((line = reader.readLine()) != null) {
                line = line.trim();

                // first we need to extract the service name
                if (line.startsWith("spring:")) {
                    inTopicDefinitionSection = false;
                }

                if (serviceName == null && line.startsWith("name:")) {
                    serviceName = line.substring(5).trim().replace("-service", "");
                }

                // looking for topic definitions it starts with ("topics:")
                if (line.equals("topics:")) {
                    inTopicDefinitionSection = true;
                    inConsumerSection = false;
                    continue;
                }

                // extracting topic definitions
                if (inTopicDefinitionSection && line.contains("event:")) {

                    // format might be like "event: ecommerce.payment.event"

                    String topicPath = line.substring(line.indexOf(':') + 1).trim();
                    String[] parts = line.split(":");
                    if (parts.length > 0) {
                        String topicKey = parts[0].trim(); // this might be "event" ya da random kelime, önemsiz.
                        String parentContext = "";

                        // find parent context (for example payment, order, etc.)
                        int indentLevel = line.indexOf(line.trim());
                        String previousLine = "";

                        try {
                            reader.mark(1000);
                            for (int i = 0; i < 5; i++) { // look back up to 5 lines
                                reader.reset();
                                for (int j = 0; j < i + 1; j++) {
                                    previousLine = reader.readLine();
                                }
                                if (previousLine != null && previousLine.trim().endsWith(":") &&
                                        previousLine.indexOf(previousLine.trim()) < indentLevel) {
                                    parentContext = previousLine.trim().replace(":", "");
                                    break;
                                }
                            }
                        } catch (IOException e) {

                        }

                        String topicVariable = "topics." + (parentContext.isEmpty() ? "" : parentContext + ".")
                                + topicKey;
                        topicMap.put(topicVariable, topicPath);
                    }
                }

                // detect consumer section
                if (line.startsWith("consumers:")) {
                    inConsumerSection = true;
                    inTopicDefinitionSection = false;
                    continue;
                }

                // inside consumer section look for topics
                if (inConsumerSection && line.startsWith("topics:")) {
                    inTopicsSection = true;
                    continue;
                }

                // extract topics inside the topics section
                if (inConsumerSection && inTopicsSection && line.startsWith("-")) {
                    String topic = line.substring(1).trim();
                    consumedTopics.add(topic);
                }

                // reset section flags if leaving a section (detect by indentation)
                if (inTopicsSection && !line.isEmpty() && !line.startsWith("-") && !line.startsWith(" ")) {
                    inTopicsSection = false;
                }

                if (inConsumerSection && !line.isEmpty() && !line.startsWith(" ")) {
                    inConsumerSection = false;
                }

                if (inTopicDefinitionSection && !line.isEmpty() && !line.startsWith(" ")) {
                    inTopicDefinitionSection = false;
                }
            }

            if (serviceName != null) {
                // make sure service exists in map
                microserviceTopicsMap.putIfAbsent(serviceName, new MicroserviceTopics());

                // process the consumed topics to extract microservice names
                for (String topic : consumedTopics) {
                    String actualTopic = topic;

                    // clean placeholders
                    if (topic.startsWith("${") && topic.endsWith("}")) {
                        String topicVar = topic.substring(2, topic.length() - 1);
                        actualTopic = topicMap.getOrDefault(topicVar, "");
                    }

                    if (!actualTopic.isEmpty()) {
                        String microserviceName = extractMicroserviceNameFromTopic(actualTopic);
                        if (microserviceName != null) {
                            microserviceTopicsMap.get(serviceName).subscribes.add(microserviceName);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error processing config file " + configFile.getName() + ": " + e.getMessage());
            e.printStackTrace();
        }

        try {
            String content = new String(Files.readAllBytes(configFile.toPath()));

            // find service name
            if (serviceName == null) {
                Pattern serviceNamePattern = Pattern.compile("name:\\s*([\\w-]+)");
                Matcher serviceNameMatcher = serviceNamePattern.matcher(content);
                if (serviceNameMatcher.find()) {
                    serviceName = serviceNameMatcher.group(1).replace("-service", "");
                }
            }

            if (serviceName == null) {
                // try to extract from filename if still not found
                String filename = configFile.getName();
                serviceName = filename.substring(0, filename.lastIndexOf("."))
                        .replace("-service", "")
                        .replace("-", "");
            }

            // ensure service exists in map
            if (serviceName != null) {
                microserviceTopicsMap.putIfAbsent(serviceName, new MicroserviceTopics());

                // find all topic references in consumer section
                Pattern topicPattern = Pattern.compile("\\$\\{topics\\.(\\w+)\\.event\\}");
                Matcher topicMatcher = topicPattern.matcher(content);
                while (topicMatcher.find()) {
                    String subscribedService = topicMatcher.group(1);
                    microserviceTopicsMap.get(serviceName).subscribes.add(subscribedService);
                }
            }
        } catch (Exception e) {
            System.err.println("Error with regex parsing for " + configFile.getName() + ": " + e.getMessage());
        }
    }

    /**
     * Process all producer documentation files
     */
    private void processProducerDocs() throws IOException {
        File docDir = new File(docDirectory);
        if (!docDir.exists() || !docDir.isDirectory()) {
            throw new IOException("Documentation directory does not exist: " + docDirectory);
        }

        for (File file : docDir.listFiles((dir, name) -> name.endsWith(".yaml") || name.endsWith(".yml"))) {
            processProducerDoc(file);
        }
    }

    // Process a single producer documentation file

    private void processProducerDoc(File docFile) throws IOException {
        // Extract service name from filename (assuming filename pattern is
        // service-name.yaml)
        String filename = docFile.getName();
        String serviceName = filename.substring(0, filename.lastIndexOf("."))
                .replace("-service", "")
                .replace("-", "");

        try {
            // read the file content and look for topic declarations
            String content = new String(Files.readAllBytes(docFile.toPath()));

            // find all topics declared in the doc
            Matcher matcher = DOC_TOPIC_PATTERN.matcher(content);
            while (matcher.find()) {
                String topic = matcher.group(1);
                String producedMicroserviceName = extractMicroserviceNameFromTopic(topic);

                if (producedMicroserviceName != null) {
                    // ensure service exists in map
                    microserviceTopicsMap.putIfAbsent(serviceName, new MicroserviceTopics());
                    // the service produces events of its own type
                    microserviceTopicsMap.get(serviceName).produces.add(producedMicroserviceName);
                }
            }
        } catch (Exception e) {
            System.err.println("Error processing doc file " + docFile.getName() + ": " + e.getMessage());
        }
    }

    /**
     * topic formatlar sekildeki gibi olabilir:
     * x.microserviceName.event
     * or
     * x.microserviceName.something.event
     * not : x noktadan microserviceNameden sonrasi bizi ilgilendirmio zaten.
     */
    private String extractMicroserviceNameFromTopic(String topic) {
        Matcher matcher = TOPIC_PATTERN.matcher(topic);
        if (matcher.find()) {
            return matcher.group(2); // ikinci kısmı return ediyoruz X.microservice(microservice name)
        }
        return null;
    }

    /**
     * string and set is used for not allowing the duplicate elements. if duplicate
     * elements are allowed then we can use arrays or lists.
     */
    public Map<String, Set<String>> buildDependencyGraph() {
        Map<String, Set<String>> dependencies = new HashMap<>();

        // initialize dependency sets for all services
        for (String service : microserviceTopicsMap.keySet()) {
            dependencies.put(service, new HashSet<>());
        }

        // foreach service as a consumer
        for (Map.Entry<String, MicroserviceTopics> entry : microserviceTopicsMap.entrySet()) {
            String consumer = entry.getKey();
            Set<String> subscribedTopics = entry.getValue().subscribes;

            // her bir topic icin kimin produce ettigini buluyoruz.
            for (String subscribedTopic : subscribedTopics) {
                for (Map.Entry<String, MicroserviceTopics> producerEntry : microserviceTopicsMap.entrySet()) {
                    String producer = producerEntry.getKey();

                    // skip self dependencies
                    if (producer.equals(consumer)) {
                        continue;
                    }

                    // if the producer produces thetopic
                    if (producerEntry.getValue().produces.contains(subscribedTopic)) {
                        dependencies.get(consumer).add(producer);
                    }
                }
            }
        }

        return dependencies;
    }

    public Set<String> getAllMicroserviceNames() {
        return microserviceTopicsMap.keySet();
    }

    public Map<String, MicroserviceTopics> getMicroserviceTopicMap() {
        return microserviceTopicsMap;
    }

    public static void main(String[] args) {
        try {
            String baseDir = "C:\\Users\\user\\Desktop\\yaml-parser-real\\test";
            YamlParser parser = new YamlParser(baseDir);
            parser.processAllMicroservices();

            System.out.println("Discovered Microservices:");
            for (String name : parser.getAllMicroserviceNames()) {
                MicroserviceTopics topics = parser.getMicroserviceTopicMap().get(name);
                System.out.println(name + ":");
                System.out.println("  Produces topics for: " + topics.produces);
                System.out.println("  Subscribes to topics from: " + topics.subscribes);
            }

            Map<String, Set<String>> dependencies = parser.buildDependencyGraph();
            System.out.println("\n Microservice Dependencies:");
            dependencies.forEach((service, deps) -> {
                System.out.println(service + " depends on: " + deps);
            });

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}