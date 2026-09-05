import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path("tokenizer-hub").resolve()))

from tokenizers import Tokenizer as HfTokenizer
from backend.app.tokenizer_registry import TokenizerSpec, TiktokenBackendTokenizer, HfBackendTokenizer, HfTiktokenBackendTokenizer
from nedotokenizer import SurfaceTokenizer

morph_words = [
    "evlerimizden", "evlerimizdekilerden", "evlerimizdekilerdenmiş", "evlerimizdekilerdenmişsiniz",
    "kitaplarımızdan", "kitaplarımızdakilerden", "okullarımızdakilerden", "arkadaşlarımızdakilerden",
    "çalışabileceklerimizden", "çalışamayabileceklerimizden", "çalıştırılamayabileceklerimizdenmişsiniz",
    "öğrenebileceklerimizden", "öğrenemeyebileceklerimizden", "anlatabileceklerimizdenmiş",
    "görebileceklerimizden", "göremeyebileceklerimizdenmiş", "yapabileceklerimizdenmişsiniz",
    "başarısızlaştırabileceklerimizden", "başarısızlaştırılamayabileceklerimizden",
    "muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizcesine",
    "İstanbul'dakilerdenmişsinizcesine", "Ankara'dakilerden", "Türkiye'dekilerdenmiş",
    "üniversitelerimizdekilerden", "araştırmacılarımızdakilerden", "modellerimizdekilerden",
]

