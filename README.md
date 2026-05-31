# Zen AI Summarizer

Zen Browser (veya diğer Firefox tabanlı tarayıcılar) için geliştirilmiş, web sayfalarını ve köprü bağlantılarını (links) yapay zeka kullanarak anında özetleyen premium bir tarayıcı eklentisidir.

## Özellikler

- **Çift Yapay Zeka Sağlayıcısı Desteği:** Google Gemini (1.5 Flash / 2.5 Flash) ve Groq Cloud (Llama 3, Gemma 2, Mixtral) API'leri arasından dilediğinizi seçin.
- **İki Farklı Bağlamda Özetleme:**
  - **Sayfa Özetleme:** Herhangi bir sayfada boşluğa sağ tıklayarak veya eklenti ikonuna tıklayarak o anki sayfa içeriğini özetleyin.
  - **Bağlantı Özetleme:** Sayfadaki herhangi bir linke sağ tıklayarak, bağlantıyı açmak zorunda kalmadan içeriğini arka planda indirtip özetletin.
- **Shadow DOM Koruması:** Eklenti arayüzü, girdiğiniz web sayfalarının CSS kodlarından etkilenmez ve sayfa tasarımlarını bozmaz.
- **Premium Glassmorphism Arayüzü:** Bulanık arka plan, yumuşak geçişler, mor renkli liste vurguları ve tamamen duyarlı (responsive) sağ panel tasarımı.
- **Esnek Özet Modları:** Hızlı özet, sadece maddeler veya detaylı gruplandırılmış özet tercihleri.

## Kurulum ve Çalıştırma

1. Zen Browser'da adres satırına `about:debugging` yazıp Enter'a basın.
2. Sol menüden **"This Firefox"** seçeneğine gidin.
3. **"Load Temporary Add-on..."** butonuna tıklayın.
4. Bu projenin içindeki **`manifest.json`** dosyasını seçip yükleyin.

## Yapılandırma

1. Araç çubuğundaki eklenti ikonuna tıklayıp **"Ayarları Aç"** deyin.
2. Yapay zeka sağlayıcınızı (**Google Gemini** veya **Groq Cloud**) seçin.
3. İlgili sağlayıcının API anahtarını girin:
   - Gemini API anahtarını [Google AI Studio](https://aistudio.google.com/)'dan alabilirsiniz.
   - Groq API anahtarını [Groq Console](https://console.groq.com/)'dan alabilirsiniz.
4. Tercih ettiğiniz dili ve özet detay düzeyini seçip kaydedin.
