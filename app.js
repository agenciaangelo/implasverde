const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwzC7OxMA3ZNqMJ-QW-E4TpQRpg-YRYVx5QTrBEaHsY6GeJNWNHq1w9rpfo3Z-DnhgW/exec";

async function callBackend(action, extra = {}) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, ...extra })
  });
  return await res.json();
}

async function callClaude(prompt) {
  const data = await callBackend("claude", { prompt });
  if (data.error) throw new Error(data.error);
  return data.text || "";
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/gi, "").trim();
  const isArr = clean.indexOf("[") !== -1 && (clean.indexOf("[") < (clean.indexOf("{") === -1 ? 99999 : clean.indexOf("{")));
  const s = isArr
    ? clean.slice(clean.indexOf("["), clean.lastIndexOf("]") + 1)
    : clean.slice(clean.indexOf("{"), clean.lastIndexOf("}") + 1);
  return JSON.parse(s);
}

function spinner() {
  return `<div class="spinner"><div class="spin"></div><span class="spin-text">CARREGANDO</span></div>`;
}

function tendIcon(t) { return t === "alta" ? " ▲" : t === "baixa" ? " ▼" : ""; }
function tendColor(t) { return t === "alta" ? "#ef4444" : t === "baixa" ? "#22c55e" : "#888"; }

function switchTab(tab) {
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.toggle("active", ["noticias","analise","insights"][i] === tab);
  });
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById(`panel-${tab}`).classList.add("active");
  if (tab === "analise" && !analiseLoaded) fetchAnalise();
}

let analiseLoaded = false;

// ── MERCADO ──────────────────────────────────────────
async function fetchMercado() {
  try {
    const d = await callBackend("mercado");
    document.getElementById("dolarValor").textContent = "R$ " + (d.dolar?.valor || "—");
    document.getElementById("dolarVar").textContent = (d.dolar?.variacao || "") + tendIcon(d.dolar?.tendencia);
    document.getElementById("dolarVar").style.color = tendColor(d.dolar?.tendencia);
    document.getElementById("brentValor").textContent = "US$ " + (d.brent?.valor || "—");
    document.getElementById("brentVar").textContent = (d.brent?.variacao || "") + tendIcon(d.brent?.tendencia);
    document.getElementById("brentVar").style.color = tendColor(d.brent?.tendencia);
    document.getElementById("wtiValor").textContent = "US$ " + (d.wti?.valor || "—");
    document.getElementById("wtiVar").textContent = (d.wti?.variacao || "") + tendIcon(d.wti?.tendencia);
    document.getElementById("wtiVar").style.color = tendColor(d.wti?.tendencia);
    document.getElementById("lastUpdate").textContent = "ATUALIZADO " + new Date().toLocaleTimeString("pt-BR");
  } catch (e) {
    console.error("Erro mercado:", e);
  }
}

// ── NOTÍCIAS ──────────────────────────────────────────
async function fetchNoticias() {
  document.getElementById("noticias-content").innerHTML = spinner();
  try {
    const data = await callBackend("noticias");
    const noticias = data.noticias || [];
    if (!noticias.length) throw new Error("Sem notícias");

    const impactColor = { Alto: "#ef4444", Médio: "#f97316", Baixo: "#22c55e" };
    const catColor = { Militar: "#ef4444", Diplomacia: "#60a5fa", Economia: "#22c55e", Energia: "#f97316" };

    document.getElementById("noticias-content").innerHTML = noticias.map(n => `
      <div class="news-card">
        <div class="news-bar" style="background:#f97316"></div>
        <div>
          <div class="news-tags">
            <span style="font-size:10px;color:#f97316;letter-spacing:1px;font-weight:700">${n.fonte}</span>
            <span style="font-size:10px;color:#333;letter-spacing:1px">${n.data}</span>
          </div>
          <p class="news-title">
            <a href="${n.url}" target="_blank" style="color:#e5e5e5;text-decoration:none;hover:text-decoration:underline">${n.titulo}</a>
          </p>
          <p class="news-resumo">${n.resumo}</p>
        </div>
      </div>`).join("");
  } catch (e) {
    document.getElementById("noticias-content").innerHTML = `<p class="error-text">Erro ao carregar notícias. Tente novamente.</p>`;
    console.error(e);
  }
}

// ── ANÁLISE ──────────────────────────────────────────
async function fetchAnalise() {
  analiseLoaded = true;
  document.getElementById("analise-content").innerHTML = spinner();
  try {
    const text = await callClaude(`Analise o impacto do conflito EUA-Israel contra o Irã para: 1) mercado de plásticos no Brasil (petróleo, resinas, embalagens), 2) varejo supermercadista no Nordeste brasileiro, 3) câmbio dólar/real. Seja específico sobre riscos e oportunidades para a Implasverde (indústria de plásticos fornecedora de supermercados nordestinos). Responda em português brasileiro. Use **Subtítulo** para seções. Máximo 300 palavras.`);
    const html = text.split("\n").map(line => {
      if (!line.trim()) return "<br>";
      if (/^\*\*.*\*\*$/.test(line.trim()))
        return `<p class="subtitulo">${line.replace(/\*\*/g, "")}</p>`;
      return `<p style="margin:4px 0">${line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ccc">$1</strong>')}</p>`;
    }).join("");
    document.getElementById("analise-content").innerHTML = `<div class="analise-content">${html}</div>`;
  } catch (e) {
    document.getElementById("analise-content").innerHTML = `<p class="error-text">Erro ao gerar análise. Tente novamente.</p>`;
  }
}