categories = {
"dogal_turkce": """Türkiye'nin farklı bölgelerinde yaşayan insanlar günlük yaşamlarında hem ortak bir dil kullanıyor hem de yerel söyleyiş biçimlerini koruyor. Sabah işe giden bir kişi toplu taşıma saatlerini kontrol ederken, başka biri çocuklarını okula bırakıyor, esnaf dükkânını açıyor ve öğrenciler derslerine hazırlanıyor. Büyük şehirlerde teknoloji kullanımı hızla artarken küçük yerleşimlerde yüz yüze iletişim hâlâ güçlü bir yer tutuyor.
Bir yaz günü İstanbul'da deniz kıyısında yürüyenler serinlemek için gölgeli alanları tercih eder. Ankara'da kamu kurumlarının çevresindeki yoğunluk öğle saatlerinde artabilir. İzmir'de sahil boyunca bisiklete binenler, vapur bekleyenler ve arkadaşlarıyla buluşanlar aynı kamusal alanı paylaşır. İnsanların gündelik tercihleri yaşa, mesleğe, gelir düzeyine ve yaşadıkları çevreye göre değişse de anlaşılır ve doğal Türkçe iletişimin temelidir.
Bir ürün satın almadan önce fiyatı, garanti süresini, teknik özellikleri ve kullanıcı deneyimlerini karşılaştırmak yararlı olabilir. İnternetteki yorumların her zaman güvenilir olmadığı unutulmamalıdır. Birden fazla kaynağa bakmak, güncel bilgiyi doğrulamak ve ihtiyaçları açık biçimde belirlemek daha sağlıklı karar verilmesini sağlar.
Toplantıdan sonra ekip üyeleri görev dağılımını yeniden gözden geçirdi. Bazı işler beklenenden erken tamamlanırken bazıları ek araştırma gerektirdi. Son teslim tarihine yetişebilmek için öncelikler değiştirildi, gereksiz adımlar kaldırıldı ve ortaya çıkan sorunların kim tarafından çözüleceği açıkça belirlendi.""",
"akademik": """Doğal dil işleme sistemlerinin başarısı yalnızca model parametrelerinin sayısına bağlı değildir. Veri dağılımı, tokenizasyon stratejisi, optimizasyon yöntemi, bağlam uzunluğu ve değerlendirme protokolü birlikte ele alınmalıdır. Özellikle eklemeli dillerde sözcük biçimlerinin üretkenliği, sabit büyüklükteki bir alt sözcük dağarcığının verimliliğini doğrudan etkileyebilir.
Türkçe, köklerin art arda gelen yapım ve çekim ekleriyle genişleyebildiği üretken bir morfolojiye sahiptir. Bir tokenizer sık görülen yüzey biçimlerini tek parça hâline getirerek sıkıştırmayı artırabilir; ancak aynı kökün farklı çekimlerde tutarsız parçalara ayrılması temsil öğrenmesini zorlaştırabilir. Bu nedenle yalnız token sayısı değil, morfem sınırlarının korunması, kök tutarlılığı, tekilleştirilmiş parça sayısı ve kodlama gecikmesi de ölçülmelidir.
Deneysel karşılaştırmalarda bütün tokenizerlar aynı Unicode dizisini, aynı normalizasyon politikasını ve aynı belge sınırlarını görmelidir. Aksi hâlde token başına byte veya sözcük başına token gibi metrikler yanıltıcı sonuçlar üretebilir. İstatistiksel değerlendirmede ortalama yanında medyan, yüzdelikler ve kategori bazlı dağılımlar da raporlanmalıdır.""",
"resmi_hukuki": """Başvuru sahibinin ilgili belgeleri belirtilen süre içinde kuruma teslim etmesi gerekmektedir. Eksik veya okunamayan evrak bulunması hâlinde başvuru değerlendirmeye alınmadan önce kişiye ek süre tanınabilir. Yetkili birim, işlemin sonucunu kayıtlı iletişim kanalları üzerinden bildirir.
Yönetmelik hükümlerinin uygulanmasında eşitlik, ölçülülük, şeffaflık ve hukuki güvenlik ilkeleri gözetilir. Kişisel veriler yalnızca belirtilen amaç kapsamında işlenir ve gerekli saklama süresinin sona ermesinden sonra ilgili mevzuata uygun biçimde silinir, yok edilir veya anonim hâle getirilir.
Türkiye Büyük Millet Meclisi'ndeki görüşmeler, komisyon raporları ve Genel Kurul tutanakları farklı belge türleri olarak değerlendirilmelidir. Ankara 5. İdare Mahkemesi'nin 2026/314 esas ve 2026/927 karar numaralı dosyasına yapılan atıflarda sayı, kesme işareti ve kurum adı birlikte doğru ayrıştırılmalıdır.""",
"edebi": """Akşamın serinliği sokağın taşlarına inerken eski apartmanın pencerelerinde birer birer ışıklar yandı. Uzakta geçen trenin sesi kısa süreliğine bütün mahalleyi susturdu; sonra çocukların kahkahaları, çay kaşıklarının ince tınısı ve açık pencerelerden gelen konuşmalar yeniden birbirine karıştı.
Yağmurdan sonra toprağın kokusu ağırlaşmıştı. Yol kenarındaki çınarlar rüzgârla sallanıyor, bulutların arasından görünen solgun güneş ıslak kaldırımlarda uzun yansımalar bırakıyordu. Eve dönmek için acele etmeyenler, günün son ışığını biraz daha seyretmek ister gibi yavaş yürüyordu.""",
"konusma_argo": """N'apıyorsun ya, sabahtan beri sana yazıyorum. Geliyorsan gel, gelmiyorsan da haber ver de boşuna beklemeyeyim. Kanka dün o kadar yoruldum ki eve gidince direkt uyumuşum. Sabah alarmı üç kere erteledim, yine de derse son anda yetiştim.
Abi bu internet yine kafayı yedi galiba; telefonda çalışıyor ama bilgisayarda bir bağlanıyor bir bağlanmıyor. Modemi kapatıp açtım, ağı unuttum, yeniden bağlandım, şimdilik düzeldi. İnşallah beş dakika sonra gene bozulmaz.
napıyon, geliyon mu, gidicem, yapıcam, bi şey dicem, noldu, nereye gidiyon, şurdan gelsene, tamamdır görüşürüz, hadi eyvallah.""",
"morfoloji": "\n".join(morph_words + [
    "Evlerimizdekilerden bazıları taşınabileceklerimizdenmiş.",
    "Çalıştırılamayabileceklerimizdenmişsiniz gibi davranmayın.",
    "Öğrenebileceklerimizden yararlanamadıklarımızı yeniden değerlendirebiliriz.",
    "Başarısızlaştırılamayabileceklerimizden söz ederken kök ve ek sınırlarını korumalıyız.",
    "Gelebileceklerimizdenmişsiniz, gelemeyebileceklerimizdenmişsiniz, geleceklerimizdenmişsiniz.",
    "Yapabileceklerimiz, yapamayabileceklerimiz, yaptırabileceklerimiz, yaptırılamayabileceklerimiz.",
] * 5),
"ozel_isimler": """İstanbul'da, Ankara'dan, İzmir'e, Türkiye'nin, Avrupa Birliği'nde, Birleşmiş Milletler'in, Türk Dil Kurumu'na, Türkiye Büyük Millet Meclisi'nden, Orta Doğu Teknik Üniversitesi'nde, Boğaziçi Üniversitesi'nin, İstanbul Teknik Üniversitesi'ndeki, TÜBİTAK'ın, TEKNOFEST'te, ChatGPT'nin, GitHub'daki, Python'dan, PyTorch'la.
Ankara’da, İstanbul’dan, İzmir’e, Türkiye’nin, ODTÜ’de, İTÜ’nün, TBMM’de kullanılan kıvrımlı apostrof biçimleri de aynı içerik ailesinin parçasıdır.""",
"teknik_yapay_zeka": """Transformer mimarisinde attention katmanı query, key ve value projeksiyonları üzerinden bağlam içindeki ilişkileri hesaplar. Multi-head attention farklı temsil altuzaylarında paralel eşleşmeler öğrenebilir. Feed-forward network ise her token konumuna bağımsız olarak uygulanan doğrusal dönüşümler ve aktivasyon fonksiyonlarından oluşur.
Mixture-of-Experts modellerinde router her token için sınırlı sayıda uzman seçer. Örneğin top-2 routing kullanıldığında toplam parametre sayısı çok yüksek olsa bile her token yalnızca iki uzman ağından geçirilir. Bu yaklaşım hesaplama maliyetini kontrol ederken model kapasitesini artırabilir.
Eğitim günlüğü: step=18420, loss=2.317, lr=3.0e-4, grad_norm=0.91, tokens_per_second=182450, batch_size=512. CUDA kernel, FlashAttention, BF16, FP8, KV-cache, RoPE, RMSNorm, SwiGLU, AdamW ve gradient checkpointing terimleri Türkçe teknik metin içinde sık görülebilir.""",
"tip_bilim": """Hastanın klinik değerlendirmesinde semptomların başlangıç zamanı, kullanılan ilaçlar ve eşlik eden hastalıklar kaydedildi. Elektrokardiyografi sinyalinde ritim bozukluğu şüphesi görüldüğünde bulgular tek başına tanı koymak için yeterli kabul edilmez; klinik öykü ve diğer incelemelerle birlikte değerlendirilir.
Makine öğrenmesi tabanlı sınıflandırıcı için duyarlılık, özgüllük, F1 skoru, ROC-AUC ve kalibrasyon eğrisi raporlandı. Eğitim ve test kümeleri hasta bazında ayrıldı; aynı kişiye ait kayıtların iki kümeye birden düşmesi engellendi. İstatistiksel güven aralıkları bootstrap yöntemiyle hesaplandı.
DNA dizisi örnekleri ATGCGTACGTTAGC, protein değişimleri p.Gly12Asp ve c.35G>A, ölçümler 120/80 mmHg, 72 bpm, 36,7 °C, 5,4 mmol/L ve %98 SpO2 biçiminde yazılabilir.""",
"finans_ekonomi": """Tüketici fiyatlarındaki değişim tek bir ürün grubuyla açıklanamaz. Gıda, enerji, konut, ulaştırma ve hizmet kalemleri farklı dönemlerde farklı katkılar sağlayabilir. Nominal ücretteki artış reel satın alma gücünün aynı oranda yükseldiği anlamına gelmez; enflasyon etkisinin ayrıca değerlendirilmesi gerekir.
Bir şirketin bilançosunda nakit akışı, borçluluk oranı, faaliyet kârı, özkaynak getirisi ve yatırım harcamaları birlikte incelenebilir. 1.250.000 TL gelir, 384.500 TL gider, %18,7 brüt marj ve 32,4 milyon ABD doları piyasa değeri gibi ifadeler sayı biçimleri açısından tokenizerı zorlayabilir.""",
"tarih_kultur": """Anadolu tarih boyunca farklı siyasi yapılar, ticaret ağları ve kültürel topluluklar arasında bir geçiş alanı oldu. Selçuklu ve Osmanlı dönemlerinde şehirlerin idari işlevleri, üretim biçimleri ve ulaşım bağlantıları zaman içinde değişti. Cumhuriyet döneminde eğitim, hukuk, ekonomi ve kentleşme alanlarında kapsamlı dönüşümler yaşandı.
29 Ekim 1923, 23 Nisan 1920, 19 Mayıs 1919 ve 30 Ağustos 1922 gibi tarihler Türkiye'nin yakın tarih anlatısında sık geçer. XIX. yüzyıl, II. Meşrutiyet, I. Dünya Savaşı ve Millî Mücadele ifadeleri Roma rakamları, noktalama ve Türkçe özel karakterleri birlikte içerir.""",
"sosyal_medya_gurultu": """bugün hava aşırı iyi yaaa 😄☀️ İstanbul'da sahile insek mi??? @arkadas cevap versene pls 🙃 #istanbul #haftasonu #Türkiye'deyiz
YENİ MODEL ÇIKMIŞŞŞ!!! performans baya iyi gözüküyo ama benchmarkları görmeden hype'a kapılmayın :D link: https://example.com/model?id=42&utm_source=test
olm bu nasıl sonuç 😂😂😂 %99.9 accuracy yazmışlar test seti 20 örnekmiş... ciddi misiniz??!! e-posta: deneme+tokenizer@example.com ❤️‍🔥🇹🇷👨‍💻
bugunhavaçokgüzel ama yarınyağmurluolabilirmiş; geliyormusun, gelmiyormusun, napıyon, naptın, görüsmeyelimmi?""",
"sayilar_tarihler": """0 1 2 3 10 42 99 100 101 999 1000 1000000 -42 +17 3,14 3.14159265 1e-9 6.022e23 0xFF 0b101010 0755
05.09.2026, 2026-09-05, 05/09/2026, 5 Eylül 2026, saat 10:57, 23:59:59, UTC+03:00.
%0,5 %12 %99,99 ₺1.250,50 $3,499.99 €42,00 5 km 12,7 kg 3.2 GHz 24 GB 6 GB VRAM 144 Hz 65 W 220 V 4,2 ms.
IP: 192.168.1.1, 10.0.0.24, 2001:db8::1; MAC: AA:BB:CC:DD:EE:FF; UUID: 550e8400-e29b-41d4-a716-446655440000.""",
"unicode": """İ I ı i Ş ş Ğ ğ Ü ü Ö ö Ç ç Â â Î î Û û
İstanbul İstanbul, ş ş, ç ç, ö ö, ü ü, ğ ğ.
Ankara'da Ankara’da Ankara‘da Ankaraʼda Ankara`da.
normal boşluk | | dar boşluk | | tab\tkarakteri | zero-width: a​b a‌b a‍b.
😀 😃 😂 🤖 🧠 ❤️ ❤️‍🔥 👨‍💻 👨‍👩‍👧‍👦 🇹🇷 🇩🇪 1️⃣ #️⃣ ©️ ™️ ✅ ❌
Türkçe–İngilizce — kısa çizgi – uzun çizgi — üç nokta … “tırnak” ‘tek tırnak’ «guillemet».""",
"kod_karisik": """Python kodu içinde Türkçe değişken adları kullanılabilir: kullanıcı_sayısı = 42; öğrenme_oranı = 3e-4; model.fit(veri, etiketler). JSON örneği: {\"şehir\":\"İstanbul\",\"başarılı\":true,\"skor\":0.982}. SQL: SELECT ad, şehir FROM kullanıcılar WHERE aktif = TRUE ORDER BY kayıt_tarihi DESC;
Dosya yolları: /home/nedim/Projeler/tokenizer/test.txt, C:\\Users\\Nedim\\Desktop\\deneme.txt, ./çıktılar/ölçüm_2026-09-05.csv. Shell: python benchmark.py --model qwen3.8 --lang tr; git checkout -b test/tokenizer; CUDA_VISIBLE_DEVICES=0 python train.py.
API cevabı HTTP/2 200 OK döndü; latency=87ms, throughput=14.2k tok/s, cache_hit=true. Kullanıcı "deployment" kelimesini Türkçe cümlede kullanıp ardından inference, tokenizer, embedding ve checkpoint gibi İngilizce teknik terimler yazabilir.""",
}

