# NowPlace — SA2 | Programação Front-End

**Integrantes:** João Ligabo e Neil Lopes
**Professora:** Andreza Quintas

## Tecnologias

HTML, CSS e JavaScript nativo; MediaDevices/getUserMedia, Canvas, Geolocation, fetch, localStorage, DOM e Drag and Drop. A câmera é desligada com `stream.getTracks().forEach(track => track.stop())`.

## APIs utilizadas

- `POST https://jsonplaceholder.typicode.com/posts`: demonstra a comunicação HTTP com uma API REST. **A JSONPlaceholder não persiste a publicação e não oferece feed por proximidade nem armazenamento de fotos.** O POST envia apenas nome e descrição, nunca as fotos ou coordenadas.
- `GET https://nominatim.openstreetmap.org/reverse?lat=...&lon=...&format=json`: consulta endereço legível a partir da localização real (serviço externo OpenStreetMap/Nominatim; sujeito a disponibilidade e política de uso).

## Limitações importantes

Os Nows capturados ficam no **localStorage deste navegador** e não são compartilhados entre dispositivos. O feed consulta apenas publicações realmente capturadas e salvas neste navegador, filtrando pela distância calculada (Haversine). A regra das 24 horas libera o feed quando há publicação local recente; ela não limita a idade das publicações exibidas. Não há dados fictícios ou respostas simuladas. Para cumprir um feed multiusuário real, será necessário um backend com armazenamento e consulta geográfica — a JSONPlaceholder não oferece esses recursos. Imagens ocupam espaço no Storage, por isso são reduzidas na captur
