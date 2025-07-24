**build_dependency_graph method**

-*bu metod, ilişkileri göstermek için pythonda javadaki hashmap data structure'ına benzer olan dictionary i kullaniyor* 


 dependencies = {service: set() for service in self.microservice_topics_map}

    Bu satır, dependencies adında boş bir sözlük (dictionary) oluşturur.

    Bu sözlük, nihai bağımlılık grafiğimizi temsil edecek.

    Anahtarlar (keys): self.microservice_topics_map içindeki her bir servis adını temsil eder. self.microservice_topics_map, muhtemelen her mikroservisin ürettiği (produces) ve tükettiği (subscribes) Kafka veya benzeri mesajlaşma konularını tutan bir başka sözlüktür.

    Değerler (values): Her bir servis anahtarına karşılık gelen değer, başlangıçta boş bir küme (set()) olur. Bu kümeler, ilgili servisin bağlı olduğu (yani veri aldığı) üretici servisleri içerecektir. Küme kullanmamızın nedeni, her bir üretici servisin bir tüketici için sadece bir kez listelenmesini sağlamak ve elemanların sırasının önemli olmamasını sağlamaktır.

Tüketiciler Üzerinde Döngü

Python

        for consumer, topics in self.microservice_topics_map.items():

    Bu satır, self.microservice_topics_map sözlüğündeki her bir öğe üzerinde döngü başlatır.

    Her bir döngüde:

        consumer: Sözlükteki mevcut anahtar, yani tüketici mikroservisin adıdır.

        topics: Bu anahtara karşılık gelen değerdir. topics nesnesi, muhtemelen bu consumer servisin abone olduğu (subscribes) ve ürettiği (produces) konuları içeren bir yapıya (örneğin, bir nesne veya isimlendirilmiş demet) sahiptir.

Abone Olunan Konular Üzerinde Döngü

Python

            for subscribed in topics.subscribes:

    Bu satır, yukarıdaki döngüde belirlenen consumer servisin abone olduğu her bir konu (topic) üzerinde döngü başlatır.

    topics.subscribes, consumer servisin abone olduğu konuların bir listesi veya kümesi olmalıdır.

    subscribed: Tüketici servisin abone olduğu mevcut konunun adıdır.

Üretici Servisler Üzerinde Döngü

Python

                for producer, prod_topics in self.microservice_topics_map.items():

    Bu satır, bir tüketici konuya abone olduğunda, tüm potansiyel üretici mikroservisleri bulmak için self.microservice_topics_map sözlüğündeki her bir öğe üzerinde tekrar döngü başlatır.

    Her bir döngüde:

        producer: Sözlükteki mevcut anahtar, yani üretici mikroservisin adıdır.

        prod_topics: Bu producer servisin ürettiği ve tükettiği konuları içeren yapı.

Kendine Bağımlılığı Atlama

Python

                    if producer == consumer:
                        continue

    Bu satır, kendine bağımlılıkları önlemek için bir kontrol yapar.

    Eğer mevcut producer (üretici) servisi, döngüdeki mevcut consumer (tüketici) servisi ile aynıysa, bu durum bir bağımlılık olarak kabul edilmez ve döngünün bir sonraki producer'a geçmesini sağlar (continue). Bir servisin kendi kendine mesaj göndermesi bir bağımlılık olarak genellikle incelenmez.

Bağımlılığı Tespit Etme

Python

                    if subscribed in prod_topics.produces:

    Bu kritik satır, gerçek bağımlılığı tespit eder.

    Burada kontrol edilen şey şudur: Eğer mevcut consumer servisin abone olduğu subscribed konusu, mevcut producer servisin ürettiği prod_topics.produces konuları arasında yer alıyorsa...

Bağımlılığı Ekleme

Python

                        dependencies[consumer].add(producer)

    ...o zaman bu, consumer servisinin producer servise bağımlı olduğu anlamına gelir.

    Bu durumda, dependencies sözlüğündeki consumer anahtarına karşılık gelen kümeye producer servisini ekleriz. add() metodu, kümelerde zaten varsa öğeyi tekrar eklemeyeceğinden, her bağımlılığın yalnızca bir kez kaydedilmesini sağlar.

Bağımlılık Grafiğini Döndürme

Python

        return dependencies

    Tüm döngüler tamamlandıktan sonra, bu satır oluşturulmuş olan ve tüm mikroservis bağımlılıklarını içeren dependencies sözlüğünü geri döndürür.

Kısacası, bu kod parçası, her bir mikroservisin hangi konulara abone olduğunu ve hangi konuları ürettiğini gösteren bir haritayı (microservice_topics_map) kullanarak, servisler arasındaki "kim kimden veri alıyor" şeklindeki bağımlılıkları otomatik olarak tespit eder ve bir bağımlılık grafiği oluşturur. Bu grafik, tüketici: {üretici1, üretici2} formatında bir Python sözlüğüdür.