core_names = ["dogal_turkce", "akademik", "resmi_hukuki", "edebi", "konusma_argo", "morfoloji", "ozel_isimler", "teknik_yapay_zeka", "tip_bilim", "finans_ekonomi", "tarih_kultur"]

def build_text(names):
    return "\n\n".join(f"### {name} ###\n{categories[name]}" for name in names)

full_text = build_text(list(categories))
core_text = build_text(core_names)

root = Path("tokenizer-hub/backend/tokenizers")

nedo = SurfaceTokenizer(Path("nedo/assets/surface-vocab.bin").read_bytes())

def nedo_encode(text):
    return list(nedo.encode_ids(text.encode("utf-8")))

gpt_backend = TiktokenBackendTokenizer(TokenizerSpec(key="tiktoken:o200k_base", type="tiktoken", label="GPT-5 o200k_base", encoding="o200k_base"))
deepseek_backend = HfBackendTokenizer(TokenizerSpec(key="hf:deepseek-v4-flash-0731", type="hf", label="DeepSeek V4", asset="deepseek-v4-flash-0731"), root)
gemma_backend = HfBackendTokenizer(TokenizerSpec(key="hf:gemma4", type="hf", label="Gemma 4", asset="gemma4"), root)
minimax_backend = HfBackendTokenizer(TokenizerSpec(key="hf:minimax-m3", type="hf", label="MiniMax M3", asset="minimax-m3"), root)
kimi_backend = HfTiktokenBackendTokenizer(TokenizerSpec(key="hf_tiktoken:kimi-k3", type="hf_tiktoken", label="Kimi K3", asset="kimi-k3"), root)
qwen_tok = HfTokenizer.from_file("/tmp/qwen38-tokenizer.json")