// ── INSIGHTS ──────────────────────────────────────────
async function fetchInsights() {
  document.getElementById("insights-content").innerHTML = spinner();
  try {
    const feedText = await callClaude(`Crie um briefing de vídeo para FEED do Instagram do Márcio Souza. Audiência: empresários e empreendedores de diversas áreas (varejo supermercadista nordestino, indústria, serviços). Tema: conflito EUA-Israel contra o Irã e impactos econômicos globais. Objetivo: marketing INDIRETO — posicionar Márcio como autoridade em geopolítica e negócios. CTA deve convidar o empresário a comentar sua opinião no post, nunca direcionar para compra ou contato. NÃO mencionar Implasverde. Responda em português brasileiro. Retorne APENAS JSON sem markdown: {"titulo":"string","duracao":"string","gancho":"string","roteiro":["string","string","string","string"],"tom":"string","trilha":"string","legenda":"string","hashtags":["string","string","string","string","string"],"melhor_horario":"string"}`);

    const storyText = await callClaude(`Crie um briefing de vídeo para STORIES do Instagram do Márcio Souza. Audiência: empresários e empreendedores de diversas áreas. Tema: conflito EUA-Israel contra o Irã e impactos econômicos globais. Objetivo: marketing INDIRETO — gerar engajamento nos comentários com perguntas que estimulem empresários a debater impactos no seu setor. CTA final deve convidar ao debate nos comentários. NÃO mencionar Implasverde. Responda em português brasileiro. Retorne APENAS JSON sem markdown: {"titulo":"string","telas":[{"numero":1,"texto_principal":"string","texto_apoio":"string","elemento_interativo":"enquete Sim Nao"},{"numero":2,"texto_principal":"string","texto_apoio":"string","elemento_interativo":"none"},{"numero":3,"texto_principal":"string","texto_apoio":"string","elemento_interativo":"none"},{"numero":4,"texto_principal":"string","texto_apoio":"string","elemento_interativo":"caixa de perguntas"},{"numero":5,"texto_principal":"string","texto_apoio":"string","elemento_interativo":"link para perfil"}],"cta_final":"string","melhor_horario":"string"}`);

    const feed = parseJSON(feedText);
    const story = parseJSON(storyText);

    document.getElementById("insights-content").innerHTML = `
      <div class="video-section">
        <div class="video-header">
          <span class="badge" style="color:#f97316;background:#f9731611;border:1px solid #f9731633">FEED</span>
          <span style="font-size:14px;color:#ccc;font-weight:600">${feed.titulo}</span>
        </div>
        <div class="info-row"><span class="info-key">Duração</span><span class="info-val">${feed.duracao}</span></div>
        <div class="info-row"><span class="info-key">Tom de Voz</span><span class="info-val">${feed.tom}</span></div>
        <div class="info-row"><span class="info-key">Trilha</span><span class="info-val">${feed.trilha}</span></div>
        <div class="info-row"><span class="info-key">Melhor Horário</span><span class="info-val">${feed.melhor_horario}</span></div>
        <div class="gancho-box">
          <p class="gancho-label">GANCHO — PRIMEIROS 3 SEGUNDOS</p>
          <p class="gancho-text">"${feed.gancho}"</p>
        </div>
        <p style="font-size:9px;letter-spacing:2px;color:#444;font-weight:700;margin:24px 0 12px">ROTEIRO</p>
        ${feed.roteiro?.map((c, i) => `<div class="roteiro-item"><span class="roteiro-num">0${i+1}</span><p class="roteiro-text">${c}</p></div>`).join("")}
        <div class="legenda-box">
          <p class="legenda-label">LEGENDA</p>
          <p class="legenda-text">${feed.legenda}</p>
        </div>
        <div class="hashtags">${feed.hashtags?.map(h => `<span class="hashtag">${h}</span>`).join("")}</div>
      </div>

      <div class="video-section">
        <div class="video-header">
          <span class="badge" style="color:#60a5fa;background:#60a5fa11;border:1px solid #60a5fa33">STORY</span>
          <span style="font-size:14px;color:#ccc;font-weight:600">${story.titulo}</span>
        </div>
        <div class="info-row"><span class="info-key">Melhor Horário</span><span class="info-val">${story.melhor_horario}</span></div>
        <div class="info-row"><span class="info-key">CTA Final</span><span class="info-val">${story.cta_final}</span></div>
        <p style="font-size:9px;letter-spacing:2px;color:#444;font-weight:700;margin:24px 0 8px">SEQUÊNCIA DE TELAS</p>
        ${story.telas?.map(t => `
          <div class="tela-item">
            <div class="tela-num">${t.numero}</div>
            <div>
              <p class="tela-principal">${t.texto_principal}</p>
              <p class="tela-apoio">${t.texto_apoio}</p>
              ${t.elemento_interativo && t.elemento_interativo !== "none" ? `<span class="tag" style="color:#f97316;border-bottom:1px solid #f97316">🎯 ${t.elemento_interativo}</span>` : ""}
            </div>
          </div>`).join("")}
      </div>`;
  } catch (e) {
    document.getElementById("insights-content").innerHTML = `<p class="error-text">Erro ao gerar briefing. Tente novamente.</p>`;
    console.error(e);
  }
}

function refreshAll() {
  fetchMercado();
  fetchNoticias();
  analiseLoaded = false;
  if (document.getElementById("panel-analise").classList.contains("active")) fetchAnalise();
}

fetchMercado();
fetchNoticias();
