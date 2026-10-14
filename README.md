# Firefox AI Summarizer

Firefox Browser (veya diğer Firefox tabanlı tarayıcılar) için geliştirilmiş, web sayfalarını ve köprü bağlantılarını (links) yapay zeka kullanarak anında özetleyen premium bir tarayıcı eklentisidir.

## Özellikler

- **Çoklu Yapay Zeka Sağlayıcısı Desteği:** Google Gemini (en güncel Flash), Groq Cloud (Llama 3.3, GPT-OSS), OpenRouter (yüzlerce model, ücretsizler işaretli) ve NVIDIA NIM (Nemotron, DeepSeek, Kimi vb.) arasından dilediğinizi seçin.
- **Sayfa Çevirisi:** Sayfayı başlık, liste ve kod yapısını koruyarak seçtiğiniz dile çevirir; uzun sayfalar parça parça çevrilir ve ilerleme anlık gösterilir.
- **İki Farklı Bağlamda Özetleme:**
  - **Sayfa Özetleme:** Herhangi bir sayfada boşluğa sağ tıklayarak veya eklenti ikonuna tıklayarak o anki sayfa içeriğini özetleyin.
  - **Bağlantı Özetleme:** Sayfadaki herhangi bir linke sağ tıklayarak, bağlantıyı açmak zorunda kalmadan içeriğini arka planda indirtip özetletin.
- **Shadow DOM Koruması:** Eklenti arayüzü, girdiğiniz web sayfalarının CSS kodlarından etkilenmez ve sayfa tasarımlarını bozmaz.
- **Premium Glassmorphism Arayüzü:** Bulanık arka plan, yumuşak geçişler, mor renkli liste vurguları ve tamamen duyarlı (responsive) sağ panel tasarımı.
- **Esnek Özet Modları:** Hızlı özet, sadece maddeler veya detaylı gruplandırılmış özet tercihleri.

## Kurulum ve Çalıştırma

1. Firefox Browser'da adres satırına `about:debugging` yazıp Enter'a basın.
2. Sol menüden **"This Firefox"** seçeneğine gidin.
3. **"Load Temporary Add-on..."** butonuna tıklayın.
4. Bu projenin içindeki **`manifest.json`** dosyasını seçip yükleyin.

## Yapılandırma

1. Araç çubuğundaki eklenti ikonuna tıklayıp **"Ayarları Aç"** deyin.
2. Yapay zeka sağlayıcınızı (**Google Gemini**, **Groq Cloud**, **OpenRouter** veya **NVIDIA NIM**) seçin.
3. İlgili sağlayıcının API anahtarını girin:
   - Gemini API anahtarını [Google AI Studio](https://aistudio.google.com/)'dan alabilirsiniz.
   - Groq API anahtarını [Groq Console](https://console.groq.com/)'dan alabilirsiniz.
   - OpenRouter API anahtarını [OpenRouter](https://openrouter.ai/keys)'dan alabilirsiniz.
   - NVIDIA API anahtarını (`nvapi-...`) [build.nvidia.com](https://build.nvidia.com/settings/api-keys)'dan alabilirsiniz.
4. Tercih ettiğiniz dili ve özet detay düzeyini seçip kaydedin.