encoders = {
    "NedoTokenizer": (nedo_encode, 32000),
    "GPT-5 o200k": (lambda t: gpt_backend.tokenize(t)["tokens"], gpt_backend._encoding.n_vocab),
    "Qwen 3.8": (lambda t: qwen_tok.encode(t, add_special_tokens=False).ids, qwen_tok.get_vocab_size(with_added_tokens=True)),
    "Gemma 4": (lambda t: gemma_backend.tokenize(t)["tokens"], gemma_backend._tokenizer.get_vocab_size(with_added_tokens=True)),
    "DeepSeek V4": (lambda t: deepseek_backend.tokenize(t)["tokens"], deepseek_backend._tokenizer.get_vocab_size(with_added_tokens=True)),
    "MiniMax M3": (lambda t: minimax_backend.tokenize(t)["tokens"], minimax_backend._tokenizer.get_vocab_size(with_added_tokens=True)),
    "Kimi K3": (lambda t: kimi_backend.tokenize(t)["tokens"], kimi_backend._encoding.n_vocab),
}

def words(text):
    return len(re.findall(r"\S+", text))

meta = {
    "bytes": len(full_text.encode("utf-8")), "chars": len(full_text), "words": words(full_text), "categories": len(categories),
    "core_bytes": len(core_text.encode("utf-8")), "core_chars": len(core_text), "core_words": words(core_text), "core_categories": len(core_names),
}
summary = []
category_result = {}
examples = [
    "muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizcesine",
    "çalıştırılamayabileceklerimizdenmişsiniz",
    "İstanbul'dakilerdenmişsinizcesine",
    "Türkiye Büyük Millet Meclisi'ndeki görüşmelerimizden",
    "yapay zekâ modellerimizden yararlanabileceklerimiz",
    "bugünhavaçokgüzel",
    "Ankara’da yaşayan araştırmacılarımızdanmışsınız.",
]
example_result = {}

for name, (encode, vocab) in encoders.items():
    ids = encode(full_text)
    core_ids = encode(core_text)
    summary.append({
        "model": name,
        "tokens": len(ids),
        "core_tokens": len(core_ids),
        "vocab_size": int(vocab),
        "bytes_per_token": round(meta["bytes"] / len(ids), 6),
        "core_bytes_per_token": round(meta["core_bytes"] / len(core_ids), 6),
        "tokens_per_word": round(len(ids) / meta["words"], 6),
        "core_tokens_per_word": round(len(core_ids) / meta["core_words"], 6),
        "embedding_params_d4096_m": round(vocab * 4096 / 1e6, 3),
    })
    category_result[name] = {cat: len(encode(text)) for cat, text in categories.items()}
    example_result[name] = {text: len(encode(text)) for text in examples}

summary.sort(key=lambda x: x["tokens"])
result = {"meta": meta, "summary": summary, "categories": category_result, "examples": example_result}
Path("benchmark_results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

print("RESULT_JSON_START")
print(json.dumps(result, ensure_ascii=False))
print("RESULT_JSON_END")
